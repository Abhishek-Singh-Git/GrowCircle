import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import { CreateLogDto } from './dto/logging.dto';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

// XP calculation constants from PRD Section 16
const XP_BASE_COMPLETION = 10;
const XP_DIFFICULTY_MULTIPLIER = { 1: 1, 2: 1.5, 3: 2 };
const XP_PROOF_BONUS = 5;
const XP_ON_TIME_BONUS = 3; // Logged before 11 PM

@Injectable()
export class LoggingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circlesService: CirclesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── CREATE ACTIVITY LOG ───────────────────────────────────────────────
  async createLog(userId: string, dto: CreateLogDto) {
    // Get the goal instance with its goal
    const instance = await this.prisma.goalInstance.findUnique({
      where: { id: dto.goalInstanceId },
      include: { goal: true },
    });

    if (!instance) throw new NotFoundException('Goal instance not found');
    if (instance.userId !== userId)
      throw new ForbiddenException('Not your goal instance');

    // Validate circle membership
    await this.circlesService.validateMembership(userId, instance.circleId);

    // Calculate XP
    const xp = this.calculateXp(
      dto.status,
      dto.completionFraction ?? (dto.status === 'completed' ? 1 : 0),
      instance.goal.difficultyWeight,
      !!dto.proofUrl,
    );

    // Create log (client_uuid ensures idempotency for offline queue)
    try {
      const log = await this.prisma.activityLog.create({
        data: {
          clientUuid: dto.clientUuid,
          goalInstanceId: dto.goalInstanceId,
          goalId: instance.goalId,
          userId,
          circleId: instance.circleId,
          date: instance.date,
          targetValue: instance.targetValue,
          actualValue: dto.actualValue ?? null,
          completionFraction:
            dto.completionFraction ?? (dto.status === 'completed' ? 1 : 0),
          status: dto.status,
          proofUrl: dto.proofUrl ?? null,
          proofType: dto.proofType ?? null,
          notes: dto.notes ?? null,
          xpAwarded: xp,
        },
        include: {
          goal: true,
          reactions: true,
        },
      });

      // Update instance status
      await this.prisma.goalInstance.update({
        where: { id: dto.goalInstanceId },
        data: { status: dto.status === 'completed' ? 'completed' : 'partial' },
      });

      // Update gamification profile XP
      await this.updateXp(userId, instance.circleId, xp);

      // Emit event for real-time feed + notifications
      this.eventEmitter.emit('log.created', {
        log,
        userId,
        circleId: instance.circleId,
        goalName: instance.goal.name,
        goalEmoji: instance.goal.categoryEmoji,
      });

      return { ...log, xpAwarded: xp };
    } catch (e) {
      // Idempotent: if client_uuid already exists, return existing log
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const existing = await this.prisma.activityLog.findUnique({
          where: { clientUuid: dto.clientUuid },
          include: { goal: true, reactions: true },
        });
        return existing;
      }
      throw e;
    }
  }

  // ── GET LOG ───────────────────────────────────────────────────────────
  async getLog(userId: string, logId: string) {
    const log = await this.prisma.activityLog.findUnique({
      where: { id: logId },
      include: {
        goal: true,
        reactions: { include: { user: { select: { id: true, name: true } } } },
        mediaObjects: true,
      },
    });

    if (!log) throw new NotFoundException('Log not found');

    // Must be owner or circle member
    if (log.userId !== userId) {
      await this.circlesService.validateMembership(userId, log.circleId);
    }

    return log;
  }

  // ── ADD REACTION ──────────────────────────────────────────────────────
  async addReaction(userId: string, logId: string, emoji: string) {
    const log = await this.prisma.activityLog.findUnique({
      where: { id: logId },
    });
    if (!log) throw new NotFoundException('Log not found');

    // Must be in same circle
    await this.circlesService.validateMembership(userId, log.circleId);

    try {
      const reaction = await this.prisma.logReaction.create({
        data: { logId, userId, emoji },
      });

      // Emit event for real-time update
      this.eventEmitter.emit('reaction.added', {
        reaction,
        logId,
        circleId: log.circleId,
        reactorId: userId,
      });

      return reaction;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('You already reacted with this emoji');
      }
      throw e;
    }
  }

  // ── REMOVE REACTION ───────────────────────────────────────────────────
  async removeReaction(userId: string, reactionId: string) {
    const reaction = await this.prisma.logReaction.findUnique({
      where: { id: reactionId },
    });
    if (!reaction) throw new NotFoundException('Reaction not found');
    if (reaction.userId !== userId)
      throw new ForbiddenException('Not your reaction');

    await this.prisma.logReaction.delete({ where: { id: reactionId } });
    return { success: true };
  }

  // ── CIRCLE FEED (all members' logs for a date) ────────────────────────
  async getCircleFeed(userId: string, circleId: string, date?: string) {
    await this.circlesService.validateMembership(userId, circleId);

    const feedDate = date ? new Date(date) : new Date();
    feedDate.setHours(0, 0, 0, 0);

    // Get all members
    const members = await this.prisma.circleMember.findMany({
      where: { circleId, status: 'active' },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true, lastActiveAt: true },
        },
      },
    });

    // Get all instances for this circle + date
    const instances = await this.prisma.goalInstance.findMany({
      where: { circleId, date: feedDate },
      include: {
        goal: {
          select: {
            id: true,
            name: true,
            goalType: true,
            targetValue: true,
            targetUnit: true,
            category: true,
            categoryEmoji: true,
            isSensitive: true,
          },
        },
        activityLogs: {
          include: {
            reactions: {
              include: {
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    // Group by member
    const feedMembers = [];
    for (const member of members) {
      const memberInstances = instances
        .filter((i) => i.userId === member.userId)
        .map((i) => {
          // Hide sensitive goals from others
          if (i.goal.isSensitive && i.userId !== userId) {
            return {
              ...i,
              goal: { ...i.goal, name: 'Private Goal', categoryEmoji: '🔒' },
            };
          }
          return i;
        });

      const completed = memberInstances.filter(
        (i) => i.status === 'completed',
      ).length;

      const profile = await this.prisma.gamificationProfile.findUnique({
        where: { userId_circleId: { userId: member.userId, circleId } },
      });

      feedMembers.push({
        user: member.user,
        role: member.role,
        todaySummary: {
          totalGoals: memberInstances.length,
          completed,
          completionRate:
            memberInstances.length > 0
              ? Math.round((completed / memberInstances.length) * 100)
              : 0,
        },
        goalInstances: memberInstances,
        streak: profile?.currentStreak || 0,
        xp: profile?.totalXp || 0,
      });
    }

    return feedMembers;
  }

  // ── XP CALCULATION ────────────────────────────────────────────────────
  private calculateXp(
    status: string,
    completionFraction: number,
    difficultyWeight: number,
    hasProof: boolean,
  ): number {
    if (status === 'skipped') return 0;

    let xp = Math.round(
      XP_BASE_COMPLETION *
        completionFraction *
        (XP_DIFFICULTY_MULTIPLIER[difficultyWeight as 1 | 2 | 3] ?? 1),
    );

    if (hasProof) xp += XP_PROOF_BONUS;

    const hour = new Date().getHours();
    if (hour < 23) xp += XP_ON_TIME_BONUS; // On-time bonus

    return xp;
  }

  // ── UPDATE XP ─────────────────────────────────────────────────────────
  private async updateXp(userId: string, circleId: string, xp: number) {
    await this.prisma.gamificationProfile.update({
      where: { userId_circleId: { userId, circleId } },
      data: {
        totalXp: { increment: xp },
      },
    });
  }
}
