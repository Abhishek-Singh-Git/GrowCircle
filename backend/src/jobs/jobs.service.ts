import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  constructor(@InjectQueue('daily_cron') private readonly dailyCronQueue: Queue) {}

  async onModuleInit() {
    this.logger.log('Initializing repeatable background jobs...');

    // Remove existing repeatable jobs to avoid duplicates on restart
    const repeatableJobs = await this.dailyCronQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await this.dailyCronQueue.removeRepeatableByKey(job.key);
    }

    // Add Hourly Cron Job (runs at the top of every hour)
    await this.dailyCronQueue.add(
      'generate-instances-and-streaks',
      {},
      {
        repeat: {
          pattern: '0 * * * *', // Top of every hour
        },
        jobId: 'hourly-cron',
      },
    );

    // Add Late Night Check (runs every 15 minutes)
    await this.dailyCronQueue.add(
      'late-night-check',
      {},
      {
        repeat: {
          pattern: '*/15 * * * *',
        },
        jobId: 'late-night-check',
      },
    );

    this.logger.log('Jobs registered (Hourly cron, Late Night Check)');
  }
}
