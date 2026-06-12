"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChallengesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const circles_service_1 = require("../circles/circles.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const schedule_1 = require("@nestjs/schedule");
let ChallengesService = class ChallengesService {
    prisma;
    circlesService;
    eventEmitter;
    constructor(prisma, circlesService, eventEmitter) {
        this.prisma = prisma;
        this.circlesService = circlesService;
        this.eventEmitter = eventEmitter;
    }
    async createChallenge(proposerId, dto) {
        await this.circlesService.validateMembership(proposerId, dto.circleId);
        if (dto.participantIds.length < 1) {
            throw new common_1.BadRequestException('A challenge requires at least 1 participant');
        }
        for (const pId of dto.participantIds) {
            await this.circlesService.validateMembership(pId, dto.circleId);
        }
        const participantsData = dto.participantIds.map((userId) => ({
            user: { connect: { id: userId } },
            status: userId === proposerId ? 'accepted' : 'pending',
            acceptedAt: userId === proposerId ? new Date() : null,
        }));
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
    async respondToChallenge(userId, challengeId, accept) {
        const participant = await this.prisma.challengeParticipant.findUnique({
            where: { challengeId_userId: { challengeId, userId } },
            include: { challenge: true },
        });
        if (!participant) {
            throw new common_1.NotFoundException('Challenge or participant not found');
        }
        if (participant.status !== 'pending') {
            throw new common_1.BadRequestException(`You have already responded: ${participant.status}`);
        }
        const updatedParticipant = await this.prisma.challengeParticipant.update({
            where: { id: participant.id },
            data: {
                status: accept ? 'accepted' : 'rejected',
                acceptedAt: accept ? new Date() : null,
            },
        });
        if (!accept) {
            const remainingPending = await this.prisma.challengeParticipant.count({
                where: { challengeId, status: 'pending' },
            });
            const acceptedCount = await this.prisma.challengeParticipant.count({
                where: { challengeId, status: 'accepted' },
            });
            if (remainingPending === 0 && acceptedCount < 2) {
                await this.prisma.challenge.update({
                    where: { id: challengeId },
                    data: { status: 'cancelled' },
                });
                this.eventEmitter.emit('challenge.cancelled', { challengeId, reason: 'insufficient_participants' });
            }
        }
        else {
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
            const remainingPending = await this.prisma.challengeParticipant.count({
                where: { challengeId, status: 'pending' },
            });
            if (remainingPending === 0) {
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
                    participants: participantIds.map((id) => ({ userId: id })),
                });
            }
        }
        return updatedParticipant;
    }
    async incrementProgress(userId, challengeId) {
        const participant = await this.prisma.challengeParticipant.findUnique({
            where: { challengeId_userId: { challengeId, userId } },
            include: { challenge: true },
        });
        if (!participant) {
            throw new common_1.NotFoundException('Challenge or participant not found');
        }
        if (participant.challenge.status !== 'active') {
            throw new common_1.BadRequestException('Can only increment active challenges');
        }
        if (participant.lastProgressAt) {
            const hoursSinceLast = (Date.now() - participant.lastProgressAt.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLast < 24) {
                throw new common_1.BadRequestException(`You can only check-in once every 24 hours. Next check-in available in ${Math.ceil(24 - hoursSinceLast)}h.`);
            }
        }
        const updated = await this.prisma.challengeParticipant.update({
            where: { id: participant.id },
            data: {
                manualProgress: { increment: 1 },
                lastProgressAt: new Date(),
            },
        });
        this.eventEmitter.emit('challenge.progress_updated', {
            challengeId: participant.challenge.id,
            userId,
            progress: updated.manualProgress,
            total: participant.challenge.conditionTarget || 7
        });
        const target = participant.challenge.conditionTarget ? Number(participant.challenge.conditionTarget) : 7;
        if (updated.manualProgress >= target) {
            await this.resolveChallenge(userId, participant.challenge.id, {
                outcomeType: 'win',
                winnerId: userId
            });
        }
        return updated;
    }
    async submitVictory(userId, challengeId, dto) {
        const participant = await this.prisma.challengeParticipant.findUnique({
            where: { challengeId_userId: { challengeId, userId } },
            include: { challenge: true },
        });
        if (!participant) {
            throw new common_1.NotFoundException('Challenge or participant not found');
        }
        if (participant.challenge.status !== 'active') {
            throw new common_1.BadRequestException('Can only submit victory for active challenges');
        }
        if (participant.verificationStatus === 'verified') {
            throw new common_1.BadRequestException('You have already claimed victory for this challenge');
        }
        if (new Date() >= participant.challenge.deadline) {
            throw new common_1.BadRequestException('This challenge has expired. 💀 Battle Lost.');
        }
        const updated = await this.prisma.challengeParticipant.update({
            where: { id: participant.id },
            data: {
                proofText: dto.proofText,
                verificationStatus: 'pending_review',
                submittedAt: new Date(),
            },
        });
        this.eventEmitter.emit('challenge.victory_submitted', {
            challengeId,
            userId,
            proofText: dto.proofText,
            challengeTitle: participant.challenge.title,
        });
        return updated;
    }
    async checkAndResolveChallenge(challengeId) {
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
        const verifiedParticipants = challenge.participants.filter(p => p.verificationStatus === 'verified');
        const pendingReviewParticipants = challenge.participants.filter(p => p.verificationStatus === 'pending_review');
        const verifiedCount = verifiedParticipants.length;
        if (isPastDeadline) {
            if (pendingReviewParticipants.length > 0) {
                return;
            }
            await this.prisma.challengeParticipant.updateMany({
                where: {
                    challengeId,
                    verificationStatus: 'pending',
                },
                data: {
                    verificationStatus: 'expired',
                },
            });
            let outcomeType;
            let winnerId = null;
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
            }
            else if (verifiedCount === 1) {
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
            }
            else {
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
        }
        else {
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
                }
                else {
                    for (const p of verifiedParticipants) {
                        await this.incrementWin(p.userId, challenge.circleId);
                    }
                }
                this.eventEmitter.emit('challenge.resolved', { challengeId, outcomeType, winnerId });
            }
        }
    }
    async acceptVictory(reviewerId, challengeId, participantId) {
        const challenge = await this.prisma.challenge.findUnique({
            where: { id: challengeId },
            include: { participants: true },
        });
        if (!challenge)
            throw new common_1.NotFoundException('Challenge not found');
        const participant = challenge.participants.find(p => p.userId === participantId);
        if (!participant || participant.verificationStatus !== 'pending_review') {
            throw new common_1.BadRequestException('Participant is not pending review');
        }
        const isProposer = challenge.proposerId === reviewerId;
        const isOtherParticipant = challenge.participants.some(p => p.userId === reviewerId && p.userId !== participantId);
        if (!isProposer && !isOtherParticipant) {
            throw new common_1.ForbiddenException('You are not authorized to review this claim');
        }
        const updated = await this.prisma.challengeParticipant.update({
            where: { id: participant.id },
            data: { verificationStatus: 'verified' },
        });
        await this.updateXp(participantId, challenge.circleId, 30);
        this.eventEmitter.emit('challenge.victory_accepted', { challengeId, participantId, challengeTitle: challenge.title });
        await this.checkAndResolveChallenge(challengeId);
        return updated;
    }
    async rejectVictory(reviewerId, challengeId, participantId, reason) {
        const challenge = await this.prisma.challenge.findUnique({
            where: { id: challengeId },
            include: { participants: true },
        });
        if (!challenge)
            throw new common_1.NotFoundException('Challenge not found');
        const participant = challenge.participants.find(p => p.userId === participantId);
        if (!participant || participant.verificationStatus !== 'pending_review') {
            throw new common_1.BadRequestException('Participant is not pending review');
        }
        const isProposer = challenge.proposerId === reviewerId;
        const isOtherParticipant = challenge.participants.some(p => p.userId === reviewerId && p.userId !== participantId);
        if (!isProposer && !isOtherParticipant) {
            throw new common_1.ForbiddenException('You are not authorized to review this claim');
        }
        const updated = await this.prisma.challengeParticipant.update({
            where: { id: participant.id },
            data: { verificationStatus: 'rejected' },
        });
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
    async resolveChallenge(userId, challengeId, dto) {
        const challenge = await this.prisma.challenge.findUnique({
            where: { id: challengeId },
        });
        if (!challenge) {
            throw new common_1.NotFoundException('Challenge not found');
        }
        if (challenge.status !== 'active' && challenge.status !== 'pending_resolution') {
            throw new common_1.BadRequestException(`Cannot resolve a challenge in status: ${challenge.status}`);
        }
        const isParticipant = await this.prisma.challengeParticipant.findUnique({
            where: { challengeId_userId: { challengeId, userId } },
        });
        if (!isParticipant) {
            throw new common_1.ForbiddenException('Only participants can resolve this challenge');
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
        for (const participant of resolvedChallenge.participants) {
            await this.updateXp(participant.userId, challenge.circleId, 20);
        }
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
    async updateXp(userId, circleId, xp) {
        await this.prisma.gamificationProfile.update({
            where: { userId_circleId: { userId, circleId } },
            data: {
                totalXp: { increment: xp },
            },
        });
    }
    async incrementWin(userId, circleId) {
        await this.prisma.gamificationProfile.update({
            where: { userId_circleId: { userId, circleId } },
            data: { challengesWon: { increment: 1 } },
        });
    }
    async getChallenges(userId, circleId, status) {
        await this.circlesService.validateMembership(userId, circleId);
        const where = { circleId };
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
                    }
                    else if (challenge.conditionType === 'screen_time') {
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
                    }
                    else if (challenge.conditionType === 'custom') {
                        progress = participant.manualProgress || 0;
                    }
                    else {
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
            let remainingMs = 0;
            if (challenge.status === 'active') {
                remainingMs = Math.max(0, new Date(challenge.deadline).getTime() - Date.now());
            }
            enrichedChallenges.push({
                ...challenge,
                participants: participantsWithProgress,
                durationHours: challenge.durationHours,
                remainingMs,
            });
        }
        return enrichedChallenges;
    }
    async expireOverdueChallenges() {
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
            const challenge = await this.prisma.challenge.findUnique({ where: { id: pr.challengeId } });
            if (challenge) {
                await this.updateXp(pr.userId, challenge.circleId, 30);
            }
            this.eventEmitter.emit('challenge.victory_accepted', { challengeId: pr.challengeId, participantId: pr.userId, challengeTitle: challenge?.title || '' });
            await this.checkAndResolveChallenge(pr.challengeId);
        }
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
            }
            else if (challenge.status === 'active') {
                await this.checkAndResolveChallenge(challenge.id);
            }
        }
        if (overdue.length > 0) {
            console.log(`Processed ${overdue.length} overdue challenges.`);
        }
    }
    async clearHistory(userId, challengeId) {
        const participant = await this.prisma.challengeParticipant.findUnique({
            where: { challengeId_userId: { challengeId, userId } },
        });
        if (!participant) {
            throw new common_1.NotFoundException('Participant history not found');
        }
        await this.prisma.challengeParticipant.delete({
            where: { id: participant.id },
        });
        return { success: true };
    }
};
exports.ChallengesService = ChallengesService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChallengesService.prototype, "expireOverdueChallenges", null);
exports.ChallengesService = ChallengesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        circles_service_1.CirclesService,
        event_emitter_1.EventEmitter2])
], ChallengesService);
//# sourceMappingURL=challenges.service.js.map