import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('daily_cron')
export class CleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(CleanupProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'generate-instances-and-streaks') {
      // This job name runs daily via the cron orchestrator. 
      // We attach the cleanup task here to run alongside streak calculation.
      await this.handleDailyCleanup();
    }
  }

  private async handleDailyCleanup() {
    this.logger.log('Starting Daily Cleanup Cron...');
    const now = new Date();

    // 1. Clean up expired Goal Instances (older than 1 day past expiration)
    // To be safe, we keep expired instances for 1 day before deleting.
    const expiredInstancesThreshold = new Date(now);
    expiredInstancesThreshold.setDate(expiredInstancesThreshold.getDate() - 1);

    const deletedInstances = await this.prisma.goalInstance.deleteMany({
      where: {
        expiresAt: { lt: expiredInstancesThreshold },
        status: { notIn: ['completed', 'skipped'] }, // Optional: only delete if pending/failed
      },
    });

    this.logger.log(`Cleaned up ${deletedInstances.count} expired Goal Instances`);

    // 2. Clean up expired Auth Tokens
    const deletedTokens = await this.prisma.authToken.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    this.logger.log(`Cleaned up ${deletedTokens.count} expired Auth Tokens`);

    this.logger.log('Daily Cleanup completed successfully');
  }
}
