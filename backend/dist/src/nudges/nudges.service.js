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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NudgesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const circles_service_1 = require("../circles/circles.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const MAX_NUDGES_LIMIT = 3;
let NudgesService = class NudgesService {
    prisma;
    circlesService;
    eventEmitter;
    constructor(prisma, circlesService, eventEmitter) {
        this.prisma = prisma;
        this.circlesService = circlesService;
        this.eventEmitter = eventEmitter;
    }
    async sendNudge(senderId, dto) {
        if (senderId === dto.recipientId) {
            throw new common_1.BadRequestException('Cannot nudge yourself');
        }
        await this.circlesService.validateMembership(senderId, dto.circleId);
        await this.circlesService.validateMembership(dto.recipientId, dto.circleId);
        if (dto.goalInstanceId) {
            const instance = await this.prisma.goalInstance.findUnique({
                where: { id: dto.goalInstanceId },
            });
            if (!instance || instance.userId !== dto.recipientId) {
                throw new common_1.BadRequestException('Goal instance does not belong to the recipient');
            }
        }
        const rollingStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const count = await this.prisma.nudgeLog.count({
            where: {
                senderId,
                recipientId: dto.recipientId,
                circleId: dto.circleId,
                sentAt: { gte: rollingStart },
            },
        });
        if (count >= MAX_NUDGES_LIMIT) {
            throw new common_1.ForbiddenException(`Daily nudge limit exceeded (${MAX_NUDGES_LIMIT} per rolling 24h to this user)`);
        }
        const recipientPrefs = await this.prisma.userPreference.findUnique({
            where: { userId: dto.recipientId },
        });
        if (recipientPrefs?.nudgeBlockedUsers?.includes(senderId)) {
            throw new common_1.ForbiddenException('User has blocked nudges from you');
        }
        const nudge = await this.prisma.nudgeLog.create({
            data: {
                senderId,
                recipientId: dto.recipientId,
                circleId: dto.circleId,
                goalInstanceId: dto.goalInstanceId,
                message: dto.message,
                result: 'delivered',
            },
            include: {
                sender: { select: { id: true, name: true, avatarUrl: true } },
            },
        });
        if (!recipientPrefs || recipientPrefs.notifyNudge !== false) {
            this.eventEmitter.emit('nudge.sent', { nudge });
        }
        return nudge;
    }
    async getNudges(userId, circleId, sentBy, page = 1, limit = 20) {
        await this.circlesService.validateMembership(userId, circleId);
        const where = { circleId };
        if (sentBy === 'me') {
            where.senderId = userId;
        }
        else {
            where.recipientId = userId;
        }
        const [items, total] = await Promise.all([
            this.prisma.nudgeLog.findMany({
                where,
                include: {
                    sender: { select: { id: true, name: true, avatarUrl: true } },
                    recipient: { select: { id: true, name: true, avatarUrl: true } },
                },
                orderBy: { sentAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.nudgeLog.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
};
exports.NudgesService = NudgesService;
exports.NudgesService = NudgesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        circles_service_1.CirclesService,
        event_emitter_1.EventEmitter2])
], NudgesService);
//# sourceMappingURL=nudges.service.js.map