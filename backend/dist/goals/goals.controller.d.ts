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
        userId: string;
        updatedAt: Date | null;
        name: string;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        status: string;
        circleId: string;
        goalType: string;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        targetUnit: string | null;
        scheduleType: string;
        scheduleDays: number[];
        scheduleWeeklyFreq: number | null;
        scheduleStartDate: Date | null;
        scheduleEndDate: Date | null;
        category: string;
        categoryEmoji: string | null;
        difficultyWeight: number;
        requireProof: boolean;
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
        userId: string;
        updatedAt: Date | null;
        name: string;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        status: string;
        circleId: string;
        goalType: string;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        targetUnit: string | null;
        scheduleType: string;
        scheduleDays: number[];
        scheduleWeeklyFreq: number | null;
        scheduleStartDate: Date | null;
        scheduleEndDate: Date | null;
        category: string;
        categoryEmoji: string | null;
        difficultyWeight: number;
        requireProof: boolean;
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
                userId: string;
                id: string;
                status: string;
                circleId: string;
                targetValue: import("@prisma/client-runtime-utils").Decimal | null;
                date: Date;
                goalId: string;
                clientUuid: string;
                goalInstanceId: string;
                actualValue: import("@prisma/client-runtime-utils").Decimal | null;
                completionFraction: import("@prisma/client-runtime-utils").Decimal;
                notes: string | null;
                proofUrl: string | null;
                proofType: string | null;
                loggedAt: Date;
                editedAt: Date | null;
                isLateEdit: boolean;
                xpAwarded: number;
            }[];
        } & {
            userId: string;
            updatedAt: Date | null;
            id: string;
            createdAt: Date;
            status: string;
            circleId: string;
            targetValue: import("@prisma/client-runtime-utils").Decimal | null;
            date: Date;
            goalId: string;
        })[];
    } & {
        userId: string;
        updatedAt: Date | null;
        name: string;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        status: string;
        circleId: string;
        goalType: string;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        targetUnit: string | null;
        scheduleType: string;
        scheduleDays: number[];
        scheduleWeeklyFreq: number | null;
        scheduleStartDate: Date | null;
        scheduleEndDate: Date | null;
        category: string;
        categoryEmoji: string | null;
        difficultyWeight: number;
        requireProof: boolean;
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
        userId: string;
        updatedAt: Date | null;
        name: string;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        status: string;
        circleId: string;
        goalType: string;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        targetUnit: string | null;
        scheduleType: string;
        scheduleDays: number[];
        scheduleWeeklyFreq: number | null;
        scheduleStartDate: Date | null;
        scheduleEndDate: Date | null;
        category: string;
        categoryEmoji: string | null;
        difficultyWeight: number;
        requireProof: boolean;
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
        userId: string;
        updatedAt: Date | null;
        name: string;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        status: string;
        circleId: string;
        goalType: string;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        targetUnit: string | null;
        scheduleType: string;
        scheduleDays: number[];
        scheduleWeeklyFreq: number | null;
        scheduleStartDate: Date | null;
        scheduleEndDate: Date | null;
        category: string;
        categoryEmoji: string | null;
        difficultyWeight: number;
        requireProof: boolean;
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
        userId: string;
        updatedAt: Date | null;
        name: string;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        status: string;
        circleId: string;
        goalType: string;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        targetUnit: string | null;
        scheduleType: string;
        scheduleDays: number[];
        scheduleWeeklyFreq: number | null;
        scheduleStartDate: Date | null;
        scheduleEndDate: Date | null;
        category: string;
        categoryEmoji: string | null;
        difficultyWeight: number;
        requireProof: boolean;
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
        userId: string;
        updatedAt: Date | null;
        name: string;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        status: string;
        circleId: string;
        goalType: string;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        targetUnit: string | null;
        scheduleType: string;
        scheduleDays: number[];
        scheduleWeeklyFreq: number | null;
        scheduleStartDate: Date | null;
        scheduleEndDate: Date | null;
        category: string;
        categoryEmoji: string | null;
        difficultyWeight: number;
        requireProof: boolean;
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
            userId: string;
            updatedAt: Date | null;
            name: string;
            id: string;
            createdAt: Date;
            deletedAt: Date | null;
            status: string;
            circleId: string;
            goalType: string;
            targetValue: import("@prisma/client-runtime-utils").Decimal | null;
            targetUnit: string | null;
            scheduleType: string;
            scheduleDays: number[];
            scheduleWeeklyFreq: number | null;
            scheduleStartDate: Date | null;
            scheduleEndDate: Date | null;
            category: string;
            categoryEmoji: string | null;
            difficultyWeight: number;
            requireProof: boolean;
            isSensitive: boolean;
            pausedAt: Date | null;
            archivedAt: Date | null;
            templateSourceId: string | null;
        };
        activityLogs: ({
            reactions: {
                userId: string;
                id: string;
                createdAt: Date;
                emoji: string;
                logId: string;
            }[];
        } & {
            userId: string;
            id: string;
            status: string;
            circleId: string;
            targetValue: import("@prisma/client-runtime-utils").Decimal | null;
            date: Date;
            goalId: string;
            clientUuid: string;
            goalInstanceId: string;
            actualValue: import("@prisma/client-runtime-utils").Decimal | null;
            completionFraction: import("@prisma/client-runtime-utils").Decimal;
            notes: string | null;
            proofUrl: string | null;
            proofType: string | null;
            loggedAt: Date;
            editedAt: Date | null;
            isLateEdit: boolean;
            xpAwarded: number;
        })[];
    } & {
        userId: string;
        updatedAt: Date | null;
        id: string;
        createdAt: Date;
        status: string;
        circleId: string;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        date: Date;
        goalId: string;
    })[]>;
}
