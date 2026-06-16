import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import { CreateChallengeDto, ResolveChallengeDto, SubmitVictoryDto } from './dto/challenge.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circlesService: CirclesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── CREATE CHALLENGE ────────────────────────────────────────────────
  // Battle Arena 2.0: deadline is computed from durationHours instead of
  // being passed directly by the client.
  async createChallenge(proposerId: string, dto: CreateChallengeDto) {
    await this.circlesService.validateMembership(proposerId, dto.circleId);

    // Validate participants
    if (dto.participantIds.length < 1) {
      throw new BadRequestException('A challenge requires at least 1 participant');
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

    // Battle Arena 2.0: compute deadline from durationHours
    const deadline = new Date(Date.now() + dto.durationHours * 60 * 60 * 1000);

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
        durationHours: dto.durationHours,
        deadline,
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
        // Battle Arena 2.0: recompute deadline from NOW when battle actually starts
        const challenge = await this.prisma.challenge.findUnique({
          where: { id: challengeId },
        });
        const newDeadline = new Date(Date.now() + (challenge?.durationHours || 12) * 60 * 60 * 1000);

        const updatedChallenge = await this.prisma.challenge.update({
          where: { id: challengeId },
          data: {
            status: 'active',
            deadline: newDeadline,
          },
          include: { participants: { select: { userId: true } } },
        });

        const participantIds = updatedChallenge.participants.map((p) => p.userId);

        this.eventEmitter.emit('challenge.activated', {
          challengeId: updatedChallenge.id,
          participants: participantIds.map((id: string) => ({ userId: id })),
        });
      }
    }

    return updatedParticipant;
  }

  // ── INCREMENT PROGRESS (Legacy — kept for backward compatibility) ───
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
      progress: Number(updated.manualProgress),
      total: participant.challenge.conditionTarget ? Number(participant.challenge.conditionTarget) : 7
    });

    // Check if progress target has been reached
    const target = participant.challenge.conditionTarget ? Number(participant.challenge.conditionTarget) : 7;
    if (Number(updated.manualProgress) >= target) {
      await this.resolveChallenge(userId, participant.challenge.id, {
        outcomeType: 'win',
        winnerId: userId
      });
    }

    return updated;
  }

  // ── SUBMIT VICTORY (Battle Arena 2.0) ───────────────────────────────
  // Both participants can independently claim victory by submitting proof
  // text and holding to verify. Victory is self-certified.
  async submitVictory(userId: string, challengeId: string, dto: SubmitVictoryDto) {
    const participant = await this.prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
      include: { challenge: true },
    });

    if (!participant) {
      throw new NotFoundException('Challenge or participant not found');
    }
    if (participant.challenge.status !== 'active') {
      throw new BadRequestException('Can only submit victory for active challenges');
    }
    if (participant.verificationStatus === 'verified') {
      throw new BadRequestException('You have already claimed victory for this challenge');
    }

    // Check the challenge hasn't expired
    if (new Date() >= participant.challenge.deadline) {
      throw new BadRequestException('This challenge has expired. 💀 Battle Lost.');
    }

    // Mark this participant as pending review
    const updated = await this.prisma.challengeParticipant.update({
      where: { id: participant.id },
      data: {
        proofText: dto.proofText,
        verificationStatus: 'pending_review',
        submittedAt: new Date(),
      },
    });

    // Emit event — notifications will be sent to other participants or proposer
    this.eventEmitter.emit('challenge.victory_submitted', {
      challengeId,
      userId,
      proofText: dto.proofText,
      challengeTitle: participant.challenge.title,
    });

    return updated;
  }

  // ── RESOLUTION HELPER (Battle Arena 2.0 State Machine) ────────────────
  async checkAndResolveChallenge(challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { participants: true },
    });

    if (!challenge || challenge.status === 'resolved' || challenge.status === 'expired' || challenge.status === 'cancelled') {
      return;
    }

    const now = new Date();
    const isPastDeadline = now >= challenge.deadline;
    const totalParticipants = challenge.participants.length;

    // Count states
    const verifiedParticipants = challenge.participants.filter(p => p.verificationStatus === 'verified');
    const pendingReviewParticipants = challenge.participants.filter(p => p.verificationStatus === 'pending_review');
    const verifiedCount = verifiedParticipants.length;

    if (isPastDeadline) {
      // If past deadline, we can only resolve if there are no pending reviews left
      if (pendingReviewParticipants.length > 0) {
        // Skip for now, wait for 24h grace period reviews to be accepted or rejected
        return;
      }

      // Mark all remaining 'pending' participants as 'expired'
      await this.prisma.challengeParticipant.updateMany({
        where: {
          challengeId,
          verificationStatus: 'pending',
        },
        data: {
          verificationStatus: 'expired',
        },
      });

      let outcomeType: string;
      let winnerId: string | null = null;

      if (verifiedCount === 0) {
        outcomeType = 'expired';
        await this.prisma.challenge.update({
          where: { id: challengeId },
          data: {
            status: 'expired',
            outcomeType,
            winnerId,
            resolvedAt: now,
          },
        });
        this.eventEmitter.emit('challenge.expired', { challengeId, outcomeType });
      } else if (verifiedCount === 1) {
        outcomeType = 'win';
        winnerId = verifiedParticipants[0].userId;
        await this.prisma.challenge.update({
          where: { id: challengeId },
          data: {
            status: 'resolved',
            outcomeType,
            winnerId,
            resolvedAt: now,
          },
        });
        await this.incrementWin(winnerId, challenge.circleId);
        this.eventEmitter.emit('challenge.resolved', { challengeId, outcomeType, winnerId });
      } else {
        outcomeType = 'draw';
        await this.prisma.challenge.update({
          where: { id: challengeId },
          data: {
            status: 'resolved',
            outcomeType,
            winnerId,
            resolvedAt: now,
          },
        });
        for (const p of verifiedParticipants) {
          await this.incrementWin(p.userId, challenge.circleId);
        }
        this.eventEmitter.emit('challenge.resolved', { challengeId, outcomeType });
      }
    } else {
      // If not past deadline, we can resolve early ONLY if all participants are verified
      if (verifiedCount === totalParticipants) {
        const outcomeType = totalParticipants > 1 ? 'draw' : 'win';
        const winnerId = totalParticipants === 1 ? verifiedParticipants[0].userId : null;

        await this.prisma.challenge.update({
          where: { id: challengeId },
          data: {
            status: 'resolved',
            outcomeType,
            winnerId,
            resolvedAt: now,
          },
        });

        if (totalParticipants === 1) {
          await this.incrementWin(verifiedParticipants[0].userId, challenge.circleId);
        } else {
          for (const p of verifiedParticipants) {
            await this.incrementWin(p.userId, challenge.circleId);
          }
        }

        this.eventEmitter.emit('challenge.resolved', { challengeId, outcomeType, winnerId });
      }
    }
  }

  // ── ACCEPT VICTORY ──────────────────────────────────────────────────
  async acceptVictory(reviewerId: string, challengeId: string, participantId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { participants: true },
    });

    if (!challenge) throw new NotFoundException('Challenge not found');

    const participant = challenge.participants.find(p => p.userId === participantId);
    if (!participant || participant.verificationStatus !== 'pending_review') {
      throw new BadRequestException('Participant is not pending review');
    }

    // Verify reviewer is authorized (proposer or another participant)
    const isProposer = challenge.proposerId === reviewerId;
    const isOtherParticipant = challenge.participants.some(p => p.userId === reviewerId && p.userId !== participantId);
    if (!isProposer && !isOtherParticipant) {
      throw new ForbiddenException('You are not authorized to review this claim');
    }

    const updated = await this.prisma.challengeParticipant.update({
      where: { id: participant.id },
      data: { verificationStatus: 'verified' },
    });

    // Award XP
    await this.updateXp(participantId, challenge.circleId, 30);

    this.eventEmitter.emit('challenge.victory_accepted', { challengeId, participantId, challengeTitle: challenge.title });

    // Call helper to resolve if needed
    await this.checkAndResolveChallenge(challengeId);

    return updated;
  }

  // ── REJECT VICTORY ──────────────────────────────────────────────────
  async rejectVictory(reviewerId: string, challengeId: string, participantId: string, reason: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { participants: true },
    });

    if (!challenge) throw new NotFoundException('Challenge not found');

    const participant = challenge.participants.find(p => p.userId === participantId);
    if (!participant || participant.verificationStatus !== 'pending_review') {
      throw new BadRequestException('Participant is not pending review');
    }

    const isProposer = challenge.proposerId === reviewerId;
    const isOtherParticipant = challenge.participants.some(p => p.userId === reviewerId && p.userId !== participantId);
    if (!isProposer && !isOtherParticipant) {
      throw new ForbiddenException('You are not authorized to review this claim');
    }

    const updated = await this.prisma.challengeParticipant.update({
      where: { id: participant.id },
      data: { verificationStatus: 'rejected' },
    });

    // Optionally auto-open dispute ticket if rejected
    await this.prisma.disputeTicket.create({
      data: {
        challengeId,
        raisedBy: participantId,
        description: `Victory claim rejected by reviewer. Reason: ${reason || 'No reason provided'}`,
        status: 'open',
      }
    });

    this.eventEmitter.emit('challenge.victory_rejected', { challengeId, participantId, reason, challengeTitle: challenge.title });

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
      await this.updateXp(participant.userId, challenge.circleId, 20);
    }

    // Handle Stake (Points transfer)
    if (resolvedChallenge.stakeType === 'points' && resolvedChallenge.stakePoints && resolvedChallenge.winnerId) {
      await this.updateXp(resolvedChallenge.winnerId, challenge.circleId, resolvedChallenge.stakePoints);

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

  private async incrementWin(userId: string, circleId: string) {
    await this.prisma.gamificationProfile.update({
      where: { userId_circleId: { userId, circleId } },
      data: { challengesWon: { increment: 1 } },
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
      const requestingParticipant = challenge.participants.find(p => p.userId === userId);
      if (requestingParticipant?.status === 'hidden') continue;

      const participantsWithProgress = [];
      for (const participant of challenge.participants) {
        let progress = 0;
        if (challenge.status === 'active' || challenge.status === 'resolved' || challenge.status === 'expired' || challenge.status === 'pending_resolution') {
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
            progress = Number((participant as any).manualProgress) || 0;
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

      // Battle Arena 2.0: compute remaining time for active challenges
      let remainingMs = 0;
      let computedStatus = challenge.status;
      if (challenge.status === 'active') {
        remainingMs = Math.max(0, new Date(challenge.deadline).getTime() - Date.now());
        if (remainingMs <= 0) {
          computedStatus = 'expired';
        }
      }

      enrichedChallenges.push({
        ...challenge,
        participants: participantsWithProgress,
        durationHours: challenge.durationHours,
        remainingMs,
        computedStatus,
      });
    }

    return enrichedChallenges;
  }

  // ── AUTO-EXPIRY CRON ──────────────────────────────────────────────────
  // Battle Arena 2.0: Challenges that pass their deadline without verified
  // submissions are marked as "expired" (💀 Battle Lost).
  @Cron(CronExpression.EVERY_MINUTE)
  async expireOverdueChallenges() {
    // 1. Auto-accept pending reviews older than 24 hours
    const staleReviews = await this.prisma.challengeParticipant.findMany({
      where: {
        verificationStatus: 'pending_review',
        submittedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    for (const pr of staleReviews) {
      await this.prisma.challengeParticipant.update({
        where: { id: pr.id },
        data: { verificationStatus: 'verified' },
      });
      // Award XP
      const challenge = await this.prisma.challenge.findUnique({ where: { id: pr.challengeId } });
      if (challenge) {
        await this.updateXp(pr.userId, challenge.circleId, 30);
      }
      this.eventEmitter.emit('challenge.victory_accepted', { challengeId: pr.challengeId, participantId: pr.userId, challengeTitle: challenge?.title || '' });

      // Call helper to resolve if needed
      await this.checkAndResolveChallenge(pr.challengeId);
    }

    // 2. Expire overdue challenges
    const overdue = await this.prisma.challenge.findMany({
      where: {
        status: { in: ['active', 'pending'] },
        deadline: { lt: new Date() },
      },
    });

    for (const challenge of overdue) {
      if (challenge.status === 'pending') {
        await this.prisma.challenge.update({
          where: { id: challenge.id },
          data: { status: 'cancelled' },
        });
        this.eventEmitter.emit('challenge.cancelled', { challengeId: challenge.id, reason: 'expired_pending' });
      } else if (challenge.status === 'active') {
        // Call helper to resolve
        await this.checkAndResolveChallenge(challenge.id);
      }
    }

    if (overdue.length > 0) {
      console.log(`Processed ${overdue.length} overdue challenges.`);
    }
  }

  async clearHistory(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { participants: true },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const participant = challenge.participants.find(p => p.userId === userId);
    if (!participant && challenge.proposerId !== userId) {
      throw new ForbiddenException('Not a participant of this challenge');
    }

    if (participant) {
      // Soft hide for this user instead of hard deleting the entire battle
      await this.prisma.challengeParticipant.update({
        where: { id: participant.id },
        data: { status: 'hidden' },
      });
    }

    return { success: true };
  }
}

