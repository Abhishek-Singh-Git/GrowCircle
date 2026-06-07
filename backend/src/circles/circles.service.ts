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

    // Add member
    await this.prisma.circleMember.create({
      data: {
        circleId: circle.id,
        userId,
        role: 'member',
        status: 'active',
      },
    });

    // Initialize gamification profile
    await this.prisma.gamificationProfile.create({
      data: {
        userId,
        circleId: circle.id,
      },
    });

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

    return memberships.map((m) => ({
      id: m.circle.id,
      name: m.circle.name,
      description: m.circle.description,
      inviteCode: m.circle.inviteCode,
      role: m.role,
      memberCount: m.circle.members.length,
      members: m.circle.members.map((mem) => ({
        id: mem.user.id,
        name: mem.user.name,
        avatarUrl: mem.user.avatarUrl,
        role: mem.role,
      })),
      joinedAt: m.joinedAt,
    }));
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
