import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
interface AuthenticatedSocket extends Socket {
    userId?: string;
}
import { PrismaService } from '../prisma/prisma.service';
export declare class FeedGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    private readonly prisma;
    private readonly eventEmitter;
    server: Server;
    private readonly logger;
    private drawingState;
    constructor(jwtService: JwtService, prisma: PrismaService, eventEmitter: EventEmitter2);
    handleConnection(client: AuthenticatedSocket): Promise<void>;
    handleDisconnect(client: AuthenticatedSocket): void;
    handleJoinCircle(client: AuthenticatedSocket, data: {
        circleId: string;
    }): {
        status: string;
        room: string;
    };
    handleLeaveCircle(client: AuthenticatedSocket, data: {
        circleId: string;
    }): {
        status: string;
        room: string;
    };
    handleHeartbeat(client: AuthenticatedSocket, data?: {
        circleId?: string;
        clientTimestamp?: string;
    }): Promise<{
        status: string;
        timestamp?: undefined;
    } | {
        status: string;
        timestamp: string;
    }>;
    handleLogCreated(payload: {
        log: Record<string, unknown>;
        userId: string;
        circleId: string;
        goalName: string;
        goalEmoji: string | null;
    }): void;
    handleReactionAdded(payload: {
        reaction: Record<string, unknown>;
        logId: string;
        circleId: string;
        reactorId: string;
    }): void;
    handleInterventionCreated(payload: {
        intervention: Record<string, unknown>;
        circleId: string;
        type: string;
    }): void;
    handleInterventionOverridden(payload: {
        intervention: Record<string, unknown>;
        circleId: string;
    }): void;
    handleInterventionCancelled(payload: {
        intervention: Record<string, unknown>;
        circleId: string;
        reason: string;
    }): void;
    handleChatMessageSent(payload: {
        message: Record<string, unknown>;
        circleId: string;
        threadId: string;
    }): void;
    handleDrawStroke(client: AuthenticatedSocket, data: {
        circleId: string;
        stroke: any;
    }): Promise<void>;
    handleDrawClear(client: AuthenticatedSocket, data: {
        circleId: string;
    }): Promise<void>;
}
export {};
