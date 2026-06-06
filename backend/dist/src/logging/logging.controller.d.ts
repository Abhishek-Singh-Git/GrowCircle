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
        reactions: {
            id: string;
            createdAt: Date;
            userId: string;
            emoji: string;
            logId: string;
        }[];
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
    } | null>;
    getLog(req: {
        user: {
            id: string;
        };
    }, logId: string): Promise<{
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
                id: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            emoji: string;
            logId: string;
        })[];
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
    }>;
    addReaction(req: {
        user: {
            id: string;
        };
    }, logId: string, dto: CreateReactionDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
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
            id: string;
            name: string;
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
                targetValue: import("@prisma/client-runtime-utils").Decimal | null;
                id: string;
                name: string;
                goalType: string;
                targetUnit: string | null;
                category: string;
                categoryEmoji: string | null;
                isSensitive: boolean;
            };
            activityLogs: ({
                reactions: ({
                    user: {
                        id: string;
                        name: string;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    userId: string;
                    emoji: string;
                    logId: string;
                })[];
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
        })[];
    }[]>;
}
