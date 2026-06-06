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
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        id: string;
        name: string;
        createdAt: Date;
        deletedAt: Date | null;
        userId: string;
        updatedAt: Date | null;
        status: string;
        circleId: string;
        goalType: string;
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
            targetValue: import("@prisma/client-runtime-utils").Decimal | null;
            id: string;
            createdAt: Date;
            goalId: string;
            orderIndex: number;
            label: string;
        }[];
    } & {
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        id: string;
        name: string;
        createdAt: Date;
        deletedAt: Date | null;
        userId: string;
        updatedAt: Date | null;
        status: string;
        circleId: string;
        goalType: string;
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
            targetValue: import("@prisma/client-runtime-utils").Decimal | null;
            id: string;
            createdAt: Date;
            goalId: string;
            orderIndex: number;
            label: string;
        }[];
        instances: ({
            activityLogs: {
                targetValue: import("@prisma/client-runtime-utils").Decimal | null;
                id: string;
                userId: string;
                status: string;
                circleId: string;
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
            targetValue: import("@prisma/client-runtime-utils").Decimal | null;
            id: string;
            createdAt: Date;
            userId: string;
            updatedAt: Date | null;
            status: string;
            circleId: string;
            date: Date;
            goalId: string;
        })[];
    } & {
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        id: string;
        name: string;
        createdAt: Date;
        deletedAt: Date | null;
        userId: string;
        updatedAt: Date | null;
        status: string;
        circleId: string;
        goalType: string;
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
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        id: string;
        name: string;
        createdAt: Date;
        deletedAt: Date | null;
        userId: string;
        updatedAt: Date | null;
        status: string;
        circleId: string;
        goalType: string;
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
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        id: string;
        name: string;
        createdAt: Date;
        deletedAt: Date | null;
        userId: string;
        updatedAt: Date | null;
        status: string;
        circleId: string;
        goalType: string;
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
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        id: string;
        name: string;
        createdAt: Date;
        deletedAt: Date | null;
        userId: string;
        updatedAt: Date | null;
        status: string;
        circleId: string;
        goalType: string;
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
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        id: string;
        name: string;
        createdAt: Date;
        deletedAt: Date | null;
        userId: string;
        updatedAt: Date | null;
        status: string;
        circleId: string;
        goalType: string;
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
            targetValue: import("@prisma/client-runtime-utils").Decimal | null;
            id: string;
            name: string;
            createdAt: Date;
            deletedAt: Date | null;
            userId: string;
            updatedAt: Date | null;
            status: string;
            circleId: string;
            goalType: string;
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
                id: string;
                createdAt: Date;
                userId: string;
                emoji: string;
                logId: string;
            }[];
        } & {
            targetValue: import("@prisma/client-runtime-utils").Decimal | null;
            id: string;
            userId: string;
            status: string;
            circleId: string;
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
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        id: string;
        createdAt: Date;
        userId: string;
        updatedAt: Date | null;
        status: string;
        circleId: string;
        date: Date;
        goalId: string;
    })[]>;
}
