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
var JobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let JobsService = JobsService_1 = class JobsService {
    dailyCronQueue;
    logger = new common_1.Logger(JobsService_1.name);
    constructor(dailyCronQueue) {
        this.dailyCronQueue = dailyCronQueue;
    }
    async onModuleInit() {
        this.logger.log('Initializing repeatable background jobs...');
        const repeatableJobs = await this.dailyCronQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await this.dailyCronQueue.removeRepeatableByKey(job.key);
        }
        await this.dailyCronQueue.add('generate-instances-and-streaks', {}, {
            repeat: {
                pattern: '0 * * * *',
            },
            jobId: 'hourly-cron',
        });
        this.logger.log('Midnight cron job registered (00:05 AM)');
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = JobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('daily_cron')),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], JobsService);
//# sourceMappingURL=jobs.service.js.map