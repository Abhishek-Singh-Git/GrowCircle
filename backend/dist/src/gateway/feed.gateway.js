"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var FeedGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const event_emitter_1 = require("@nestjs/event-emitter");
const jwt_1 = require("@nestjs/jwt");
const common_1 = require("@nestjs/common");
const luxon_1 = require("luxon");
const prisma_service_1 = require("../prisma/prisma.service");
let FeedGateway = FeedGateway_1 = class FeedGateway {
    jwtService;
    prisma;
    eventEmitter;
    server;
    logger = new common_1.Logger(FeedGateway_1.name);
    constructor(jwtService, prisma, eventEmitter) {
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.query.token ||
                client.handshake.auth?.token;
            if (!token) {
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token);
            client.userId = payload.sub;
            this.logger.log(`Client connected: ${client.userId}`);
        }
        catch {
            this.logger.warn('Unauthorized WebSocket connection');
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        if (client.userId) {
            this.logger.log(`Client disconnected: ${client.userId}`);
        }
    }
    async handleJoinCircle(client, data) {
        const room = `circle:${data.circleId}`;
        client.join(room);
        this.logger.log(`${client.userId} joined ${room}`);
        this.server.to(room).emit('partner_online', {
            userId: client.userId,
            timestamp: new Date().toISOString(),
        });
        const circle = await this.prisma.circle.findUnique({
            where: { id: data.circleId },
            select: { canvasState: true },
        });
        const currentStrokes = circle?.canvasState || [];
        currentStrokes.forEach((stroke) => {
            client.emit('draw:stroke', {
                circleId: data.circleId,
                stroke,
                userId: 'system',
            });
        });
        return { status: 'joined', room };
    }
    handleLeaveCircle(client, data) {
        const room = `circle:${data.circleId}`;
        client.leave(room);
        this.server.to(room).emit('partner_offline', {
            userId: client.userId,
            timestamp: new Date().toISOString(),
        });
        return { status: 'left', room };
    }
    async handleHeartbeat(client, data) {
        if (!client.userId || !data?.circleId) {
            return { status: 'alive' };
        }
        const user = await this.prisma.user.findUnique({
            where: { id: client.userId },
            select: { timezone: true, preferences: { select: { shareLateNightActivity: true } } },
        });
        if (!user)
            return { status: 'alive' };
        const userTz = user.timezone || 'UTC';
        const nowLocal = luxon_1.DateTime.now().setZone(userTz);
        const hour = nowLocal.hour;
        const minute = nowLocal.minute;
        const isLate = (hour === 23 && minute >= 30) || (hour >= 0 && hour < 4);
        if (isLate) {
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
    handleLogCreated(payload) {
        const room = `circle:${payload.circleId}`;
        this.server.to(room).emit('goal_completed', {
            event: 'log_created',
            userId: payload.userId,
            goalName: payload.goalName,
            goalEmoji: payload.goalEmoji,
            timestamp: new Date().toISOString(),
            log: payload.log,
        });
        this.logger.log(`Broadcast goal_completed to ${room}: ${payload.goalName}`);
    }
    handleReactionAdded(payload) {
        const room = `circle:${payload.circleId}`;
        this.server.to(room).emit('reaction_added', {
            event: 'reaction_added',
            logId: payload.logId,
            reaction: payload.reaction,
            reactorId: payload.reactorId,
            timestamp: new Date().toISOString(),
        });
    }
    handleInterventionCreated(payload) {
        const room = `circle:${payload.circleId}`;
        this.server.to(room).emit('intervention_initiated', {
            event: 'intervention_created',
            type: payload.type,
            intervention: payload.intervention,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Broadcast intervention_initiated (${payload.type}) to ${room}`);
    }
    handleInterventionOverridden(payload) {
        const room = `circle:${payload.circleId}`;
        this.server.to(room).emit('intervention_overridden', {
            event: 'intervention_overridden',
            intervention: payload.intervention,
            timestamp: new Date().toISOString(),
        });
    }
    handleInterventionCancelled(payload) {
        const room = `circle:${payload.circleId}`;
        this.server.to(room).emit('intervention_cancelled', {
            event: 'intervention_cancelled',
            intervention: payload.intervention,
            reason: payload.reason,
            timestamp: new Date().toISOString(),
        });
    }
    handleChatMessageSent(payload) {
        const room = `circle:${payload.circleId}`;
        this.server.to(room).emit('chat_message', {
            event: 'chat_message',
            threadId: payload.threadId,
            message: payload.message,
            timestamp: new Date().toISOString(),
        });
    }
    async handleDrawStroke(client, data) {
        if (!client.userId || !data.circleId)
            return;
        const member = await this.prisma.circleMember.findUnique({
            where: { circleId_userId: { circleId: data.circleId, userId: client.userId } },
        });
        if (!member) {
            throw new websockets_1.WsException('Unauthorized to draw in this circle');
        }
        const room = `circle:${data.circleId}`;
        const circle = await this.prisma.circle.findUnique({
            where: { id: data.circleId },
            select: { canvasState: true },
        });
        const currentStrokes = circle?.canvasState || [];
        currentStrokes.push(data.stroke);
        await this.prisma.circle.update({
            where: { id: data.circleId },
            data: { canvasState: currentStrokes },
        });
        client.to(room).emit('draw:stroke', {
            circleId: data.circleId,
            stroke: data.stroke,
            userId: client.userId,
        });
    }
    async handleDrawClear(client, data) {
        if (!client.userId || !data.circleId)
            return;
        const member = await this.prisma.circleMember.findUnique({
            where: { circleId_userId: { circleId: data.circleId, userId: client.userId } },
        });
        if (!member) {
            throw new websockets_1.WsException('Unauthorized to clear in this circle');
        }
        const room = `circle:${data.circleId}`;
        await this.prisma.circle.update({
            where: { id: data.circleId },
            data: { canvasState: [] },
        });
        client.to(room).emit('draw:clear', {
            circleId: data.circleId,
            userId: client.userId,
        });
    }
};
exports.FeedGateway = FeedGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], FeedGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_circle'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FeedGateway.prototype, "handleJoinCircle", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_circle'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FeedGateway.prototype, "handleLeaveCircle", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('heartbeat'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FeedGateway.prototype, "handleHeartbeat", null);
__decorate([
    (0, event_emitter_1.OnEvent)('log.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeedGateway.prototype, "handleLogCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('reaction.added'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeedGateway.prototype, "handleReactionAdded", null);
__decorate([
    (0, event_emitter_1.OnEvent)('intervention.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeedGateway.prototype, "handleInterventionCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('intervention.overridden'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeedGateway.prototype, "handleInterventionOverridden", null);
__decorate([
    (0, event_emitter_1.OnEvent)('intervention.cancelled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeedGateway.prototype, "handleInterventionCancelled", null);
__decorate([
    (0, event_emitter_1.OnEvent)('chat.message_sent'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeedGateway.prototype, "handleChatMessageSent", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('draw:stroke'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FeedGateway.prototype, "handleDrawStroke", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('draw:clear'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FeedGateway.prototype, "handleDrawClear", null);
exports.FeedGateway = FeedGateway = FeedGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.CORS_ORIGINS?.split(',') || ['https://growcircle-production.up.railway.app'],
            credentials: true,
        },
        namespace: '/feed',
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], FeedGateway);
//# sourceMappingURL=feed.gateway.js.map