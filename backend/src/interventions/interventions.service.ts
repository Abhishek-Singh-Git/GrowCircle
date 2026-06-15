import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import { CreateInterventionDto } from './dto/interventions.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

// System-critical apps that cannot be locked (PRD FR-008)
const UNLOCKABLE_APPS = [
  'com.android.dialer',
  'com.android.phone',
  'com.android.emergency',
  'com.android.settings',
  'com.growcircle.app',       // GrowCircle itself
];

// Cooldown: user must wait 5 minutes before overriding (PRD FR-008)
const OVERRIDE_COOLDOWN_SECONDS = 300;

// Maximum timeouts per member per day (configurable per circle, default 5)
const DEFAULT_MAX_DAILY_TIMEOUTS = 5;

@Injectable()
export class InterventionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circlesService: CirclesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── CREATE INTERVENTION (Alert or Timeout) ────────────────────────────
  async createIntervention(initiatorId: string, dto: CreateInterventionDto) {
    // 1. Validate membership for both users
    await this.circlesService.validateMembership(initiatorId, dto.circleId);
    await this.circlesService.validateMembership(dto.targetId, dto.circleId);

    // 2. Cannot target yourself
    if (initiatorId === dto.targetId) {
      throw new BadRequestException('Cannot create an intervention on yourself');
    }

    // 3. Check consent
    const circle = await this.prisma.circle.findUnique({
      where: { id: dto.circleId },
    });
    if (!circle) throw new NotFoundException('Circle not found');

    if (dto.type === 'timeout') {
      // Check if timeout is enabled in circle settings
      if (!circle.timeoutEnabled) {
        throw new ForbiddenException('Timeouts are not enabled in this circle');
      }

      // Check if target has granted timeout consent
      const consent = await this.prisma.consentRecord.findFirst({
        where: {
          userId: dto.targetId,
          circleId: dto.circleId,
          feature: 'timeout',
          revokedAt: null,
        },
      });

      if (!consent) {
        throw new ForbiddenException(
          'Target user has not granted timeout permission',
        );
      }

      // Validate duration
      if (!dto.durationSeconds) {
        throw new BadRequestException('Duration is required for timeouts');
      }

      // Validate app is not system-critical
      if (dto.appPackage && UNLOCKABLE_APPS.includes(dto.appPackage)) {
        throw new BadRequestException('Cannot lock system-critical apps');
      }
    }

    // 4. Check daily timeout limit
    if (dto.type === 'timeout') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayCount = await this.prisma.interventionLog.count({
        where: {
          targetId: dto.targetId,
          circleId: dto.circleId,
          interventionType: 'timeout',
          initiatedAt: { gte: todayStart },
        },
      });

      const maxDaily =
        circle.maxDailyTimeoutsPerMember ?? DEFAULT_MAX_DAILY_TIMEOUTS;

      if (todayCount >= maxDaily) {
        throw new ForbiddenException(
          `Daily timeout limit exceeded (${maxDaily} per day)`,
        );
      }
    }

    // 5. Check if target is on an active call (defer timeout)
    if (dto.type === 'timeout') {
      const activeCall = await this.prisma.callSession.findFirst({
        where: {
          circleId: dto.circleId,
          participants: { has: dto.targetId },
          status: 'active',
        },
      });

      if (activeCall) {
        throw new BadRequestException(
          'Target is on an active call. Timeout deferred.',
        );
      }
    }

    // 6. Create intervention log
    const expiresAt = dto.durationSeconds
      ? new Date(Date.now() + dto.durationSeconds * 1000 + 10000) // +10s grace
      : null;

    const intervention = await this.prisma.interventionLog.create({
      data: {
        initiatorId,
        targetId: dto.targetId,
        circleId: dto.circleId,
        interventionType: dto.type,
        appPackage: dto.appPackage ?? null,
        durationSeconds: dto.durationSeconds ?? null,
        status: dto.type === 'timeout' ? 'pending_grace' : 'sent',
        expiresAt,
      },
      include: {
        initiator: {
          select: { id: true, name: true, avatarUrl: true },
        },
        target: {
          select: { id: true, name: true },
        },
      },
    });

    // 7. Emit event for real-time delivery
    this.eventEmitter.emit('intervention.created', {
      intervention,
      circleId: dto.circleId,
      type: dto.type,
    });

    return intervention;
  }

  // ── OVERRIDE TIMEOUT ──────────────────────────────────────────────────
  async overrideIntervention(
    userId: string,
    interventionId: string,
    reason?: string,
  ) {
    await this.transitionInterventions();
    const intervention = await this.prisma.interventionLog.findUnique({
      where: { id: interventionId },
    });

    if (!intervention) throw new NotFoundException('Intervention not found');

    // Only the target can override
    if (intervention.targetId !== userId) {
      throw new ForbiddenException('Only the target can override');
    }

    // Must be an active timeout
    if (
      intervention.interventionType !== 'timeout' ||
      intervention.status === 'overridden' ||
      intervention.status === 'expired'
    ) {
      throw new BadRequestException('Intervention is not active');
    }

    // Check 5-minute cooldown
    const elapsedSeconds =
      (Date.now() - intervention.initiatedAt.getTime()) / 1000;

    if (elapsedSeconds < OVERRIDE_COOLDOWN_SECONDS) {
      const remaining = Math.ceil(OVERRIDE_COOLDOWN_SECONDS - elapsedSeconds);
      throw new ForbiddenException(
        JSON.stringify({
          error: 'COOLDOWN_ACTIVE',
          secondsRemaining: remaining,
        }),
      );
    }

    // Check max 3 overrides per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const overrideCountToday = await this.prisma.interventionLog.count({
      where: {
        targetId: userId,
        status: 'overridden',
        overrideAt: { gte: todayStart },
      },
    });

    if (overrideCountToday >= 3) {
      throw new ForbiddenException('Maximum daily override limit (3) reached.');
    }

    // Override
    const updated = await this.prisma.interventionLog.update({
      where: { id: interventionId },
      data: {
        status: 'overridden',
        overrideAt: new Date(),
        overrideReason: reason ?? null,
      },
    });

    // Emit override event to unlock device
    this.eventEmitter.emit('intervention.overridden', {
      intervention: updated,
      circleId: intervention.circleId,
    });

    return { overriddenAt: updated.overrideAt };
  }

  // ── GET INTERVENTION HISTORY ──────────────────────────────────────────
  async getInterventions(
    userId: string,
    circleId: string,
    dateFrom?: string,
    dateTo?: string,
    page = 1,
    limit = 20,
  ) {
    await this.transitionInterventions();
    await this.circlesService.validateMembership(userId, circleId);

    const where: Record<string, unknown> = { circleId };

    if (dateFrom || dateTo) {
      where.initiatedAt = {};
      if (dateFrom) (where.initiatedAt as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.initiatedAt as Record<string, unknown>).lte = new Date(dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.interventionLog.findMany({
        where,
        include: {
          initiator: {
            select: { id: true, name: true, avatarUrl: true },
          },
          target: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
        orderBy: { initiatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.interventionLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── HANDLE CONSENT REVOCATION ─────────────────────────────────────────
  // Called when a user revokes timeout consent
  async handleConsentRevocation(userId: string, circleId: string) {
    await this.transitionInterventions();
    // Cancel all active timeouts targeting this user in this circle
    const activeTimeouts = await this.prisma.interventionLog.findMany({
      where: {
        targetId: userId,
        circleId,
        interventionType: 'timeout',
        status: { in: ['pending_grace', 'active'] },
      },
    });

    for (const timeout of activeTimeouts) {
      await this.prisma.interventionLog.update({
        where: { id: timeout.id },
        data: {
          status: 'cancelled_consent_revoked',
          overrideAt: new Date(),
          overrideReason: 'Consent revoked by target user',
        },
      });

      // Emit event to unlock device
      this.eventEmitter.emit('intervention.cancelled', {
        intervention: timeout,
        circleId,
        reason: 'consent_revoked',
      });
    }

    return { cancelledCount: activeTimeouts.length };
  }

  // ── TRANSITION STATE FOR TIMEOUTS ────────────────────────────────────
  async transitionInterventions() {
    const now = new Date();

    // 1. Transition pending_grace -> active after 10 seconds grace period
    const tenSecondsAgo = new Date(now.getTime() - 10000);
    await this.prisma.interventionLog.updateMany({
      where: {
        interventionType: 'timeout',
        status: 'pending_grace',
        initiatedAt: { lte: tenSecondsAgo },
      },
      data: {
        status: 'active',
      },
    });

    // 2. Transition active/pending_grace -> expired after expiresAt
    await this.prisma.interventionLog.updateMany({
      where: {
        interventionType: 'timeout',
        status: { in: ['pending_grace', 'active'] },
        expiresAt: { lte: now },
      },
      data: {
        status: 'expired',
      },
    });
  }
}
