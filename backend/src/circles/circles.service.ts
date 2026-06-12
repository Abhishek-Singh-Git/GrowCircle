import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCircleDto, JoinCircleDto } from './dto/circles.dto';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class CirclesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── CREATE CIRCLE ─────────────────────────────────────────────────────
  async createCircle(userId: string, dto: CreateCircleDto) {
    const inviteCode = this.generateInviteCode();
    const inviteLinkToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry per PRD

    const circle = await this.prisma.circle.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId: userId,
        inviteCode,
        inviteLinkToken,
        inviteExpiresAt: expiresAt,
        timeoutEnabled: dto.timeoutEnabled ?? true,
        timeoutPermissionType: dto.timeoutPermissionType ?? 'mutual',
        leaderboardVisibility: dto.leaderboardVisibility ?? 'all_members',
        maxStakeType: dto.maxStakeType ?? 'points_only',
      },
    });

    // Auto-add creator as owner member
    await this.prisma.circleMember.create({
      data: {
        circleId: circle.id,
        userId,
        role: 'owner',
        status: 'active',
      },
    });

    // Initialize gamification profile for creator in this circle
    await this.prisma.gamificationProfile.create({
      data: {
        userId,
        circleId: circle.id,
      },
    });

    return {
      ...circle,
      inviteLink: `growcircle://join/${inviteLinkToken}`,
    };
  }

  // ── JOIN CIRCLE ───────────────────────────────────────────────────────
  async joinCircle(userId: string, dto: JoinCircleDto) {
    if (!dto.code && !dto.token) {
      throw new BadRequestException('Invite code or token is required');
    }

    // Find circle by code or token
    const circle = await this.prisma.circle.findFirst({
      where: {
        OR: [
          ...(dto.code ? [{ inviteCode: dto.code }] : []),
          ...(dto.token ? [{ inviteLinkToken: dto.token }] : []),
        ],
        disbandedAt: null,
      },
      include: {
        members: { where: { status: 'active' } },
      },
    });

    if (!circle) {
      throw new NotFoundException('Invalid invite code or link');
    }

    // Check expiry
    if (circle.inviteExpiresAt && circle.inviteExpiresAt < new Date()) {
      throw new BadRequestException('Invite link has expired. Ask the circle owner to regenerate.');
    }

    // Check if already a member
    const existingMember = circle.members.find((m) => m.userId === userId);
    if (existingMember) {
      throw new ConflictException('You are already a member of this circle');
    }

    // Check circle capacity (max 10 per PRD)
    if (circle.members.length >= 10) {
      throw new BadRequestException('Circle is full (maximum 10 members)');
    }

    // Add or reactivate member
    await this.prisma.circleMember.upsert({
      where: { circleId_userId: { circleId: circle.id, userId } },
      create: {
        circleId: circle.id,
        userId,
        role: 'member',
        status: 'active',
      },
      update: {
        status: 'active',
        role: 'member',
        joinedAt: new Date(),
        leftAt: null,
        removedAt: null,
      },
    });

    // Initialize/Re-initialize gamification profile
    await this.prisma.gamificationProfile.upsert({
      where: { userId_circleId: { userId, circleId: circle.id } },
      create: {
        userId,
        circleId: circle.id,
      },
      update: {
        updatedAt: new Date(),
      },
    });

    // Add user to the circle's group chat thread if it exists
    const groupThread = await this.prisma.chatThread.findFirst({
      where: { circleId: circle.id, threadType: 'group' },
    });

    if (groupThread) {
      await this.prisma.chatThreadParticipant.upsert({
        where: { threadId_userId: { threadId: groupThread.id, userId } },
        create: {
          threadId: groupThread.id,
          userId,
        },
        update: {
          clearedAt: null,
          lastReadAt: null,
        },
      });
    }

    return {
      id: circle.id,
      name: circle.name,
      memberCount: circle.members.length + 1,
    };
  }

  // ── LIST USER'S CIRCLES ───────────────────────────────────────────────
  async getUserCircles(userId: string) {
    const memberships = await this.prisma.circleMember.findMany({
      where: { userId, status: 'active' },
      include: {
        circle: {
          include: {
            members: {
              where: { status: 'active' },
              include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            },
          },
        },
      },
    });

    const results = [];
    for (const m of memberships) {
      const enrichedMembers = [];
      for (const mem of m.circle.members) {
        const profile = await this.prisma.gamificationProfile.findUnique({
          where: { userId_circleId: { userId: mem.user.id, circleId: m.circle.id } },
        });
        enrichedMembers.push({
          id: mem.user.id,
          name: mem.user.name,
          avatarUrl: mem.user.avatarUrl,
          role: mem.role,
          streak: profile?.currentStreak || 0,
          xp: profile?.totalXp || 0,
          level: profile?.currentLevel || 0,
        });
      }

      results.push({
        id: m.circle.id,
        name: m.circle.name,
        description: m.circle.description,
        inviteCode: m.circle.inviteCode,
        role: m.role,
        memberCount: m.circle.members.length,
        members: enrichedMembers,
        joinedAt: m.joinedAt,
      });
    }

    return results;
  }

  // ── GET CIRCLE DETAILS ────────────────────────────────────────────────
  async getCircleDetails(userId: string, circleId: string) {
    // Validate membership
    await this.validateMembership(userId, circleId);

    const circle = await this.prisma.circle.findUnique({
      where: { id: circleId },
      include: {
        members: {
          where: { status: 'active' },
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true, lastActiveAt: true },
            },
          },
        },
      },
    });

    if (!circle) throw new NotFoundException('Circle not found');

    return circle;
  }

  // ── LEAVE CIRCLE ─────────────────────────────────────────────────────
  async leaveCircle(userId: string, circleId: string) {
    const membership = await this.validateMembership(userId, circleId);

    if (membership.role === 'owner') {
      throw new BadRequestException(
        'As the owner, you cannot leave the circle. Delete the circle instead.',
      );
    }

    await this.prisma.circleMember.update({
      where: { circleId_userId: { circleId, userId } },
      data: { status: 'inactive' },
    });

    return { message: 'You have left the circle.' };
  }

  // ── DELETE CIRCLE ────────────────────────────────────────────────────
  async deleteCircle(userId: string, circleId: string) {
    const membership = await this.validateMembership(userId, circleId);

    if (membership.role !== 'owner') {
      throw new ForbiddenException('Only the circle owner can delete the circle.');
    }

    // Mark circle as disbanded
    await this.prisma.circle.update({
      where: { id: circleId },
      data: { disbandedAt: new Date() },
    });

    // Mark all members as inactive
    await this.prisma.circleMember.updateMany({
      where: { circleId },
      data: { status: 'inactive', leftAt: new Date() },
    });

    return { message: 'Circle has been deleted.' };
  }

  // ── MEMBERSHIP VALIDATION (reused across all services) ────────────────
  async validateMembership(userId: string, circleId: string) {
    const membership = await this.prisma.circleMember.findUnique({
      where: {
        circleId_userId: { circleId, userId },
      },
    });

    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException('You are not a member of this circle');
    }

    return membership;
  }

  // ── HELPERS ───────────────────────────────────────────────────────────
  private generateInviteCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-char hex code
  }
}
