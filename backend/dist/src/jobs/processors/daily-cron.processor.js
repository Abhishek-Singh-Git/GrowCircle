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
var DailyCronProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyCronProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const goals_service_1 = require("../../goals/goals.service");
const challenges_service_1 = require("../../challenges/challenges.service");
const luxon_1 = require("luxon");
const event_emitter_1 = require("@nestjs/event-emitter");
const interventions_service_1 = require("../../interventions/interventions.service");
let DailyCronProcessor = DailyCronProcessor_1 = class DailyCronProcessor extends bullmq_1.WorkerHost {
    prisma;
    goalsService;
    challengesService;
    eventEmitter;
    interventionsService;
    logger = new common_1.Logger(DailyCronProcessor_1.name);
    constructor(prisma, goalsService, challengesService, eventEmitter, interventionsService) {
        super();
        this.prisma = prisma;
        this.goalsService = goalsService;
        this.challengesService = challengesService;
        this.eventEmitter = eventEmitter;
        this.interventionsService = interventionsService;
    }
    async process(job) {
        this.logger.log(`Processing job ${job.name} (ID: ${job.id})`);
        if (job.name === 'generate-instances-and-streaks') {
            await this.handleHourlyCron();
        }
        else if (job.name === 'late-night-check') {
            await this.handleLateNightCheck();
        }
        else if (job.name === 'transition-interventions') {
            await this.handleTransitionInterventions();
        }
    }
    async handleTransitionInterventions() {
        this.logger.log('Starting background Intervention state transitions...');
        await this.interventionsService.transitionInterventions();
        this.logger.log('Intervention state transitions completed.');
    }
    async handleLateNightCheck() {
        this.logger.log('Starting Late Night Check...');
        const activeUsers = await this.prisma.user.findMany({
            where: { accountStatus: 'active' },
            select: {
                id: true,
                timezone: true,
                preferences: { select: { shareLateNightActivity: true } },
                circleMemberships: { select: { circleId: true, status: true } }
            },
        });
        let detectedCount = 0;
        for (const user of activeUsers) {
            if (!user.preferences?.shareLateNightActivity)
                continue;
            const userTz = user.timezone || 'UTC';
            const nowLocal = luxon_1.DateTime.now().setZone(userTz);
            const hour = nowLocal.hour;
            const minute = nowLocal.minute;
            const isLate = (hour === 23 && minute >= 30) || (hour >= 0 && hour < 4);
            if (!isLate)
                continue;
            const fifteenMinsAgo = luxon_1.DateTime.now().minus({ minutes: 15 }).toJSDate();
            const recentActivity = await this.prisma.screenTimeSnapshot.findFirst({
                where: {
                    userId: user.id,
                    syncedAt: { gte: fifteenMinsAgo }
                }
            });
            if (recentActivity) {
                detectedCount++;
                for (const membership of user.circleMemberships) {
                    if (membership.status !== 'active')
                        continue;
                    this.eventEmitter.emit('late_night.detected', {
                        userId: user.id,
                        circleId: membership.circleId,
                    });
                }
            }
        }
        this.logger.log(`Late Night Check complete. Found ${detectedCount} active users.`);
    }
    async handleHourlyCron() {
        this.logger.log('Starting Hourly Cron...');
        let cursor = undefined;
        let hasMore = true;
        while (hasMore) {
            const activeUsers = await this.prisma.user.findMany({
                take: 100,
                skip: cursor ? 1 : 0,
                cursor: cursor ? { id: cursor } : undefined,
                where: { accountStatus: 'active' },
                select: { id: true, timezone: true, plan: true, gamificationProfiles: true, lastCronProcessedDate: true },
            });
            if (activeUsers.length === 0) {
                hasMore = false;
                break;
            }
            cursor = activeUsers[activeUsers.length - 1].id;
            for (const user of activeUsers) {
                const userTz = user.timezone || 'UTC';
                const nowLocal = luxon_1.DateTime.now().setZone(userTz);
                if (nowLocal.hour !== 0)
                    continue;
                const todayString = nowLocal.toFormat('yyyy-MM-dd');
                if (user.lastCronProcessedDate === todayString)
                    continue;
                const todayLocal = nowLocal.startOf('day');
                const today = new Date(Date.UTC(todayLocal.year, todayLocal.month - 1, todayLocal.day));
                const yesterdayLocal = nowLocal.minus({ days: 1 }).startOf('day');
                const yesterday = new Date(Date.UTC(yesterdayLocal.year, yesterdayLocal.month - 1, yesterdayLocal.day));
                for (const profile of user.gamificationProfiles) {
                    const existingScore = await this.prisma.dailyScore.findUnique({
                        where: {
                            userId_circleId_date: {
                                userId: user.id,
                                circleId: profile.circleId,
                                date: yesterday,
                            },
                        },
                    });
                    if (existingScore)
                        continue;
                    const yesterdayInstances = await this.prisma.goalInstance.findMany({
                        where: {
                            userId: user.id,
                            circleId: profile.circleId,
                            date: yesterday,
                        },
                    });
                    const totalCount = yesterdayInstances.length;
                    const completedCount = yesterdayInstances.filter((i) => i.status === 'completed' || i.status === 'skipped').length;
                    const completionFraction = totalCount > 0 ? completedCount / totalCount : 0;
                    await this.prisma.dailyScore.upsert({
                        where: {
                            userId_circleId_date: {
                                userId: user.id,
                                circleId: profile.circleId,
                                date: yesterday,
                            },
                        },
                        update: {
                            dailyPerformanceScore: completionFraction * 100,
                            consistencyScore: completionFraction * 100,
                            goalsActive: totalCount,
                            goalsCompleted: completedCount,
                        },
                        create: {
                            userId: user.id,
                            circleId: profile.circleId,
                            date: yesterday,
                            dailyPerformanceScore: completionFraction * 100,
                            consistencyScore: completionFraction * 100,
                            goalsActive: totalCount,
                            goalsCompleted: completedCount,
                            xpEarnedToday: 0,
                        },
                    });
                    if (totalCount > 0) {
                        if (completionFraction < 0.8) {
                            const currentMonth = nowLocal.month;
                            let usedThisMonth = profile.graceDaysUsedThisMonth;
                            if (profile.graceResetMonth !== currentMonth) {
                                usedThisMonth = 0;
                            }
                            const allowedGraceDays = 2;
                            const totalAllowed = allowedGraceDays + profile.graceDaysGiftedReceived;
                            if (usedThisMonth < totalAllowed) {
                                await this.prisma.gamificationProfile.update({
                                    where: { userId_circleId: { userId: user.id, circleId: profile.circleId } },
                                    data: {
                                        graceDaysUsedThisMonth: usedThisMonth + 1,
                                        graceResetMonth: currentMonth,
                                        streakFreezeCount: profile.streakFreezeCount + 1,
                                    },
                                });
                                this.logger.log(`Grace period used for user ${user.id}`);
                            }
                            else {
                                await this.prisma.gamificationProfile.update({
                                    where: { userId_circleId: { userId: user.id, circleId: profile.circleId } },
                                    data: {
                                        currentStreak: 0,
                                        graceDaysUsedThisMonth: usedThisMonth,
                                        graceResetMonth: currentMonth,
                                        streakFreezeCount: 0,
                                    },
                                });
                            }
                        }
                        else {
                            await this.prisma.gamificationProfile.update({
                                where: { userId_circleId: { userId: user.id, circleId: profile.circleId } },
                                data: {
                                    currentStreak: { increment: 1 },
                                    streakFreezeCount: 0,
                                    longestStreak: {
                                        set: Math.max(profile.currentStreak + 1, profile.longestStreak),
                                    },
                                },
                            });
                        }
                    }
                    await this.goalsService.generateAllInstancesForDate(user.id, profile.circleId, today);
                }
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { lastCronProcessedDate: todayString }
                });
            }
        }
        const oneDayAgo = luxon_1.DateTime.now().minus({ days: 1 }).toJSDate();
        const deleteCount = await this.prisma.goalInstance.deleteMany({
            where: {
                expiresAt: { lt: oneDayAgo }
            }
        });
        this.logger.log(`Cleanup: Deleted ${deleteCount.count} expired task instances.`);
        await this.challengesService.expireOverdueChallenges();
        this.logger.log('Hourly Cron completed successfully');
    }
};
exports.DailyCronProcessor = DailyCronProcessor;
exports.DailyCronProcessor = DailyCronProcessor = DailyCronProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('daily_cron'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        goals_service_1.GoalsService,
        challenges_service_1.ChallengesService,
        event_emitter_1.EventEmitter2,
        interventions_service_1.InterventionsService])
], DailyCronProcessor);
//# sourceMappingURL=daily-cron.processor.js.map