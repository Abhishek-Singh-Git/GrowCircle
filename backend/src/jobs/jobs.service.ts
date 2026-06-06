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

    // Add Midnight Cron Job (runs at 00:05 every day)
    await this.dailyCronQueue.add(
      'generate-instances-and-streaks',
      {},
      {
        repeat: {
          pattern: '5 0 * * *', // 12:05 AM every day
        },
        jobId: 'midnight-cron',
      },
    );

    this.logger.log('Midnight cron job registered (00:05 AM)');
  }
}
