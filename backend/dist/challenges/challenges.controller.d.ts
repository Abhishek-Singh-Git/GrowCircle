import { ChallengesService } from './challenges.service';
import { CreateChallengeDto, ResolveChallengeDto } from './dto/challenge.dto';
export declare class ChallengesController {
    private readonly challengesService;
    constructor(challengesService: ChallengesService);
    createChallenge(req: {
        user: {
            id: string;
        };
    }, dto: CreateChallengeDto): Promise<{
        participants: ({
            user: {
                name: string;
                id: string;
                avatarUrl: string | null;
            };
        } & {
            userId: string;
            id: string;
            status: string;
            acceptedAt: Date | null;
            withdrawnAt: Date | null;
            challengeId: string;
        })[];
        proposer: {
            name: string;
            id: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        status: string;
        circleId: string;
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
    getChallenges(req: {
        user: {
            id: string;
        };
    }, circleId: string, status?: string): Promise<({
        participants: ({
            user: {
                name: string;
                id: string;
                avatarUrl: string | null;
            };
        } & {
            userId: string;
            id: string;
            status: string;
            acceptedAt: Date | null;
            withdrawnAt: Date | null;
            challengeId: string;
        })[];
        proposer: {
            name: string;
            id: string;
            avatarUrl: string | null;
        };
        winner: {
            name: string;
            id: string;
            avatarUrl: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        status: string;
        circleId: string;
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
    })[]>;
    respondToChallenge(req: {
        user: {
            id: string;
        };
    }, challengeId: string, accept: boolean): Promise<{
        userId: string;
        id: string;
        status: string;
        acceptedAt: Date | null;
        withdrawnAt: Date | null;
        challengeId: string;
    }>;
    resolveChallenge(req: {
        user: {
            id: string;
        };
    }, challengeId: string, dto: ResolveChallengeDto): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        circleId: string;
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
}
