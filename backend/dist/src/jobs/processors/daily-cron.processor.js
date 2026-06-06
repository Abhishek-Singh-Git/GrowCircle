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
let DailyCronProcessor = DailyCronProcessor_1 = class DailyCronProcessor extends bullmq_1.WorkerHost {
    prisma;
    goalsService;
    logger = new common_1.Logger(DailyCronProcessor_1.name);
    constructor(prisma, goalsService) {
        super();
        this.prisma = prisma;
        this.goalsService = goalsService;
    }
    async process(job) {
        this.logger.log(`Processing job ${job.name} (ID: ${job.id})`);
        if (job.name === 'generate-instances-and-streaks') {
            await this.handleMidnightCron();
        }
    }
    async handleMidnightCron() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        this.logger.log('Starting Midnight Cron...');
        const activeUsers = await this.prisma.user.findMany({
            where: { accountStatus: 'active' },
            select: { id: true, gamificationProfiles: true },
        });
        for (const user of activeUsers) {
            for (const profile of user.gamificationProfiles) {
                const yesterdayInstances = await this.prisma.goalInstance.findMany({
                    where: {
                        userId: user.id,
                        circleId: profile.circleId,
                        date: yesterday,
                    },
                });
                const missedRequired = yesterdayInstances.some((i) => i.status !== 'completed' && i.status !== 'skipped');
                if (missedRequired) {
                    await this.prisma.gamificationProfile.update({
                        where: { userId_circleId: { userId: profile.userId, circleId: profile.circleId } },
                        data: { currentStreak: 0 },
                    });
                }
                else if (yesterdayInstances.length > 0) {
                    await this.prisma.gamificationProfile.update({
                        where: { userId_circleId: { userId: profile.userId, circleId: profile.circleId } },
                        data: {
                            currentStreak: { increment: 1 },
                            longestStreak: {
                                set: Math.max(profile.currentStreak + 1, profile.longestStreak),
                            },
                        },
                    });
                }
                await this.goalsService.generateAllInstancesForDate(user.id, profile.circleId, today);
            }
        }
        this.logger.log('Midnight Cron completed successfully');
    }
};
exports.DailyCronProcessor = DailyCronProcessor;
exports.DailyCronProcessor = DailyCronProcessor = DailyCronProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('daily_cron'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        goals_service_1.GoalsService])
], DailyCronProcessor);
//# sourceMappingURL=daily-cron.processor.js.map