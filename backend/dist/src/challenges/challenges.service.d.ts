import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import { CreateChallengeDto, ResolveChallengeDto } from './dto/challenge.dto';
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
            acceptedAt: Date | null;
            withdrawnAt: Date | null;
            manualProgress: number;
            challengeId: string;
        })[];
        proposer: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        circleId: string;
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
        deadline: Date;
        winnerId: string | null;
        outcomeType: string | null;
        tieBreakRule: string;
        resolvedAt: Date | null;
        proposerId: string;
    }>;
    respondToChallenge(userId: string, challengeId: string, accept: boolean): Promise<{
        id: string;
        userId: string;
        status: string;
        acceptedAt: Date | null;
        withdrawnAt: Date | null;
        manualProgress: number;
        challengeId: string;
    }>;
    incrementProgress(userId: string, challengeId: string): Promise<{
        id: string;
        userId: string;
        status: string;
        acceptedAt: Date | null;
        withdrawnAt: Date | null;
        manualProgress: number;
        challengeId: string;
    }>;
    resolveChallenge(userId: string, challengeId: string, dto: ResolveChallengeDto): Promise<{
        id: string;
        createdAt: Date;
        circleId: string;
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
        deadline: Date;
        winnerId: string | null;
        outcomeType: string | null;
        tieBreakRule: string;
        resolvedAt: Date | null;
        proposerId: string;
    }>;
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
            acceptedAt: Date | null;
            withdrawnAt: Date | null;
            manualProgress: number;
            challengeId: string;
        }[];
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
        id: string;
        createdAt: Date;
        circleId: string;
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
        deadline: Date;
        winnerId: string | null;
        outcomeType: string | null;
        tieBreakRule: string;
        resolvedAt: Date | null;
        proposerId: string;
    }[]>;
}
