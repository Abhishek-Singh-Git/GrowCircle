import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { DateTime } from 'luxon';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['https://growcircle-production.up.railway.app'],
    credentials: true,
  },
  namespace: '/feed',
})
export class FeedGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FeedGateway.name);
  private drawingState = new Map<string, any[]>(); // Ephemeral state for late joiners

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

    // Send ephemeral strokes to the late joiner
    const currentStrokes = this.drawingState.get(data.circleId) || [];
    currentStrokes.forEach((stroke) => {
      client.emit('draw:stroke', {
        circleId: data.circleId,
        stroke,
        userId: 'system', // or whoever drew it if we saved that
      });
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
    @MessageBody() data?: { circleId?: string; clientTimestamp?: string }
  ) {
    if (!client.userId || !data?.circleId) {
      return { status: 'alive' };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: client.userId },
      select: { timezone: true, preferences: { select: { shareLateNightActivity: true } } },
    });

    if (!user) return { status: 'alive' };

    const userTz = user.timezone || 'UTC';
    const nowLocal = DateTime.now().setZone(userTz);
    const hour = nowLocal.hour;
    const minute = nowLocal.minute;

    // Check if it's past 11:30 PM (23:30) or before 4:00 AM
    const isLate = (hour === 23 && minute >= 30) || (hour >= 0 && hour < 4);

    if (isLate) {
      // Broadcast Up Late indicator if user agreed to share
      if (user.preferences?.shareLateNightActivity) {
        const room = `circle:${data.circleId}`;
        this.server.to(room).emit('partner_up_late', {
          userId: client.userId,
          timestamp: new Date().toISOString(),
        });
        this.eventEmitter.emit('late_night.detected', {
          userId: client.userId,
          circleId: data.circleId,
        });
      }
    }

    return { status: 'alive', timestamp: new Date().toISOString() };
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

  // ── SHARED DRAWING EVENTS ───────────────────────────────────────────────

  @SubscribeMessage('draw:stroke')
  async handleDrawStroke(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { circleId: string; stroke: any },
  ) {
    if (!client.userId || !data.circleId) return;

    // Security Fix: Verify circle membership
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: data.circleId, userId: client.userId } },
    });
    if (!member) {
      throw new WsException('Unauthorized to draw in this circle');
    }

    const room = `circle:${data.circleId}`;
    
    // Save to ephemeral state
    const currentStrokes = this.drawingState.get(data.circleId) || [];
    currentStrokes.push(data.stroke);
    this.drawingState.set(data.circleId, currentStrokes);

    client.to(room).emit('draw:stroke', {
      circleId: data.circleId,
      stroke: data.stroke,
      userId: client.userId,
    });
  }

  @SubscribeMessage('draw:clear')
  async handleDrawClear(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { circleId: string },
  ) {
    if (!client.userId || !data.circleId) return;

    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: data.circleId, userId: client.userId } },
    });
    if (!member) {
      throw new WsException('Unauthorized to clear in this circle');
    }

    const room = `circle:${data.circleId}`;
    this.drawingState.set(data.circleId, []); // Clear ephemeral state
    
    client.to(room).emit('draw:clear', {
      circleId: data.circleId,
      userId: client.userId,
    });
  }
}
