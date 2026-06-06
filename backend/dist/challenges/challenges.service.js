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
        });
        if (resolvedChallenge.stakeType === 'points' && resolvedChallenge.stakePoints && resolvedChallenge.winnerId) {
            await this.prisma.gamificationProfile.update({
                where: { userId_circleId: { userId: resolvedChallenge.winnerId, circleId: challenge.circleId } },
                data: { totalXp: { increment: resolvedChallenge.stakePoints } },
            });
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
};
exports.ChallengesService = ChallengesService;
exports.ChallengesService = ChallengesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        circles_service_1.CirclesService,
        event_emitter_1.EventEmitter2])
], ChallengesService);
//# sourceMappingURL=challenges.service.js.map