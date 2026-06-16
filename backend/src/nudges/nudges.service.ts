import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import { SendNudgeDto } from './dto/nudge.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Maximum nudges a user can send to another user per rolling 24 hours
const MAX_NUDGES_LIMIT = 3;

@Injectable()
export class NudgesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circlesService: CirclesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── SEND NUDGE ────────────────────────────────────────────────────────
  async sendNudge(senderId: string, dto: SendNudgeDto) {
    if (senderId === dto.recipientId) {
      throw new BadRequestException('Cannot nudge yourself');
    }

    await this.circlesService.validateMembership(senderId, dto.circleId);
    await this.circlesService.validateMembership(dto.recipientId, dto.circleId);

    if (dto.goalInstanceId) {
      const instance = await this.prisma.goalInstance.findUnique({
        where: { id: dto.goalInstanceId },
      });
      if (!instance || instance.userId !== dto.recipientId) {
        throw new BadRequestException('Goal instance does not belong to the recipient');
      }
    }

    // Rate limiting: Check if sender has reached limit for this recipient in rolling 24 hours
    const rollingStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const count = await this.prisma.nudgeLog.count({
      where: {
        senderId,
        recipientId: dto.recipientId,
        circleId: dto.circleId,
        sentAt: { gte: rollingStart },
      },
    });

    if (count >= MAX_NUDGES_LIMIT) {
      throw new ForbiddenException(`Daily nudge limit exceeded (${MAX_NUDGES_LIMIT} per rolling 24h to this user)`);
    }

    // Check if recipient has blocked nudges from this sender
    const recipientPrefs = await this.prisma.userPreference.findUnique({
      where: { userId: dto.recipientId },
    });

    if (recipientPrefs?.nudgeBlockedUsers && Array.isArray(recipientPrefs.nudgeBlockedUsers) && recipientPrefs.nudgeBlockedUsers.includes(senderId)) {
      throw new ForbiddenException('User has blocked nudges from you');
    }

    const nudge = await this.prisma.nudgeLog.create({
      data: {
        senderId,
        recipientId: dto.recipientId,
        circleId: dto.circleId,
        goalInstanceId: dto.goalInstanceId,
        message: dto.message,
        result: 'delivered', // Assume delivered for now, can be updated by Notification service if failed
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Only emit the push notification event if the user hasn't globally disabled it.
    // Fire-and-forget: do NOT await — listener errors must never surface as a 500.
    try {
      if (!recipientPrefs || recipientPrefs.notifyNudge !== false) {
        this.eventEmitter.emitAsync('nudge.sent', { nudge }).catch(() => {
          // Notification failure is non-fatal; nudge was already saved to DB.
        });
      }
    } catch (err) {
      // Non-fatal: nudge was already saved to DB
      console.error('Failed to emit nudge.sent event:', err);
    }

    return nudge;
  }

  // ── GET NUDGES ────────────────────────────────────────────────────────
  async getNudges(userId: string, circleId: string, sentBy: 'me' | 'others', page = 1, limit = 20) {
    await this.circlesService.validateMembership(userId, circleId);

    const where: any = { circleId };
    if (sentBy === 'me') {
      where.senderId = userId;
    } else {
      where.recipientId = userId;
    }

    const [items, total] = await Promise.all([
      this.prisma.nudgeLog.findMany({
        where,
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
          recipient: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.nudgeLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
