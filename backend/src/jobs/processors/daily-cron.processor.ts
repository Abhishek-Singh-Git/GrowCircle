import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoalsService } from '../../goals/goals.service';

@Processor('daily_cron')
export class DailyCronProcessor extends WorkerHost {
  private readonly logger = new Logger(DailyCronProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly goalsService: GoalsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.name} (ID: ${job.id})`);

    if (job.name === 'generate-instances-and-streaks') {
      await this.handleMidnightCron();
    }
  }

  private async handleMidnightCron() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    this.logger.log('Starting Midnight Cron...');

    // 1. Process yesterday's instances (calculate streaks, handle grace period)
    const activeUsers = await this.prisma.user.findMany({
      where: { accountStatus: 'active' },
      select: { id: true, gamificationProfiles: true },
    });

    for (const user of activeUsers) {
      for (const profile of user.gamificationProfiles) {
        // Fetch yesterday's instances for this user+circle
        const yesterdayInstances = await this.prisma.goalInstance.findMany({
          where: {
            userId: user.id,
            circleId: profile.circleId,
            date: yesterday,
          },
        });

        // Did they miss any required goals?
        const missedRequired = yesterdayInstances.some(
          (i) => i.status !== 'completed' && i.status !== 'skipped',
        );

        if (missedRequired) {
          // Break streak unless grace period applies
          // (In a full implementation, we'd check if they have freeze tokens)
          await this.prisma.gamificationProfile.update({
            where: { userId_circleId: { userId: profile.userId, circleId: profile.circleId } },
            data: { currentStreak: 0 },
          });
        } else if (yesterdayInstances.length > 0) {
          // Extend streak
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

        // 2. Generate today's instances
        await this.goalsService.generateAllInstancesForDate(
          user.id,
          profile.circleId,
          today,
        );
      }
    }

    this.logger.log('Midnight Cron completed successfully');
  }
}
