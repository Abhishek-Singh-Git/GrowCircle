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
exports.GoalsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const circles_service_1 = require("../circles/circles.service");
const client_1 = require("@prisma/client");
let GoalsService = class GoalsService {
    prisma;
    circlesService;
    constructor(prisma, circlesService) {
        this.prisma = prisma;
        this.circlesService = circlesService;
    }
    async createGoal(userId, dto) {
        await this.circlesService.validateMembership(userId, dto.circleId);
        const goal = await this.prisma.goal.create({
            data: {
                userId,
                circleId: dto.circleId,
                name: dto.name,
                goalType: dto.goalType,
                targetValue: dto.targetValue ?? null,
                targetUnit: dto.targetUnit ?? null,
                scheduleType: dto.scheduleType,
                scheduleDays: dto.scheduleDays ?? [],
                scheduleWeeklyFreq: dto.scheduleWeeklyFreq ?? null,
                scheduleStartDate: dto.scheduleStartDate
                    ? new Date(dto.scheduleStartDate)
                    : null,
                scheduleEndDate: dto.scheduleEndDate
                    ? new Date(dto.scheduleEndDate)
                    : null,
                category: dto.category ?? 'Custom',
                categoryEmoji: dto.categoryEmoji ?? null,
                difficultyWeight: dto.difficultyWeight ?? 1,
                requireProof: dto.requireProof ?? false,
                isSensitive: dto.isSensitive ?? false,
            },
        });
        await this.generateInstanceForDate(goal.id, userId, dto.circleId, new Date());
        return goal;
    }
    async getGoals(userId, circleId, status = 'active') {
        await this.circlesService.validateMembership(userId, circleId);
        return this.prisma.goal.findMany({
            where: {
                userId,
                circleId,
                status,
                deletedAt: null,
            },
            include: {
                milestones: { orderBy: { orderIndex: 'asc' } },
            },
            orderBy: { createdAt: 'asc' },
        });
    }
    async getGoal(userId, goalId) {
        const goal = await this.prisma.goal.findUnique({
            where: { id: goalId },
            include: {
                milestones: true,
                instances: {
                    orderBy: { date: 'desc' },
                    take: 7,
                    include: {
                        activityLogs: true,
                    },
                },
            },
        });
        if (!goal)
            throw new common_1.NotFoundException('Goal not found');
        if (goal.userId !== userId) {
            await this.circlesService.validateMembership(userId, goal.circleId);
            if (goal.isSensitive) {
                throw new common_1.ForbiddenException('This goal is private');
            }
        }
        return goal;
    }
    async updateGoal(userId, goalId, dto) {
        const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
        if (!goal)
            throw new common_1.NotFoundException('Goal not found');
        if (goal.userId !== userId)
            throw new common_1.ForbiddenException('Not your goal');
        return this.prisma.goal.update({
            where: { id: goalId },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
                ...(dto.targetUnit !== undefined && { targetUnit: dto.targetUnit }),
                ...(dto.category !== undefined && { category: dto.category }),
                ...(dto.categoryEmoji !== undefined && { categoryEmoji: dto.categoryEmoji }),
                ...(dto.difficultyWeight !== undefined && {
                    difficultyWeight: dto.difficultyWeight,
                }),
                ...(dto.requireProof !== undefined && { requireProof: dto.requireProof }),
                ...(dto.isSensitive !== undefined && { isSensitive: dto.isSensitive }),
            },
        });
    }
    async deleteGoal(userId, goalId) {
        const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
        if (!goal)
            throw new common_1.NotFoundException('Goal not found');
        if (goal.userId !== userId)
            throw new common_1.ForbiddenException('Not your goal');
        return this.prisma.goal.update({
            where: { id: goalId },
            data: { deletedAt: new Date(), status: 'deleted' },
        });
    }
    async pauseGoal(userId, goalId) {
        const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
        if (!goal || goal.userId !== userId)
            throw new common_1.ForbiddenException('Not your goal');
        return this.prisma.goal.update({
            where: { id: goalId },
            data: { status: 'paused', pausedAt: new Date() },
        });
    }
    async archiveGoal(userId, goalId) {
        const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
        if (!goal || goal.userId !== userId)
            throw new common_1.ForbiddenException('Not your goal');
        return this.prisma.goal.update({
            where: { id: goalId },
            data: { status: 'archived', archivedAt: new Date() },
        });
    }
    async getTodayInstances(userId, circleId) {
        await this.circlesService.validateMembership(userId, circleId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.prisma.goalInstance.findMany({
            where: {
                userId,
                circleId,
                date: today,
            },
            include: {
                goal: true,
                activityLogs: {
                    include: { reactions: true },
                },
            },
            orderBy: { goal: { createdAt: 'asc' } },
        });
    }
    async generateInstanceForDate(goalId, userId, circleId, date) {
        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);
        const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
        if (!goal || goal.status !== 'active')
            return null;
        if (!this.isScheduledForDate(goal, dateOnly))
            return null;
        try {
            return await this.prisma.goalInstance.create({
                data: {
                    goalId,
                    userId,
                    circleId,
                    date: dateOnly,
                    targetValue: goal.targetValue,
                    status: 'pending',
                },
            });
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002') {
                return this.prisma.goalInstance.findFirst({
                    where: { goalId, date: dateOnly },
                });
            }
            throw e;
        }
    }
    async generateAllInstancesForDate(userId, circleId, date) {
        const goals = await this.prisma.goal.findMany({
            where: { userId, circleId, status: 'active', deletedAt: null },
        });
        const instances = [];
        for (const goal of goals) {
            const instance = await this.generateInstanceForDate(goal.id, userId, circleId, date);
            if (instance)
                instances.push(instance);
        }
        return instances;
    }
    isScheduledForDate(goal, date) {
        const dayOfWeek = date.getDay();
        switch (goal.scheduleType) {
            case 'daily':
                return true;
            case 'specific_days':
                return goal.scheduleDays.includes(dayOfWeek);
            case 'weekly_frequency':
                return true;
            default:
                return true;
        }
    }
};
exports.GoalsService = GoalsService;
exports.GoalsService = GoalsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        circles_service_1.CirclesService])
], GoalsService);
//# sourceMappingURL=goals.service.js.map