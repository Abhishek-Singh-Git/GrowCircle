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
var CleanupProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanupProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let CleanupProcessor = CleanupProcessor_1 = class CleanupProcessor extends bullmq_1.WorkerHost {
    prisma;
    logger = new common_1.Logger(CleanupProcessor_1.name);
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async process(job) {
        if (job.name === 'generate-instances-and-streaks') {
            await this.handleDailyCleanup();
        }
    }
    async handleDailyCleanup() {
        this.logger.log('Starting Daily Cleanup Cron...');
        const now = new Date();
        const expiredInstancesThreshold = new Date(now);
        expiredInstancesThreshold.setDate(expiredInstancesThreshold.getDate() - 1);
        const deletedInstances = await this.prisma.goalInstance.deleteMany({
            where: {
                expiresAt: { lt: expiredInstancesThreshold },
                status: { notIn: ['completed', 'skipped'] },
            },
        });
        this.logger.log(`Cleaned up ${deletedInstances.count} expired Goal Instances`);
        const deletedTokens = await this.prisma.authToken.deleteMany({
            where: {
                expiresAt: { lt: now },
            },
        });
        this.logger.log(`Cleaned up ${deletedTokens.count} expired Auth Tokens`);
        this.logger.log('Daily Cleanup completed successfully');
    }
};
exports.CleanupProcessor = CleanupProcessor;
exports.CleanupProcessor = CleanupProcessor = CleanupProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('daily_cron'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CleanupProcessor);
//# sourceMappingURL=cleanup.processor.js.map