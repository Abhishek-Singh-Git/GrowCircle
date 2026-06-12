import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoalsService } from '../../goals/goals.service';
import { ChallengesService } from '../../challenges/challenges.service';
import { DateTime } from 'luxon';

@Processor('daily_cron')
export class DailyCronProcessor extends WorkerHost {
  private readonly logger = new Logger(DailyCronProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly goalsService: GoalsService,
    private readonly challengesService: ChallengesService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.name} (ID: ${job.id})`);

    if (job.name === 'generate-instances-and-streaks') {
      await this.handleHourlyCron();
    }
  }

  private async handleHourlyCron() {
    this.logger.log('Starting Hourly Cron...');

    let skip = 0;
    const take = 100;
    let hasMore = true;

    while (hasMore) {
      const activeUsers = await this.prisma.user.findMany({
        where: { accountStatus: 'active' },
        select: { id: true, timezone: true, plan: true, gamificationProfiles: true },
        skip,
        take,
      });

      if (activeUsers.length < take) hasMore = false;
      skip += take;

      for (const user of activeUsers) {
      // Get the user's timezone or default to UTC
      const userTz = user.timezone || 'UTC';
      
      // Calculate 'today' and 'yesterday' in the user's local timezone
      const nowLocal = DateTime.now().setZone(userTz);
      
      // We process only if the local time is between 00:00 and 01:00 to run once per day
      if (nowLocal.hour !== 0) continue;

      const today = nowLocal.startOf('day').toJSDate();
      const yesterday = nowLocal.minus({ days: 1 }).startOf('day').toJSDate();

      for (const profile of user.gamificationProfiles) {
        // Idempotency check: Skip if already processed for yesterday
        const existingScore = await this.prisma.dailyScore.findUnique({
          where: {
            userId_circleId_date: {
              userId: user.id,
              circleId: profile.circleId,
              date: yesterday,
            },
          },
        });

        if (existingScore) continue;

        // Fetch yesterday's instances for this user+circle
        const yesterdayInstances = await this.prisma.goalInstance.findMany({
          where: {
            userId: user.id,
            circleId: profile.circleId,
            date: yesterday,
          },
        });

        // Did they meet the 80% completion rule?
        const totalCount = yesterdayInstances.length;
        const completedCount = yesterdayInstances.filter(
          (i) => i.status === 'completed' || i.status === 'skipped',
        ).length;

        const completionFraction = totalCount > 0 ? completedCount / totalCount : 0;
        
        // Basic Scoring Baseline
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
            // Grace Period Logic
            const currentMonth = nowLocal.month; // Luxon month is 1-12
            let usedThisMonth = profile.graceDaysUsedThisMonth;
            
            if (profile.graceResetMonth !== currentMonth) {
              usedThisMonth = 0;
            }

            const allowedGraceDays = user.plan === 'free' ? 1 : 3;
            const totalAllowed = allowedGraceDays + profile.graceDaysGiftedReceived;

            if (usedThisMonth < totalAllowed) {
              // Use grace period
              await this.prisma.gamificationProfile.update({
                where: { userId_circleId: { userId: user.id, circleId: profile.circleId } },
                data: {
                  graceDaysUsedThisMonth: usedThisMonth + 1,
                  graceResetMonth: currentMonth,
                },
              });
              this.logger.log(`Grace period used for user ${user.id}`);
            } else {
              // Break streak
              await this.prisma.gamificationProfile.update({
                where: { userId_circleId: { userId: user.id, circleId: profile.circleId } },
                data: { 
                  currentStreak: 0,
                  graceDaysUsedThisMonth: usedThisMonth,
                  graceResetMonth: currentMonth,
                },
              });
            }
          } else {
            // Extend streak
            await this.prisma.gamificationProfile.update({
              where: { userId_circleId: { userId: user.id, circleId: profile.circleId } },
              data: {
                currentStreak: { increment: 1 },
                longestStreak: {
                  set: Math.max(profile.currentStreak + 1, profile.longestStreak),
                },
              },
            });
          }
        }

        // 2. Generate today's instances
        await this.goalsService.generateAllInstancesForDate(
          user.id,
          profile.circleId,
          today,
        );
      }
    }
    }

    // 3. Cleanup: Hard-delete tasks that expired more than 24 hours ago
    const oneDayAgo = DateTime.now().minus({ days: 1 }).toJSDate();
    const deleteCount = await this.prisma.goalInstance.deleteMany({
      where: {
        expiresAt: { lt: oneDayAgo }
      }
    });
    this.logger.log(`Cleanup: Deleted ${deleteCount.count} expired task instances.`);

    // 4. Expire overdue challenges
    await this.challengesService.expireOverdueChallenges();

    this.logger.log('Hourly Cron completed successfully');
  }
}
