import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import {
  SyncScreenTimeDto,
  SetThresholdDto,
} from './dto/screen-time.dto';
import { DateTime } from 'luxon';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ScreenTimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circlesService: CirclesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── SYNC SCREEN TIME DATA (from device) ───────────────────────────────
  async syncScreenTime(userId: string, dto: SyncScreenTimeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true, preferences: { select: { shareLateNightActivity: true } } },
    });
    const userTz = user?.timezone || 'UTC';
    
    // Convert the provided date string to the start of that day in the user's timezone, then store as absolute UTC
    const localStart = DateTime.fromISO(dto.date).setZone(userTz).startOf('day');
    const date = new Date(Date.UTC(localStart.year, localStart.month - 1, localStart.day));

    // Check for late night activity using actual current local time
    const nowLocal = DateTime.now().setZone(userTz);
    const hour = nowLocal.hour;
    const minute = nowLocal.minute;
    const isLate = (hour === 23 && minute >= 30) || (hour >= 0 && hour < 4);

    if (isLate && user?.preferences?.shareLateNightActivity) {
      // Find all active circles for this user
      const circles = await this.prisma.circleMember.findMany({
        where: { userId, status: 'active' },
        select: { circleId: true },
      });
      for (const c of circles) {
        this.eventEmitter.emit('late_night.detected', {
          userId,
          circleId: c.circleId,
        });
      }
    }

    let syncedCount = 0;

    for (const snapshot of dto.snapshots) {
      await this.prisma.screenTimeSnapshot.upsert({
        where: {
          userId_date_appPackage: {
            userId,
            date,
            appPackage: snapshot.appPackage,
          },
        },
        update: {
          durationSeconds: snapshot.durationSeconds,
          openCount: snapshot.openCount ?? null,
          appDisplayName: snapshot.appDisplayName ?? null,
          syncedAt: new Date(),
        },
        create: {
          userId,
          date,
          appPackage: snapshot.appPackage,
          appDisplayName: snapshot.appDisplayName ?? null,
          durationSeconds: snapshot.durationSeconds,
          openCount: snapshot.openCount ?? null,
          platform: dto.platform,
        },
      });
      syncedCount++;
    }

    // Check thresholds after sync and emit events
    await this.checkThresholds(userId, date);

    return { syncedCount };
  }

  // ── GET SCREEN TIME FOR A USER ────────────────────────────────────────
  async getScreenTime(requesterId: string, targetUserId: string, date: string) {
    // If viewing someone else's data, validate circle membership + consent
    if (requesterId !== targetUserId) {
      // Find shared circles
      const requesterCircles = await this.prisma.circleMember.findMany({
        where: { userId: requesterId, status: 'active' },
        select: { circleId: true },
      });
      const targetCircles = await this.prisma.circleMember.findMany({
        where: { userId: targetUserId, status: 'active' },
        select: { circleId: true },
      });

      const requesterCircleIds = requesterCircles.map((c) => c.circleId);
      const sharedCircle = targetCircles.find((c) =>
        requesterCircleIds.includes(c.circleId),
      );

      if (!sharedCircle) {
        throw new ForbiddenException('You are not in a shared circle with this user');
      }

      // Check if target has granted screen_time consent
      const consent = await this.prisma.consentRecord.findFirst({
        where: {
          userId: targetUserId,
          circleId: sharedCircle.circleId,
          feature: 'screen_time',
          revokedAt: null,
        },
      });

      if (!consent) {
        throw new ForbiddenException('User has not shared screen time data');
      }
    }

    const user = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { timezone: true } });
    const userTz = user?.timezone || 'UTC';

    const localStartObj = DateTime.fromISO(date).setZone(userTz).startOf('day');
    const dateObj = new Date(Date.UTC(localStartObj.year, localStartObj.month - 1, localStartObj.day));

    const snapshots = await this.prisma.screenTimeSnapshot.findMany({
      where: {
        userId: targetUserId,
        date: dateObj,
        isHidden: false,
      },
      orderBy: { durationSeconds: 'desc' },
    });

    const hiddenCount = await this.prisma.screenTimeSnapshot.count({
      where: {
        userId: targetUserId,
        date: dateObj,
        isHidden: true,
      },
    });

    const totalSeconds = snapshots.reduce(
      (sum, s) => sum + s.durationSeconds,
      0,
    );

    const totalUnlocks = snapshots.reduce(
      (sum, s) => sum + (s.openCount || 0),
      0,
    );

    // Calculate weekly trend
    const sevenDaysAgoLocal = localStartObj.minus({ days: 6 });
    const sevenDaysAgo = new Date(Date.UTC(sevenDaysAgoLocal.year, sevenDaysAgoLocal.month - 1, sevenDaysAgoLocal.day));

    const weeklySnapshots = await this.prisma.screenTimeSnapshot.groupBy({
      by: ['date'],
      where: {
        userId: targetUserId,
        date: {
          gte: sevenDaysAgo,
          lte: dateObj,
        },
        isHidden: false,
      },
      _sum: {
        durationSeconds: true,
      },
    });

    // Create an array of 7 values
    const weeklyTrend = Array(7).fill(0);
    for (let i = 6; i >= 0; i--) {
      const targetLocal = localStartObj.minus({ days: i });
      const targetUtc = new Date(Date.UTC(targetLocal.year, targetLocal.month - 1, targetLocal.day));
      
      const match = weeklySnapshots.find(s => s.date.getTime() === targetUtc.getTime());
      
      if (match) {
        weeklyTrend[6 - i] = Math.round((match._sum.durationSeconds || 0) / 60); // In minutes
      }
    }

    return {
      date: DateTime.fromJSDate(dateObj).setZone(userTz).toFormat('yyyy-MM-dd'),
      totalSeconds,
      unlocks: totalUnlocks,
      weeklyTrend,
      apps: snapshots.map((s) => ({
        appPackage: s.appPackage,
        appDisplayName: s.appDisplayName,
        durationSeconds: s.durationSeconds,
        openCount: s.openCount,
      })),
      hiddenCount,
    };
  }

  // ── HIDDEN APPS ───────────────────────────────────────────────────────
  async updateHiddenApps(userId: string, appPackages: string[]) {
    // Unhide all
    await this.prisma.screenTimeSnapshot.updateMany({
      where: { userId, isHidden: true },
      data: { isHidden: false },
    });

    // Hide specified
    if (appPackages.length > 0) {
      await this.prisma.screenTimeSnapshot.updateMany({
        where: {
          userId,
          appPackage: { in: appPackages },
        },
        data: { isHidden: true },
      });
    }

    return { hiddenApps: appPackages };
  }

  // ── THRESHOLDS ────────────────────────────────────────────────────────
  async setThreshold(userId: string, dto: SetThresholdDto) {
    await this.circlesService.validateMembership(userId, dto.circleId);

    return this.prisma.appThreshold.upsert({
      where: {
        userId_circleId_appPackage: {
          userId,
          circleId: dto.circleId,
          appPackage: dto.appPackage,
        },
      },
      update: {
        thresholdSeconds: dto.thresholdSeconds,
      },
      create: {
        userId,
        circleId: dto.circleId,
        appPackage: dto.appPackage,
        thresholdSeconds: dto.thresholdSeconds,
      },
    });
  }

  async getThresholds(userId: string, circleId: string) {
    await this.circlesService.validateMembership(userId, circleId);

    return this.prisma.appThreshold.findMany({
      where: { userId, circleId },
    });
  }

  // ── THRESHOLD CHECKER ─────────────────────────────────────────────────
  private async checkThresholds(userId: string, date: Date) {
    // Get all thresholds for this user
    const thresholds = await this.prisma.appThreshold.findMany({
      where: { userId, alertEnabled: true },
    });

    for (const threshold of thresholds) {
      const snapshot = await this.prisma.screenTimeSnapshot.findUnique({
        where: {
          userId_date_appPackage: {
            userId,
            date,
            appPackage: threshold.appPackage,
          },
        },
      });

      if (snapshot && snapshot.durationSeconds >= threshold.thresholdSeconds) {
        // Threshold exceeded — would emit event for notification
        // This is handled by the Notification Service in a later phase
      }
    }
  }
}
