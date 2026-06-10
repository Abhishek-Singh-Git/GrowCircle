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

    // Server partner-ID guard: check that all participants are in the circle
    for (const pId of dto.participantIds) {
      await this.circlesService.validateMembership(pId, dto.circleId);
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

    if (!accept) {
      // If rejected, check if we need to cancel the challenge
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
      // Emit challenge.accepted event
      const challengeWithParticipants = await this.prisma.challenge.findUnique({
        where: { id: challengeId },
        include: { participants: true },
      });
      if (challengeWithParticipants) {
        this.eventEmitter.emit('challenge.accepted', {
          challenge: challengeWithParticipants,
          acceptorId: userId,
        });
      }

      // Check if all pending participants have accepted to activate it
      const remainingPending = await this.prisma.challengeParticipant.count({
        where: { challengeId, status: 'pending' },
      });
      if (remainingPending === 0) {
        const challenge = await this.prisma.challenge.update({
          where: { id: challengeId },
          data: { status: 'active' },
          include: { participants: { select: { userId: true } } },
        });
        
        const participantIds = challenge.participants.map((p) => p.userId);

        this.eventEmitter.emit('challenge.activated', {
          challengeId: challenge.id,
          participants: participantIds.map((id: string) => ({ userId: id })),
        });
      }
    }

    return updatedParticipant;
  }

  // ── INCREMENT PROGRESS ──────────────────────────────────────────────
  async incrementProgress(userId: string, challengeId: string) {
    const participant = await this.prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
      include: { challenge: true },
    });

    if (!participant) {
      throw new NotFoundException('Challenge or participant not found');
    }
    if (participant.challenge.status !== 'active') {
      throw new BadRequestException('Can only increment active challenges');
    }

    // Enforce once-per-24-hour rule for manual progress to prevent abuse
    if (participant.lastProgressAt) {
      const hoursSinceLast = (Date.now() - participant.lastProgressAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < 24) {
        throw new BadRequestException(`You can only check-in once every 24 hours. Next check-in available in ${Math.ceil(24 - hoursSinceLast)}h.`);
      }
    }

    const updated = await this.prisma.challengeParticipant.update({
      where: { id: participant.id },
      data: {
        manualProgress: { increment: 1 },
        lastProgressAt: new Date(),
      },
    });

    // Emit event for circle notification
    this.eventEmitter.emit('challenge.progress_updated', {
      challengeId: participant.challenge.id,
      userId,
      progress: updated.manualProgress,
      total: participant.challenge.conditionTarget || 7
    });

    // Check if progress target has been reached
    const target = participant.challenge.conditionTarget ? Number(participant.challenge.conditionTarget) : 7;
    if (updated.manualProgress >= target) {
      await this.resolveChallenge(userId, participant.challenge.id, {
        outcomeType: 'win',
        winnerId: userId
      });
    }

    return updated;
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
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    // Award XP for completion regardless of outcome
    for (const participant of resolvedChallenge.participants) {
      await this.updateXp(participant.userId, challenge.circleId, 20); // Base participation XP
    }

    // Handle Stake (Points transfer)
    if (resolvedChallenge.stakeType === 'points' && resolvedChallenge.stakePoints && resolvedChallenge.winnerId) {
      // Winner gets points
      await this.updateXp(resolvedChallenge.winnerId, challenge.circleId, resolvedChallenge.stakePoints);

      // Losers lose points
      const losers = resolvedChallenge.participants.filter(p => p.userId !== resolvedChallenge.winnerId);

      for (const loser of losers) {
        const profile = await this.prisma.gamificationProfile.findUnique({
          where: { userId_circleId: { userId: loser.userId, circleId: challenge.circleId } },
        });
        if (profile) {
          const newXp = Math.max(0, profile.totalXp - resolvedChallenge.stakePoints);
          await this.prisma.gamificationProfile.update({
            where: { userId_circleId: { userId: loser.userId, circleId: challenge.circleId } },
            data: { totalXp: newXp },
          });
        }
      }
    }

    this.eventEmitter.emit('challenge.resolved', { challenge: resolvedChallenge });

    return resolvedChallenge;
  }

  private async updateXp(userId: string, circleId: string, xp: number) {
    await this.prisma.gamificationProfile.update({
      where: { userId_circleId: { userId, circleId } },
      data: {
        totalXp: { increment: xp },
      },
    });
  }

  // ── GET CHALLENGES ──────────────────────────────────────────────────
  async getChallenges(userId: string, circleId: string, status?: string) {
    await this.circlesService.validateMembership(userId, circleId);

    const where: any = { circleId };
    if (status) {
      where.status = status;
    }

    const challenges = await this.prisma.challenge.findMany({
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

    const enrichedChallenges = [];
    for (const challenge of challenges) {
      const participantsWithProgress = [];
      for (const participant of challenge.participants) {
        let progress = 0;
        if (challenge.status === 'active' || challenge.status === 'resolved' || challenge.status === 'pending_resolution') {
          if (challenge.conditionType === 'goal_based' && challenge.conditionGoalId) {
            const proposerGoal = await this.prisma.goal.findUnique({
              where: { id: challenge.conditionGoalId },
            });
            if (proposerGoal) {
              const userGoal = await this.prisma.goal.findFirst({
                where: {
                  userId: participant.userId,
                  circleId: challenge.circleId,
                  OR: [
                    { id: challenge.conditionGoalId },
                    { name: proposerGoal.name },
                    { templateSourceId: proposerGoal.templateSourceId ? proposerGoal.templateSourceId : undefined },
                  ],
                },
              });

              if (userGoal) {
                progress = await this.prisma.activityLog.count({
                  where: {
                    userId: participant.userId,
                    goalId: userGoal.id,
                    circleId: challenge.circleId,
                    status: 'completed',
                    loggedAt: {
                      gte: challenge.createdAt,
                      lte: challenge.deadline,
                    },
                  },
                });
              }
            }
          } else if (challenge.conditionType === 'screen_time') {
            const snapshots = await this.prisma.screenTimeSnapshot.aggregate({
              where: {
                userId: participant.userId,
                syncedAt: {
                  gte: challenge.createdAt,
                  lte: challenge.deadline,
                },
              },
              _sum: {
                durationSeconds: true,
              },
            });
            progress = Math.round((snapshots._sum.durationSeconds || 0) / 60);
          } else if (challenge.conditionType === 'custom') {
            progress = (participant as any).manualProgress || 0;
          } else {
            progress = await this.prisma.activityLog.count({
              where: {
                userId: participant.userId,
                circleId: challenge.circleId,
                status: 'completed',
                loggedAt: {
                  gte: challenge.createdAt,
                  lte: challenge.deadline,
                },
              },
            });
          }
        }
        participantsWithProgress.push({
          ...participant,
          progress,
        });
      }
      enrichedChallenges.push({
        ...challenge,
        participants: participantsWithProgress,
      });
    }

    return enrichedChallenges;
  }
}
