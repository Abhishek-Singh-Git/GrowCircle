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
        if (!dto.participantIds.includes(proposerId)) {
            dto.participantIds.push(proposerId);
        }
        if (dto.participantIds.length < 2) {
            throw new common_1.BadRequestException('A challenge requires at least 2 participants');
        }
        for (const pId of dto.participantIds) {
            await this.circlesService.validateMembership(pId, dto.circleId);
        }
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
                const challenge = await this.prisma.challenge.update({
                    where: { id: challengeId },
                    data: { status: 'active' },
                    include: { participants: { select: { userId: true } } },
                });
                const participantIds = challenge.participants.map((p) => p.userId);
                this.eventEmitter.emit('challenge.activated', {
                    challengeId: challenge.id,
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
        const updated = await this.prisma.challengeParticipant.update({
            where: { id: participant.id },
            data: { manualProgress: { increment: 1 } },
        });
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
        if (resolvedChallenge.stakeType === 'points' && resolvedChallenge.stakePoints && resolvedChallenge.winnerId) {
            await this.prisma.gamificationProfile.update({
                where: { userId_circleId: { userId: resolvedChallenge.winnerId, circleId: challenge.circleId } },
                data: { totalXp: { increment: resolvedChallenge.stakePoints } },
            });
            const participants = await this.prisma.challengeParticipant.findMany({
                where: { challengeId, userId: { not: resolvedChallenge.winnerId } },
            });
            for (const participant of participants) {
                const profile = await this.prisma.gamificationProfile.findUnique({
                    where: { userId_circleId: { userId: participant.userId, circleId: challenge.circleId } },
                });
                if (profile) {
                    const newXp = Math.max(0, profile.totalXp - resolvedChallenge.stakePoints);
                    await this.prisma.gamificationProfile.update({
                        where: { userId_circleId: { userId: participant.userId, circleId: challenge.circleId } },
                        data: { totalXp: newXp },
                    });
                }
            }
        }
        this.eventEmitter.emit('challenge.resolved', { challenge: resolvedChallenge });
        return resolvedChallenge;
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
            enrichedChallenges.push({
                ...challenge,
                participants: participantsWithProgress,
            });
        }
        return enrichedChallenges;
    }
};
exports.ChallengesService = ChallengesService;
exports.ChallengesService = ChallengesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        circles_service_1.CirclesService,
        event_emitter_1.EventEmitter2])
], ChallengesService);
//# sourceMappingURL=challenges.service.js.map