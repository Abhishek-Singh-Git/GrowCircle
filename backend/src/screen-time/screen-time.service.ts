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

@Injectable()
export class ScreenTimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circlesService: CirclesService,
  ) {}

  // ── SYNC SCREEN TIME DATA (from device) ───────────────────────────────
  async syncScreenTime(userId: string, dto: SyncScreenTimeDto) {
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);

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

    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

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

    return {
      date: dateObj.toISOString().split('T')[0],
      totalSeconds,
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
