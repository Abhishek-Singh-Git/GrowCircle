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
exports.LoggingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const circles_service_1 = require("../circles/circles.service");
const client_1 = require("@prisma/client");
const event_emitter_1 = require("@nestjs/event-emitter");
const XP_BASE_COMPLETION = 10;
const XP_DIFFICULTY_MULTIPLIER = { 1: 1, 2: 1.5, 3: 2 };
const XP_PROOF_BONUS = 5;
const XP_ON_TIME_BONUS = 3;
let LoggingService = class LoggingService {
    prisma;
    circlesService;
    eventEmitter;
    constructor(prisma, circlesService, eventEmitter) {
        this.prisma = prisma;
        this.circlesService = circlesService;
        this.eventEmitter = eventEmitter;
    }
    async createLog(userId, dto) {
        const instance = await this.prisma.goalInstance.findUnique({
            where: { id: dto.goalInstanceId },
            include: { goal: true },
        });
        if (!instance)
            throw new common_1.NotFoundException('Goal instance not found');
        if (instance.userId !== userId)
            throw new common_1.ForbiddenException('Not your goal instance');
        await this.circlesService.validateMembership(userId, instance.circleId);
        const xp = this.calculateXp(dto.status, dto.completionFraction ?? (dto.status === 'completed' ? 1 : 0), instance.goal.difficultyWeight, !!dto.proofUrl);
        try {
            const log = await this.prisma.activityLog.create({
                data: {
                    clientUuid: dto.clientUuid,
                    goalInstanceId: dto.goalInstanceId,
                    goalId: instance.goalId,
                    userId,
                    circleId: instance.circleId,
                    date: instance.date,
                    targetValue: instance.targetValue,
                    actualValue: dto.actualValue ?? null,
                    completionFraction: dto.completionFraction ?? (dto.status === 'completed' ? 1 : 0),
                    status: dto.status,
                    proofUrl: dto.proofUrl ?? null,
                    proofType: dto.proofType ?? null,
                    notes: dto.notes ?? null,
                    xpAwarded: xp,
                },
                include: {
                    goal: true,
                    reactions: true,
                },
            });
            await this.prisma.goalInstance.update({
                where: { id: dto.goalInstanceId },
                data: { status: dto.status === 'completed' ? 'completed' : 'partial' },
            });
            await this.updateXp(userId, instance.circleId, xp);
            this.eventEmitter.emit('log.created', {
                log,
                userId,
                circleId: instance.circleId,
                goalName: instance.goal.name,
                goalEmoji: instance.goal.categoryEmoji,
            });
            return { ...log, xpAwarded: xp };
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002') {
                const existing = await this.prisma.activityLog.findUnique({
                    where: { clientUuid: dto.clientUuid },
                    include: { goal: true, reactions: true },
                });
                return existing;
            }
            throw e;
        }
    }
    async getLog(userId, logId) {
        const log = await this.prisma.activityLog.findUnique({
            where: { id: logId },
            include: {
                goal: true,
                reactions: { include: { user: { select: { id: true, name: true } } } },
                mediaObjects: true,
            },
        });
        if (!log)
            throw new common_1.NotFoundException('Log not found');
        if (log.userId !== userId) {
            await this.circlesService.validateMembership(userId, log.circleId);
        }
        return log;
    }
    async addReaction(userId, logId, emoji) {
        const log = await this.prisma.activityLog.findUnique({
            where: { id: logId },
        });
        if (!log)
            throw new common_1.NotFoundException('Log not found');
        await this.circlesService.validateMembership(userId, log.circleId);
        try {
            const reaction = await this.prisma.logReaction.create({
                data: { logId, userId, emoji },
            });
            this.eventEmitter.emit('reaction.added', {
                reaction,
                logId,
                circleId: log.circleId,
                reactorId: userId,
            });
            return reaction;
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002') {
                throw new common_1.ConflictException('You already reacted with this emoji');
            }
            throw e;
        }
    }
    async removeReaction(userId, reactionId) {
        const reaction = await this.prisma.logReaction.findUnique({
            where: { id: reactionId },
        });
        if (!reaction)
            throw new common_1.NotFoundException('Reaction not found');
        if (reaction.userId !== userId)
            throw new common_1.ForbiddenException('Not your reaction');
        await this.prisma.logReaction.delete({ where: { id: reactionId } });
        return { success: true };
    }
    async getCircleFeed(userId, circleId, date) {
        await this.circlesService.validateMembership(userId, circleId);
        const feedDate = date ? new Date(date) : new Date();
        feedDate.setHours(0, 0, 0, 0);
        const members = await this.prisma.circleMember.findMany({
            where: { circleId, status: 'active' },
            include: {
                user: {
                    select: { id: true, name: true, avatarUrl: true, lastActiveAt: true },
                },
            },
        });
        const instances = await this.prisma.goalInstance.findMany({
            where: { circleId, date: feedDate },
            include: {
                goal: {
                    select: {
                        id: true,
                        name: true,
                        goalType: true,
                        targetValue: true,
                        targetUnit: true,
                        category: true,
                        categoryEmoji: true,
                        isSensitive: true,
                    },
                },
                activityLogs: {
                    include: {
                        reactions: {
                            include: {
                                user: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
            },
        });
        return members.map((member) => {
            const memberInstances = instances
                .filter((i) => i.userId === member.userId)
                .map((i) => {
                if (i.goal.isSensitive && i.userId !== userId) {
                    return {
                        ...i,
                        goal: { ...i.goal, name: 'Private Goal', categoryEmoji: '🔒' },
                    };
                }
                return i;
            });
            const completed = memberInstances.filter((i) => i.status === 'completed').length;
            return {
                user: member.user,
                role: member.role,
                todaySummary: {
                    totalGoals: memberInstances.length,
                    completed,
                    completionRate: memberInstances.length > 0
                        ? Math.round((completed / memberInstances.length) * 100)
                        : 0,
                },
                goalInstances: memberInstances,
            };
        });
    }
    calculateXp(status, completionFraction, difficultyWeight, hasProof) {
        if (status === 'skipped')
            return 0;
        let xp = Math.round(XP_BASE_COMPLETION *
            completionFraction *
            (XP_DIFFICULTY_MULTIPLIER[difficultyWeight] ?? 1));
        if (hasProof)
            xp += XP_PROOF_BONUS;
        const hour = new Date().getHours();
        if (hour < 23)
            xp += XP_ON_TIME_BONUS;
        return xp;
    }
    async updateXp(userId, circleId, xp) {
        await this.prisma.gamificationProfile.update({
            where: { userId_circleId: { userId, circleId } },
            data: {
                totalXp: { increment: xp },
            },
        });
    }
};
exports.LoggingService = LoggingService;
exports.LoggingService = LoggingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        circles_service_1.CirclesService,
        event_emitter_1.EventEmitter2])
], LoggingService);
//# sourceMappingURL=logging.service.js.map