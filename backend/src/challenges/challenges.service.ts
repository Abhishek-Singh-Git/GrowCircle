import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import { CreateChallengeDto, ResolveChallengeDto } from './dto/challenge.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circlesService: CirclesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── CREATE CHALLENGE ────────────────────────────────────────────────
  async createChallenge(proposerId: string, dto: CreateChallengeDto) {
    await this.circlesService.validateMembership(proposerId, dto.circleId);

    // Validate participants
    if (!dto.participantIds.includes(proposerId)) {
      dto.participantIds.push(proposerId);
    }
    if (dto.participantIds.length < 2) {
      throw new BadRequestException('A challenge requires at least 2 participants');
    }

    // Prepare participants data
    const participantsData = dto.participantIds.map((userId) => ({
      user: { connect: { id: userId } },
      status: userId === proposerId ? 'accepted' : 'pending',
      acceptedAt: userId === proposerId ? new Date() : null,
    }));

    const challenge = await this.prisma.challenge.create({
      data: {
        circleId: dto.circleId,
        proposerId,
        title: dto.title,
        conditionDescription: dto.conditionDescription,
        conditionType: dto.conditionType,
        conditionGoalId: dto.conditionGoalId,
        conditionTarget: dto.conditionTarget,
        stakeType: dto.stakeType,
        stakeDescription: dto.stakeDescription,
        stakePoints: dto.stakePoints,
        proofRequired: dto.proofRequired,
        deadline: new Date(dto.deadline),
        participants: {
          create: participantsData,
        },
      },
      include: {
        proposer: { select: { id: true, name: true, avatarUrl: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    this.eventEmitter.emit('challenge.created', { challenge });

    return challenge;
  }

  // ── ACCEPT/REJECT CHALLENGE ─────────────────────────────────────────
  async respondToChallenge(userId: string, challengeId: string, accept: boolean) {
    const participant = await this.prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
      include: { challenge: true },
    });

    if (!participant) {
      throw new NotFoundException('Challenge or participant not found');
    }
    if (participant.status !== 'pending') {
      throw new BadRequestException(`You have already responded: ${participant.status}`);
    }

    const updatedParticipant = await this.prisma.challengeParticipant.update({
      where: { id: participant.id },
      data: {
        status: accept ? 'accepted' : 'rejected',
        acceptedAt: accept ? new Date() : null,
      },
    });

    // If rejected, check if we need to cancel the challenge
    if (!accept) {
      const remainingPending = await this.prisma.challengeParticipant.count({
        where: { challengeId, status: 'pending' },
      });
      const acceptedCount = await this.prisma.challengeParticipant.count({
        where: { challengeId, status: 'accepted' },
      });

      if (remainingPending === 0 && acceptedCount < 2) {
        // Cancel challenge if not enough participants
        await this.prisma.challenge.update({
          where: { id: challengeId },
          data: { status: 'cancelled' },
        });
        this.eventEmitter.emit('challenge.cancelled', { challengeId, reason: 'insufficient_participants' });
      }
    } else {
      // Check if all pending participants have accepted to activate it
      const remainingPending = await this.prisma.challengeParticipant.count({
        where: { challengeId, status: 'pending' },
      });
      if (remainingPending === 0) {
        await this.prisma.challenge.update({
          where: { id: challengeId },
          data: { status: 'active' },
        });
        this.eventEmitter.emit('challenge.activated', { challengeId });
      }
    }

    return updatedParticipant;
  }

  // ── RESOLVE CHALLENGE ───────────────────────────────────────────────
  async resolveChallenge(userId: string, challengeId: string, dto: ResolveChallengeDto) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }
    if (challenge.status !== 'active' && challenge.status !== 'pending_resolution') {
      throw new BadRequestException(`Cannot resolve a challenge in status: ${challenge.status}`);
    }
    // Only the proposer can manually resolve it, or the winner claiming it (if proof validated)
    // For simplicity, we allow any participant to claim resolution, but we notify others to dispute if needed.
    const isParticipant = await this.prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
    });
    if (!isParticipant) {
      throw new ForbiddenException('Only participants can resolve this challenge');
    }

    const resolvedChallenge = await this.prisma.challenge.update({
      where: { id: challengeId },
      data: {
        status: 'resolved',
        winnerId: dto.outcomeType === 'win' ? dto.winnerId : null,
        outcomeType: dto.outcomeType,
        resolvedAt: new Date(),
      },
    });

    // Handle Stake (Points transfer)
    if (resolvedChallenge.stakeType === 'points' && resolvedChallenge.stakePoints && resolvedChallenge.winnerId) {
      // Simple logic: Winner gets points. We could subtract from losers, but for now just award.
      await this.prisma.gamificationProfile.update({
        where: { userId_circleId: { userId: resolvedChallenge.winnerId, circleId: challenge.circleId } },
        data: { totalXp: { increment: resolvedChallenge.stakePoints } },
      });
    }

    this.eventEmitter.emit('challenge.resolved', { challenge: resolvedChallenge });

    return resolvedChallenge;
  }

  // ── GET CHALLENGES ──────────────────────────────────────────────────
  async getChallenges(userId: string, circleId: string, status?: string) {
    await this.circlesService.validateMembership(userId, circleId);

    const where: any = { circleId };
    if (status) {
      where.status = status;
    }

    return this.prisma.challenge.findMany({
      where,
      include: {
        proposer: { select: { id: true, name: true, avatarUrl: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        winner: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
