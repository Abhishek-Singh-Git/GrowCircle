import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/feed',
})
export class FeedGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FeedGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── CONNECTION ────────────────────────────────────────────────────────
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Authenticate via query param token
      const token =
        (client.handshake.query.token as string) ||
        client.handshake.auth?.token;

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      this.logger.log(`Client connected: ${client.userId}`);
    } catch {
      this.logger.warn('Unauthorized WebSocket connection');
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.logger.log(`Client disconnected: ${client.userId}`);
    }
  }

  // ── JOIN CIRCLE CHANNEL ───────────────────────────────────────────────
  @SubscribeMessage('join_circle')
  handleJoinCircle(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { circleId: string },
  ) {
    const room = `circle:${data.circleId}`;
    client.join(room);
    this.logger.log(`${client.userId} joined ${room}`);

    // Broadcast presence
    this.server.to(room).emit('partner_online', {
      userId: client.userId,
      timestamp: new Date().toISOString(),
    });

    return { status: 'joined', room };
  }

  // ── LEAVE CIRCLE CHANNEL ──────────────────────────────────────────────
  @SubscribeMessage('leave_circle')
  handleLeaveCircle(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { circleId: string },
  ) {
    const room = `circle:${data.circleId}`;
    client.leave(room);

    this.server.to(room).emit('partner_offline', {
      userId: client.userId,
      timestamp: new Date().toISOString(),
    });

    return { status: 'left', room };
  }

  // ── HEARTBEAT (Presence System) ───────────────────────────────────────
  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data?: { circleId?: string }
  ) {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Check if it's past 11:30 PM (23:30) or before 4:00 AM
    const isLate = (hour === 23 && minute >= 30) || (hour >= 0 && hour < 4);

    if (isLate && data?.circleId && client.userId) {
      // Broadcast Up Late indicator (ideally we should check UserPreference here)
      const prefs = await this.prisma.userPreference.findUnique({
        where: { userId: client.userId },
        select: { shareLateNightActivity: true },
      });

      if (prefs?.shareLateNightActivity) {
        const room = `circle:${data.circleId}`;
        this.server.to(room).emit('partner_up_late', {
          userId: client.userId,
          timestamp: now.toISOString(),
        });
        this.eventEmitter.emit('late_night.detected', {
          userId: client.userId,
          circleId: data.circleId,
        });
      }
    }

    return { status: 'alive', timestamp: now.toISOString() };
  }

  // ── EVENT LISTENERS (from Logging Service) ────────────────────────────

  @OnEvent('log.created')
  handleLogCreated(payload: {
    log: Record<string, unknown>;
    userId: string;
    circleId: string;
    goalName: string;
    goalEmoji: string | null;
  }) {
    const room = `circle:${payload.circleId}`;
    this.server.to(room).emit('goal_completed', {
      event: 'log_created',
      userId: payload.userId,
      goalName: payload.goalName,
      goalEmoji: payload.goalEmoji,
      timestamp: new Date().toISOString(),
      log: payload.log,
    });
    this.logger.log(
      `Broadcast goal_completed to ${room}: ${payload.goalName}`,
    );
  }

  @OnEvent('reaction.added')
  handleReactionAdded(payload: {
    reaction: Record<string, unknown>;
    logId: string;
    circleId: string;
    reactorId: string;
  }) {
    const room = `circle:${payload.circleId}`;
    this.server.to(room).emit('reaction_added', {
      event: 'reaction_added',
      logId: payload.logId,
      reaction: payload.reaction,
      reactorId: payload.reactorId,
      timestamp: new Date().toISOString(),
    });
  }

  // ── INTERVENTION EVENTS ───────────────────────────────────────────────

  @OnEvent('intervention.created')
  handleInterventionCreated(payload: {
    intervention: Record<string, unknown>;
    circleId: string;
    type: string;
  }) {
    const room = `circle:${payload.circleId}`;
    this.server.to(room).emit('intervention_initiated', {
      event: 'intervention_created',
      type: payload.type,
      intervention: payload.intervention,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(
      `Broadcast intervention_initiated (${payload.type}) to ${room}`,
    );
  }

  @OnEvent('intervention.overridden')
  handleInterventionOverridden(payload: {
    intervention: Record<string, unknown>;
    circleId: string;
  }) {
    const room = `circle:${payload.circleId}`;
    this.server.to(room).emit('intervention_overridden', {
      event: 'intervention_overridden',
      intervention: payload.intervention,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('intervention.cancelled')
  handleInterventionCancelled(payload: {
    intervention: Record<string, unknown>;
    circleId: string;
    reason: string;
  }) {
    const room = `circle:${payload.circleId}`;
    this.server.to(room).emit('intervention_cancelled', {
      event: 'intervention_cancelled',
      intervention: payload.intervention,
      reason: payload.reason,
      timestamp: new Date().toISOString(),
    });
  }

  // ── CHAT EVENTS ───────────────────────────────────────────────────────

  @OnEvent('chat.message_sent')
  handleChatMessageSent(payload: {
    message: Record<string, unknown>;
    circleId: string;
    threadId: string;
  }) {
    const room = `circle:${payload.circleId}`;
    this.server.to(room).emit('chat_message', {
      event: 'chat_message',
      threadId: payload.threadId,
      message: payload.message,
      timestamp: new Date().toISOString(),
    });
  }
}
