import { GoalsService } from './goals.service';
import { CreateGoalDto, UpdateGoalDto } from './dto/goals.dto';
export declare class GoalsController {
    private readonly goalsService;
    constructor(goalsService: GoalsService);
    createGoal(req: {
        user: {
            id: string;
        };
    }, dto: CreateGoalDto): Promise<{
        id: string;
        name: string;
        category: string;
        createdAt: Date;
        updatedAt: Date | null;
        goalType: string;
        scheduleType: string;
        requireProof: boolean;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        targetUnit: string | null;
        deletedAt: Date | null;
        userId: string;
        circleId: string;
        status: string;
        scheduleDays: number[];
        scheduleWeeklyFreq: number | null;
        scheduleStartDate: Date | null;
        scheduleEndDate: Date | null;
        categoryEmoji: string | null;
        difficultyWeight: number;
        isSensitive: boolean;
        pausedAt: Date | null;
        archivedAt: Date | null;
        templateSourceId: string | null;
    }>;
    getGoals(req: {
        user: {
            id: string;
        };
    }, circleId: string, status?: string): Promise<({
        milestones: {
            id: string;
            createdAt: Date;
            targetValue: import("@prisma/client-runtime-utils").Decimal | null;
            goalId: string;
            orderIndex: number;
            label: string;
        }[];
    } & {
        id: string;
        name: string;
        category: string;
        createdAt: Date;
        updatedAt: Date | null;
        goalType: string;
        scheduleType: string;
        requireProof: boolean;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        targetUnit: string | null;
        deletedAt: Date | null;
        userId: string;
        circleId: string;
        status: string;
        scheduleDays: number[];
        scheduleWeeklyFreq: number | null;
        scheduleStartDate: Date | null;
        scheduleEndDate: Date | null;
        categoryEmoji: string | null;
        difficultyWeight: number;
        isSensitive: boolean;
        pausedAt: Date | null;
        archivedAt: Date | null;
        templateSourceId: string | null;
    })[]>;
    getGoal(req: {
        user: {
            id: string;
        };
    }, goalId: string): Promise<{
        milestones: {
            id: string;
            createdAt: Date;
            targetValue: import("@prisma/client-runtime-utils").Decimal | null;
            goalId: string;
            orderIndex: number;
            label: string;
        }[];
        instances: ({
            activityLogs: {
                id: string;
                targetValue: import("@prisma/client-runtime-utils").Decimal | null;
                userId: string;
                circleId: string;
                status: string;
                date: Date;
                goalId: string;
                clientUuid: string;
                goalInstanceId: string;
                actualValue: import("@prisma/client-runtime-utils").Decimal | null;
                completionFraction: import("@prisma/client-runtime-utils").Decimal;
                proofUrl: string | null;
                proofType: string | null;
                notes: string | null;
                loggedAt: Date;
                editedAt: Date | null;
                isLateEdit: boolean;
                xpAwarded: number;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date | null;
            targetValue: import("@prisma/client-runtime-utils").Decimal | null;
            userId: string;
            circleId: string;
            status: string;
            expiresAt: Date | null;
            date: Date;
            goalId: string;
        })[];
    } & {
        id: string;
        name: string;
        category: string;
        createdAt: Date;
        updatedAt: Date | null;
        goalType: string;
        scheduleType: string;
        requireProof: boolean;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        targetUnit: string | null;
        deletedAt: Date | null;
        userId: string;
        circleId: string;
        status: string;
        scheduleDays: number[];
        scheduleWeeklyFreq: number | null;
        scheduleStartDate: Date | null;
        scheduleEndDate: Date | null;
        categoryEmoji: string | null;
        difficultyWeight: number;
        isSensitive: boolean;
        pausedAt: Date | null;
        archivedAt: Date | null;
        templateSourceId: string | null;
    }>;
    updateGoal(req: {
        user: {
            id: string;
        };
    }, goalId: string, dto: UpdateGoalDto): Promise<{
        id: string;
        name: string;
        category: string;
        createdAt: Date;
        updatedAt: Date | null;
        goalType: string;
        scheduleType: string;
        requireProof: boolean;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        targetUnit: string | null;
        deletedAt: Date | null;
        userId: string;
        circleId: string;
        status: string;
        scheduleDays: number[];
        scheduleWeeklyFreq: number | null;
        scheduleStartDate: Date | null;
        scheduleEndDate: Date | null;
        categoryEmoji: string | null;
        difficultyWeight: number;
        isSensitive: boolean;
        pausedAt: Date | null;
        archivedAt: Date | null;
        templateSourceId: string | null;
    }>;
    deleteGoal(req: {
        user: {
            id: string;
        };
    }, goalId: string): Promise<{
        id: string;
        name: string;
        category: string;
        createdAt: Date;
        updatedAt: Date | null;
        goalType: string;
        scheduleType: string;
        requireProof: boolean;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        targetUnit: string | null;
        deletedAt: Date | null;
        userId: string;
        circleId: string;
        status: string;
        scheduleDays: number[];
        scheduleWeeklyFreq: number | null;
        scheduleStartDate: Date | null;
        scheduleEndDate: Date | null;
        categoryEmoji: string | null;
        difficultyWeight: number;
        isSensitive: boolean;
        pausedAt: Date | null;
        archivedAt: Date | null;
        templateSourceId: string | null;
    }>;
    pauseGoal(req: {
        user: {
            id: string;
        };
    }, goalId: string): Promise<{
        id: string;
        name: string;
        category: string;
        createdAt: Date;
        updatedAt: Date | null;
        goalType: string;
        scheduleType: string;
        requireProof: boolean;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        targetUnit: string | null;
        deletedAt: Date | null;
        userId: string;
        circleId: string;
        status: string;
        scheduleDays: number[];
        scheduleWeeklyFreq: number | null;
        scheduleStartDate: Date | null;
        scheduleEndDate: Date | null;
        categoryEmoji: string | null;
        difficultyWeight: number;
        isSensitive: boolean;
        pausedAt: Date | null;
        archivedAt: Date | null;
        templateSourceId: string | null;
    }>;
    archiveGoal(req: {
        user: {
            id: string;
        };
    }, goalId: string): Promise<{
        id: string;
        name: string;
        category: string;
        createdAt: Date;
        updatedAt: Date | null;
        goalType: string;
        scheduleType: string;
        requireProof: boolean;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        targetUnit: string | null;
        deletedAt: Date | null;
        userId: string;
        circleId: string;
        status: string;
        scheduleDays: number[];
        scheduleWeeklyFreq: number | null;
        scheduleStartDate: Date | null;
        scheduleEndDate: Date | null;
        categoryEmoji: string | null;
        difficultyWeight: number;
        isSensitive: boolean;
        pausedAt: Date | null;
        archivedAt: Date | null;
        templateSourceId: string | null;
    }>;
    getTodayInstances(req: {
        user: {
            id: string;
        };
    }, circleId: string): Promise<({
        goal: {
            id: string;
            name: string;
            category: string;
            createdAt: Date;
            updatedAt: Date | null;
            goalType: string;
            scheduleType: string;
            requireProof: boolean;
            targetValue: import("@prisma/client-runtime-utils").Decimal | null;
            targetUnit: string | null;
            deletedAt: Date | null;
            userId: string;
            circleId: string;
            status: string;
            scheduleDays: number[];
            scheduleWeeklyFreq: number | null;
            scheduleStartDate: Date | null;
            scheduleEndDate: Date | null;
            categoryEmoji: string | null;
            difficultyWeight: number;
            isSensitive: boolean;
            pausedAt: Date | null;
            archivedAt: Date | null;
            templateSourceId: string | null;
        };
        activityLogs: ({
            reactions: {
                id: string;
                createdAt: Date;
                userId: string;
                logId: string;
                emoji: string;
            }[];
        } & {
            id: string;
            targetValue: import("@prisma/client-runtime-utils").Decimal | null;
            userId: string;
            circleId: string;
            status: string;
            date: Date;
            goalId: string;
            clientUuid: string;
            goalInstanceId: string;
            actualValue: import("@prisma/client-runtime-utils").Decimal | null;
            completionFraction: import("@prisma/client-runtime-utils").Decimal;
            proofUrl: string | null;
            proofType: string | null;
            notes: string | null;
            loggedAt: Date;
            editedAt: Date | null;
            isLateEdit: boolean;
            xpAwarded: number;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date | null;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        userId: string;
        circleId: string;
        status: string;
        expiresAt: Date | null;
        date: Date;
        goalId: string;
    })[]>;
}
