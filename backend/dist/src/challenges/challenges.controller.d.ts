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
    getChallenges(req: {
        user: {
            id: string;
        };
    }, circleId: string, status?: string): Promise<{
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
    respondToChallenge(req: {
        user: {
            id: string;
        };
    }, challengeId: string, accept: boolean): Promise<{
        id: string;
        userId: string;
        status: string;
        acceptedAt: Date | null;
        withdrawnAt: Date | null;
        manualProgress: number;
        challengeId: string;
    }>;
    incrementProgress(req: {
        user: {
            id: string;
        };
    }, challengeId: string): Promise<{
        id: string;
        userId: string;
        status: string;
        acceptedAt: Date | null;
        withdrawnAt: Date | null;
        manualProgress: number;
        challengeId: string;
    }>;
    resolveChallenge(req: {
        user: {
            id: string;
        };
    }, challengeId: string, dto: ResolveChallengeDto): Promise<{
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
}
