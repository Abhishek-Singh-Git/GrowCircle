import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import { CreateGoalDto, UpdateGoalDto } from './dto/goals.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circlesService: CirclesService,
  ) {}

  // ── CREATE GOAL ───────────────────────────────────────────────────────
  async createGoal(userId: string, dto: CreateGoalDto) {
    // Validate membership
    await this.circlesService.validateMembership(userId, dto.circleId);

    const goal = await this.prisma.goal.create({
      data: {
        userId,
        circleId: dto.circleId,
        name: dto.name,
        goalType: dto.goalType,
        targetValue: dto.targetValue ?? null,
        targetUnit: dto.targetUnit ?? null,
        scheduleType: dto.scheduleType,
        scheduleDays: dto.scheduleDays ?? [],
        scheduleWeeklyFreq: dto.scheduleWeeklyFreq ?? null,
        scheduleStartDate: dto.scheduleStartDate
          ? new Date(dto.scheduleStartDate)
          : null,
        scheduleEndDate: dto.scheduleEndDate
          ? new Date(dto.scheduleEndDate)
          : null,
        category: dto.category ?? 'Custom',
        categoryEmoji: dto.categoryEmoji ?? null,
        difficultyWeight: dto.difficultyWeight ?? 1,
        requireProof: dto.requireProof ?? false,
        isSensitive: dto.isSensitive ?? false,
      },
    });

    // Generate today's instance immediately
    await this.generateInstanceForDate(goal.id, userId, dto.circleId, new Date());

    return goal;
  }

  // ── GET USER'S GOALS ──────────────────────────────────────────────────
  async getGoals(userId: string, circleId: string, status = 'active') {
    await this.circlesService.validateMembership(userId, circleId);

    return this.prisma.goal.findMany({
      where: {
        userId,
        circleId,
        status,
        deletedAt: null,
      },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── GET SINGLE GOAL ───────────────────────────────────────────────────
  async getGoal(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        milestones: true,
        instances: {
          orderBy: { date: 'desc' },
          take: 7,
          include: {
            activityLogs: true,
          },
        },
      },
    });

    if (!goal) throw new NotFoundException('Goal not found');

    // Check access: must be owner or circle member (unless sensitive)
    if (goal.userId !== userId) {
      await this.circlesService.validateMembership(userId, goal.circleId);
      if (goal.isSensitive) {
        throw new ForbiddenException('This goal is private');
      }
    }

    return goal;
  }

  // ── UPDATE GOAL ───────────────────────────────────────────────────────
  async updateGoal(userId: string, goalId: string, dto: UpdateGoalDto) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException('Goal not found');
    if (goal.userId !== userId) throw new ForbiddenException('Not your goal');

    return this.prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
        ...(dto.targetUnit !== undefined && { targetUnit: dto.targetUnit }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.categoryEmoji !== undefined && { categoryEmoji: dto.categoryEmoji }),
        ...(dto.difficultyWeight !== undefined && {
          difficultyWeight: dto.difficultyWeight,
        }),
        ...(dto.requireProof !== undefined && { requireProof: dto.requireProof }),
        ...(dto.isSensitive !== undefined && { isSensitive: dto.isSensitive }),
      },
    });
  }

  // ── DELETE GOAL (soft) ────────────────────────────────────────────────
  async deleteGoal(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException('Goal not found');
    if (goal.userId !== userId) throw new ForbiddenException('Not your goal');

    return this.prisma.goal.update({
      where: { id: goalId },
      data: { deletedAt: new Date(), status: 'deleted' },
    });
  }

  // ── PAUSE / ARCHIVE ──────────────────────────────────────────────────
  async pauseGoal(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== userId)
      throw new ForbiddenException('Not your goal');

    return this.prisma.goal.update({
      where: { id: goalId },
      data: { status: 'paused', pausedAt: new Date() },
    });
  }

  async archiveGoal(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== userId)
      throw new ForbiddenException('Not your goal');

    return this.prisma.goal.update({
      where: { id: goalId },
      data: { status: 'archived', archivedAt: new Date() },
    });
  }

  // ── GET TODAY'S INSTANCES ─────────────────────────────────────────────
  async getTodayInstances(userId: string, circleId: string) {
    await this.circlesService.validateMembership(userId, circleId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.goalInstance.findMany({
      where: {
        userId,
        circleId,
        date: today,
      },
      include: {
        goal: true,
        activityLogs: {
          include: { reactions: true },
        },
      },
      orderBy: { goal: { createdAt: 'asc' } },
    });
  }

  // ── GENERATE INSTANCE FOR A SPECIFIC DATE ─────────────────────────────
  async generateInstanceForDate(
    goalId: string,
    userId: string,
    circleId: string,
    date: Date,
  ) {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.status !== 'active') return null;

    // Check schedule
    if (!this.isScheduledForDate(goal, dateOnly)) return null;

    // Upsert to avoid duplicates (UNIQUE constraint on goalId+date)
    try {
      return await this.prisma.goalInstance.create({
        data: {
          goalId,
          userId,
          circleId,
          date: dateOnly,
          targetValue: goal.targetValue,
          status: 'pending',
        },
      });
    } catch (e) {
      // Unique constraint violation → instance already exists
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return this.prisma.goalInstance.findFirst({
          where: { goalId, date: dateOnly },
        });
      }
      throw e;
    }
  }

  // ── BULK GENERATE: All goals for a user on a date ─────────────────────
  async generateAllInstancesForDate(
    userId: string,
    circleId: string,
    date: Date,
  ) {
    const goals = await this.prisma.goal.findMany({
      where: { userId, circleId, status: 'active', deletedAt: null },
    });

    const instances = [];
    for (const goal of goals) {
      const instance = await this.generateInstanceForDate(
        goal.id,
        userId,
        circleId,
        date,
      );
      if (instance) instances.push(instance);
    }

    return instances;
  }

  // ── SCHEDULE CHECKER ──────────────────────────────────────────────────
  private isScheduledForDate(
    goal: { scheduleType: string; scheduleDays: number[]; scheduleWeeklyFreq: number | null },
    date: Date,
  ): boolean {
    const dayOfWeek = date.getDay(); // 0=Sun

    switch (goal.scheduleType) {
      case 'daily':
        return true;

      case 'specific_days':
        return goal.scheduleDays.includes(dayOfWeek);

      case 'weekly_frequency':
        // Simple: always return true; the batch job handles weekly cap
        return true;

      default:
        return true;
    }
  }
}
