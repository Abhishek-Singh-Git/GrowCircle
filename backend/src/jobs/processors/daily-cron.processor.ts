import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoalsService } from '../../goals/goals.service';
import { ChallengesService } from '../../challenges/challenges.service';
import { DateTime } from 'luxon';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InterventionsService } from '../../interventions/interventions.service';

@Processor('daily_cron')
export class DailyCronProcessor extends WorkerHost {
  private readonly logger = new Logger(DailyCronProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly goalsService: GoalsService,
    private readonly challengesService: ChallengesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly interventionsService: InterventionsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.name} (ID: ${job.id})`);

    if (job.name === 'generate-instances-and-streaks') {
      await this.handleHourlyCron();
    } else if (job.name === 'late-night-check') {
      await this.handleLateNightCheck();
    } else if (job.name === 'transition-interventions') {
      await this.handleTransitionInterventions();
    }
  }

  private async handleTransitionInterventions() {
    this.logger.log('Starting background Intervention state transitions...');
    await this.interventionsService.transitionInterventions();
    this.logger.log('Intervention state transitions completed.');
  }

  private async handleLateNightCheck() {
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
      if (!user.preferences?.shareLateNightActivity) continue;

      const userTz = user.timezone || 'UTC';
      const nowLocal = DateTime.now().setZone(userTz);
      const hour = nowLocal.hour;
      const minute = nowLocal.minute;

      const isLate = (hour === 23 && minute >= 30) || (hour >= 0 && hour < 4);
      if (!isLate) continue;

      // Check if they had recent screen time activity in the last 15 minutes
      const fifteenMinsAgo = DateTime.now().minus({ minutes: 15 }).toJSDate();
      
      const recentActivity = await this.prisma.screenTimeSnapshot.findFirst({
        where: {
          userId: user.id,
          syncedAt: { gte: fifteenMinsAgo }
        }
      });

      if (recentActivity) {
        detectedCount++;
        // Broadcast for all active circles
        for (const membership of user.circleMemberships) {
          if (membership.status !== 'active') continue;
          
          this.eventEmitter.emitAsync('late_night.detected', {
            userId: user.id,
            circleId: membership.circleId,
          }).catch(() => { /* non-fatal */ });
        }
      }
    }
    this.logger.log(`Late Night Check complete. Found ${detectedCount} active users.`);
  }

  private async handleHourlyCron() {
    this.logger.log('Starting Hourly Cron...');

    let cursor: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const activeUsers: any[] = await (this.prisma.user as any).findMany({
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
        // Get the user's timezone or default to UTC
        const userTz = user.timezone || 'UTC';
        
        // Calculate 'today' and 'yesterday' in the user's local timezone
        const nowLocal = DateTime.now().setZone(userTz);
        
        // We process only if the local time is between 00:00 and 01:00 to run once per day
        if (nowLocal.hour !== 0) continue;

        const todayString = nowLocal.toFormat('yyyy-MM-dd');
        
        // IDEMPOTENCY CHECK
        if (user.lastCronProcessedDate === todayString) continue; 

        const todayLocal = nowLocal.startOf('day');
        const today = new Date(Date.UTC(todayLocal.year, todayLocal.month - 1, todayLocal.day));
        const yesterdayLocal = nowLocal.minus({ days: 1 }).startOf('day');
        const yesterday = new Date(Date.UTC(yesterdayLocal.year, yesterdayLocal.month - 1, yesterdayLocal.day));

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

              // PRD rules: Max 2 days per month
              const allowedGraceDays = 2; // Fixed to 2 per PRD rules
              const totalAllowed = allowedGraceDays + profile.graceDaysGiftedReceived;

              // Technically, PRD also mentions "Max 2 consecutive days", but here we just check if they have enough quota
              if (usedThisMonth < totalAllowed) {
                // Use grace period
                await this.prisma.gamificationProfile.update({
                  where: { userId_circleId: { userId: user.id, circleId: profile.circleId } },
                  data: {
                    graceDaysUsedThisMonth: usedThisMonth + 1,
                    graceResetMonth: currentMonth,
                    streakFreezeCount: profile.streakFreezeCount + 1,
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
                    streakFreezeCount: 0,
                  },
                });
              }
            } else {
              // Extend streak
              await this.prisma.gamificationProfile.update({
                where: { userId_circleId: { userId: user.id, circleId: profile.circleId } },
                data: {
                  currentStreak: { increment: 1 },
                  streakFreezeCount: 0, // Reset consecutive grace day count
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

        // After success, mark as processed:
        await (this.prisma.user as any).update({
          where: { id: user.id },
          data: { lastCronProcessedDate: todayString }
        });
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
