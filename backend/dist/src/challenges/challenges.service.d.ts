import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import { CreateChallengeDto, ResolveChallengeDto, SubmitVictoryDto } from './dto/challenge.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class ChallengesService {
    private readonly prisma;
    private readonly circlesService;
    private readonly eventEmitter;
    constructor(prisma: PrismaService, circlesService: CirclesService, eventEmitter: EventEmitter2);
    createChallenge(proposerId: string, dto: CreateChallengeDto): Promise<{
        participants: ({
            user: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            userId: string;
            status: string;
            proofText: string | null;
            acceptedAt: Date | null;
            withdrawnAt: Date | null;
            manualProgress: import("@prisma/client-runtime-utils").Decimal;
            lastProgressAt: Date | null;
            verificationStatus: string;
            submittedAt: Date | null;
            challengeId: string;
        })[];
        proposer: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
    } & {
        circleId: string;
        id: string;
        createdAt: Date;
        status: string;
        title: string;
        conditionDescription: string;
        conditionType: string;
        conditionGoalId: string | null;
        conditionTarget: import("@prisma/client-runtime-utils").Decimal | null;
        stakeType: string;
        stakeDescription: string | null;
        stakePoints: number | null;
        proofRequired: boolean;
        durationHours: number;
        winnerId: string | null;
        outcomeType: string | null;
        tieBreakRule: string;
        deadline: Date;
        resolvedAt: Date | null;
        proposerId: string;
    }>;
    respondToChallenge(userId: string, challengeId: string, accept: boolean): Promise<{
        id: string;
        userId: string;
        status: string;
        proofText: string | null;
        acceptedAt: Date | null;
        withdrawnAt: Date | null;
        manualProgress: import("@prisma/client-runtime-utils").Decimal;
        lastProgressAt: Date | null;
        verificationStatus: string;
        submittedAt: Date | null;
        challengeId: string;
    }>;
    incrementProgress(userId: string, challengeId: string): Promise<{
        id: string;
        userId: string;
        status: string;
        proofText: string | null;
        acceptedAt: Date | null;
        withdrawnAt: Date | null;
        manualProgress: import("@prisma/client-runtime-utils").Decimal;
        lastProgressAt: Date | null;
        verificationStatus: string;
        submittedAt: Date | null;
        challengeId: string;
    }>;
    submitVictory(userId: string, challengeId: string, dto: SubmitVictoryDto): Promise<{
        id: string;
        userId: string;
        status: string;
        proofText: string | null;
        acceptedAt: Date | null;
        withdrawnAt: Date | null;
        manualProgress: import("@prisma/client-runtime-utils").Decimal;
        lastProgressAt: Date | null;
        verificationStatus: string;
        submittedAt: Date | null;
        challengeId: string;
    }>;
    checkAndResolveChallenge(challengeId: string): Promise<void>;
    acceptVictory(reviewerId: string, challengeId: string, participantId: string): Promise<{
        id: string;
        userId: string;
        status: string;
        proofText: string | null;
        acceptedAt: Date | null;
        withdrawnAt: Date | null;
        manualProgress: import("@prisma/client-runtime-utils").Decimal;
        lastProgressAt: Date | null;
        verificationStatus: string;
        submittedAt: Date | null;
        challengeId: string;
    }>;
    rejectVictory(reviewerId: string, challengeId: string, participantId: string, reason: string): Promise<{
        id: string;
        userId: string;
        status: string;
        proofText: string | null;
        acceptedAt: Date | null;
        withdrawnAt: Date | null;
        manualProgress: import("@prisma/client-runtime-utils").Decimal;
        lastProgressAt: Date | null;
        verificationStatus: string;
        submittedAt: Date | null;
        challengeId: string;
    }>;
    resolveChallenge(userId: string, challengeId: string, dto: ResolveChallengeDto): Promise<{
        participants: ({
            user: {
                id: string;
                name: string;
                createdAt: Date;
                email: string | null;
                phone: string | null;
                passwordHash: string;
                avatarUrl: string | null;
                bio: string | null;
                timezone: string;
                plan: string;
                accountStatus: string;
                ageVerifiedAt: Date | null;
                parentalConsentAt: Date | null;
                lastActiveAt: Date | null;
                deletedAt: Date | null;
                fcmToken: string | null;
                lastCronProcessedDate: string | null;
            };
        } & {
            id: string;
            userId: string;
            status: string;
            proofText: string | null;
            acceptedAt: Date | null;
            withdrawnAt: Date | null;
            manualProgress: import("@prisma/client-runtime-utils").Decimal;
            lastProgressAt: Date | null;
            verificationStatus: string;
            submittedAt: Date | null;
            challengeId: string;
        })[];
    } & {
        circleId: string;
        id: string;
        createdAt: Date;
        status: string;
        title: string;
        conditionDescription: string;
        conditionType: string;
        conditionGoalId: string | null;
        conditionTarget: import("@prisma/client-runtime-utils").Decimal | null;
        stakeType: string;
        stakeDescription: string | null;
        stakePoints: number | null;
        proofRequired: boolean;
        durationHours: number;
        winnerId: string | null;
        outcomeType: string | null;
        tieBreakRule: string;
        deadline: Date;
        resolvedAt: Date | null;
        proposerId: string;
    }>;
    private updateXp;
    private incrementWin;
    getChallenges(userId: string, circleId: string, status?: string): Promise<{
        participants: {
            progress: number;
            user: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
            id: string;
            userId: string;
            status: string;
            proofText: string | null;
            acceptedAt: Date | null;
            withdrawnAt: Date | null;
            manualProgress: import("@prisma/client-runtime-utils").Decimal;
            lastProgressAt: Date | null;
            verificationStatus: string;
            submittedAt: Date | null;
            challengeId: string;
        }[];
        durationHours: number;
        remainingMs: number;
        proposer: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        winner: {
            id: string;
            name: string;
            avatarUrl: string | null;
        } | null;
        circleId: string;
        id: string;
        createdAt: Date;
        status: string;
        title: string;
        conditionDescription: string;
        conditionType: string;
        conditionGoalId: string | null;
        conditionTarget: import("@prisma/client-runtime-utils").Decimal | null;
        stakeType: string;
        stakeDescription: string | null;
        stakePoints: number | null;
        proofRequired: boolean;
        winnerId: string | null;
        outcomeType: string | null;
        tieBreakRule: string;
        deadline: Date;
        resolvedAt: Date | null;
        proposerId: string;
    }[]>;
    expireOverdueChallenges(): Promise<void>;
    clearHistory(userId: string, challengeId: string): Promise<{
        success: boolean;
    }>;
}
