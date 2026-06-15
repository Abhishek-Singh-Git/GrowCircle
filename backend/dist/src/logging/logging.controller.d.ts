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
            circleId: string;
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
        reactions: {
            id: string;
            createdAt: Date;
            userId: string;
            emoji: string;
            logId: string;
        }[];
        circleId: string;
        goalInstanceId: string;
        id: string;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        userId: string;
        status: string;
        date: Date;
        goalId: string;
        clientUuid: string;
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
            circleId: string;
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
        circleId: string;
        goalInstanceId: string;
        id: string;
        targetValue: import("@prisma/client-runtime-utils").Decimal | null;
        userId: string;
        status: string;
        date: Date;
        goalId: string;
        clientUuid: string;
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
                id: string;
                name: string;
                category: string;
                goalType: string;
                targetValue: import("@prisma/client-runtime-utils").Decimal | null;
                targetUnit: string | null;
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
                circleId: string;
                goalInstanceId: string;
                id: string;
                targetValue: import("@prisma/client-runtime-utils").Decimal | null;
                userId: string;
                status: string;
                date: Date;
                goalId: string;
                clientUuid: string;
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
            circleId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date | null;
            targetValue: import("@prisma/client-runtime-utils").Decimal | null;
            userId: string;
            status: string;
            expiresAt: Date | null;
            date: Date;
            goalId: string;
        })[];
        streak: number;
        xp: number;
    }[]>;
}
