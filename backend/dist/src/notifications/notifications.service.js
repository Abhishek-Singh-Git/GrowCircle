"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const admin = __importStar(require("firebase-admin"));
let NotificationsService = NotificationsService_1 = class NotificationsService {
    prisma;
    logger = new common_1.Logger(NotificationsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async sendNotification(dto) {
        const prefs = await this.prisma.userPreference.findUnique({
            where: { userId: dto.userId },
        });
        if (prefs) {
            if (dto.type === 'nudge' && !prefs.notifyNudge)
                return null;
            if (dto.type === 'focus_alert' && !prefs.notifyFocusAlert)
                return null;
            if (dto.type === 'timeout' && !prefs.notifyTimeout)
                return null;
            if (dto.type === 'challenge' && !prefs.notifyChallenge)
                return null;
            if (dto.type === 'chat' && !prefs.notifyChat)
                return null;
            if (dto.type === 'badge' && !prefs.notifyBadge)
                return null;
            if (dto.type === 'streak' && !prefs.notifyStreak)
                return null;
            if (dto.type === 'partner_log' && !prefs.notifyPartnerLog)
                return null;
        }
        const notification = await this.prisma.notification.create({
            data: {
                userId: dto.userId,
                type: dto.type,
                title: dto.title,
                body: dto.body,
                metadata: dto.metadata,
            },
        });
        this.dispatchPushNotification(notification);
        return notification;
    }
    async dispatchPushNotification(notification) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: notification.userId },
                select: { fcmToken: true },
            });
            if (!user || !user.fcmToken) {
                this.logger.debug(`User ${notification.userId} has no FCM token. Skipping push.`);
                return;
            }
            if (admin.apps.length === 0) {
                this.logger.warn('Firebase Admin SDK is not initialized. Skipping push.');
                return;
            }
            const payload = {
                token: user.fcmToken,
                notification: {
                    title: notification.title,
                    body: notification.body,
                },
                data: {
                    type: notification.type,
                    ...notification.metadata,
                },
            };
            await admin.messaging().send(payload);
            this.logger.log(`Push notification sent to User ${notification.userId}`);
        }
        catch (error) {
            this.logger.error(`Failed to send push notification: ${error.message}`, error.stack);
        }
    }
    async markAsRead(userId, notificationId) {
        return this.prisma.notification.updateMany({
            where: { id: notificationId, userId },
            data: { isRead: true, readAt: new Date() },
        });
    }
    async getNotifications(userId, page = 1, limit = 50) {
        const [items, total] = await Promise.all([
            this.prisma.notification.findMany({
                where: { userId },
                orderBy: { sentAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.notification.count({ where: { userId } }),
        ]);
        return {
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async handleNudgeSent(payload) {
        await this.sendNotification({
            userId: payload.nudge.recipientId,
            type: 'nudge',
            title: 'New Nudge',
            body: payload.nudge.message || 'Someone nudged you!',
            metadata: { nudgeId: payload.nudge.id, circleId: payload.nudge.circleId },
        });
    }
    async handleChallengeCreated(payload) {
        for (const participant of payload.challenge.participants) {
            if (participant.user.id !== payload.challenge.proposerId) {
                await this.sendNotification({
                    userId: participant.user.id,
                    type: 'challenge',
                    title: 'New Challenge Request',
                    body: `${payload.challenge.proposer.name} challenged you: ${payload.challenge.title}`,
                    metadata: { challengeId: payload.challenge.id, circleId: payload.challenge.circleId },
                });
            }
        }
    }
    async handleChallengeResolved(payload) {
        for (const participant of payload.challenge.participants) {
            await this.sendNotification({
                userId: participant.userId || participant.user?.id,
                type: 'challenge',
                title: 'Challenge Resolved',
                body: `The challenge "${payload.challenge.title}" has been resolved.`,
                metadata: { challengeId: payload.challenge.id, circleId: payload.challenge.circleId },
            });
        }
    }
    async handleChallengeActivated(payload) {
        for (const participant of payload.participants) {
            await this.sendNotification({
                userId: participant.userId,
                type: 'challenge',
                title: 'Challenge Activated',
                body: `Your challenge is now active! All participants have accepted.`,
                metadata: { challengeId: payload.challengeId },
            });
        }
    }
    async handleChallengeAccepted(payload) {
        const otherParticipants = payload.challenge.participants.filter((p) => p.userId !== payload.acceptorId);
        for (const participant of otherParticipants) {
            const acceptor = await this.prisma.user.findUnique({
                where: { id: payload.acceptorId },
                select: { name: true },
            });
            await this.sendNotification({
                userId: participant.userId,
                type: 'challenge',
                title: 'Challenge Accepted',
                body: `${acceptor?.name} accepted the challenge!`,
                metadata: { challengeId: payload.challenge.id },
            });
        }
    }
    async handleLogCreated(payload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { name: true },
        });
        if (!user)
            return;
        const otherMembers = await this.prisma.circleMember.findMany({
            where: {
                circleId: payload.circleId,
                status: 'active',
                userId: { not: payload.userId },
            },
            select: { userId: true },
        });
        const emoji = payload.goalEmoji || '✅';
        for (const member of otherMembers) {
            await this.sendNotification({
                userId: member.userId,
                type: 'partner_log',
                title: `${user.name} completed a goal!`,
                body: `${emoji} Completed: ${payload.goalName}`,
                metadata: {
                    logId: payload.log.id,
                    circleId: payload.circleId,
                    userId: payload.userId,
                },
            });
        }
    }
    async handleChatMessageSent(payload) {
        const thread = await this.prisma.chatThread.findUnique({
            where: { id: payload.threadId },
            include: { participants: { select: { userId: true } } },
        });
        if (!thread)
            return;
        const sender = await this.prisma.user.findUnique({
            where: { id: payload.message.senderId },
            select: { name: true },
        });
        const otherParticipants = thread.participants.filter((p) => p.userId !== payload.message.senderId);
        for (const participant of otherParticipants) {
            await this.sendNotification({
                userId: participant.userId,
                type: 'chat',
                title: `${sender?.name} sent a message`,
                body: payload.message.content || '[Media message]',
                metadata: { threadId: payload.threadId, messageId: payload.message.id },
            });
        }
    }
    async handleInterventionCreated(payload) {
        const initiator = await this.prisma.user.findUnique({
            where: { id: payload.intervention.initiatorId },
            select: { name: true },
        });
        await this.sendNotification({
            userId: payload.intervention.targetId,
            type: payload.type === 'timeout' ? 'timeout' : 'focus_alert',
            title: payload.type === 'timeout' ? '⏱️ App Timeout' : '🎯 Focus Alert',
            body: payload.type === 'timeout'
                ? `${initiator?.name} has locked an app for you.`
                : `${initiator?.name} sent you a focus alert.`,
            metadata: { interventionId: payload.intervention.id, circleId: payload.circleId },
        });
    }
    async handleLateNightDetected(payload) {
        const target = await this.prisma.user.findUnique({ where: { id: payload.userId } });
        const otherMembers = await this.prisma.circleMember.findMany({
            where: { circleId: payload.circleId, status: 'active', userId: { not: payload.userId } },
        });
        for (const member of otherMembers) {
            await this.sendNotification({
                userId: member.userId,
                type: 'partner_log',
                title: 'Late Night Alert 🦉',
                body: `${target?.name || 'Partner'} is still up late! Nudge them to sleep.`,
                metadata: { circleId: payload.circleId, targetId: payload.userId },
            });
        }
    }
};
exports.NotificationsService = NotificationsService;
__decorate([
    (0, event_emitter_1.OnEvent)('nudge.sent'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "handleNudgeSent", null);
__decorate([
    (0, event_emitter_1.OnEvent)('challenge.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "handleChallengeCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('challenge.resolved'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "handleChallengeResolved", null);
__decorate([
    (0, event_emitter_1.OnEvent)('challenge.activated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "handleChallengeActivated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('challenge.accepted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "handleChallengeAccepted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('log.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "handleLogCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('chat.message_sent'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "handleChatMessageSent", null);
__decorate([
    (0, event_emitter_1.OnEvent)('intervention.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "handleInterventionCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('late_night.detected'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "handleLateNightDetected", null);
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map