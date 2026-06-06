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

// Maximum nudges a user can send to another user per day (to prevent spam)
const MAX_NUDGES_PER_DAY = 10;

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

    // Rate limiting: Check if sender has reached daily limit for this recipient
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCount = await this.prisma.nudgeLog.count({
      where: {
        senderId,
        recipientId: dto.recipientId,
        circleId: dto.circleId,
        sentAt: { gte: todayStart },
      },
    });

    if (todayCount >= MAX_NUDGES_PER_DAY) {
      throw new ForbiddenException(`Daily nudge limit exceeded (${MAX_NUDGES_PER_DAY} per day to this user)`);
    }

    // Check if recipient has blocked nudges from this sender
    const recipientPrefs = await this.prisma.userPreference.findUnique({
      where: { userId: dto.recipientId },
    });

    if (recipientPrefs?.nudgeBlockedUsers?.includes(senderId)) {
      throw new ForbiddenException('User has blocked nudges from you');
    }

    if (recipientPrefs && !recipientPrefs.notifyNudge) {
       throw new ForbiddenException('User has disabled nudge notifications globally');
    }

    const nudge = await this.prisma.nudgeLog.create({
      data: {
        senderId,
        recipientId: dto.recipientId,
        circleId: dto.circleId,
        goalId: dto.goalId,
        goalInstanceId: dto.goalInstanceId,
        message: dto.message,
        result: 'delivered', // Assume delivered for now, can be updated by Notification service if failed
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    this.eventEmitter.emit('nudge.sent', { nudge });

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
