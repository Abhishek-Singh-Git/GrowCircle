import { LoggingService } from './logging.service';
import { CreateLogDto, CreateReactionDto } from './dto/logging.dto';
export declare class LoggingController {
    private readonly loggingService;
    constructor(loggingService: LoggingService);
    createLog(req: {
        user: {
            id: string;
        };
    }, dto: CreateLogDto): Promise<{
        xpAwarded: number;
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
        reactions: {
            userId: string;
            id: string;
            createdAt: Date;
            emoji: string;
            logId: string;
        }[];
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
    } | null>;
    getLog(req: {
        user: {
            id: string;
        };
    }, logId: string): Promise<{
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
        mediaObjects: {
            id: string;
            createdAt: Date;
            durationSeconds: number | null;
            ownerUserId: string;
            associatedLogId: string | null;
            storageKey: string;
            cdnUrl: string;
            fileType: string;
            fileSizeBytes: bigint;
            uploadStatus: string;
            uploadedAt: Date | null;
        }[];
        reactions: ({
            user: {
                name: string;
                id: string;
            };
        } & {
            userId: string;
            id: string;
            createdAt: Date;
            emoji: string;
            logId: string;
        })[];
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
    }>;
    addReaction(req: {
        user: {
            id: string;
        };
    }, logId: string, dto: CreateReactionDto): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        emoji: string;
        logId: string;
    }>;
    removeReaction(req: {
        user: {
            id: string;
        };
    }, reactionId: string): Promise<{
        success: boolean;
    }>;
    getCircleFeed(req: {
        user: {
            id: string;
        };
    }, circleId: string, date?: string): Promise<{
        user: {
            name: string;
            id: string;
            avatarUrl: string | null;
            lastActiveAt: Date | null;
        };
        role: string;
        todaySummary: {
            totalGoals: number;
            completed: number;
            completionRate: number;
        };
        goalInstances: ({
            goal: {
                name: string;
                id: string;
                goalType: string;
                targetValue: import("@prisma/client-runtime-utils").Decimal | null;
                targetUnit: string | null;
                category: string;
                categoryEmoji: string | null;
                isSensitive: boolean;
            };
            activityLogs: ({
                reactions: ({
                    user: {
                        name: string;
                        id: string;
                    };
                } & {
                    userId: string;
                    id: string;
                    createdAt: Date;
                    emoji: string;
                    logId: string;
                })[];
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
        })[];
    }[]>;
}
