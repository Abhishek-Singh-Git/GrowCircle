import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import { CreateLogDto } from './dto/logging.dto';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class LoggingService {
    private readonly prisma;
    private readonly circlesService;
    private readonly eventEmitter;
    constructor(prisma: PrismaService, circlesService: CirclesService, eventEmitter: EventEmitter2);
    createLog(userId: string, dto: CreateLogDto): Promise<{
        xpAwarded: number;
        goal: {
            id: string;
            name: string;
            category: string;
            createdAt: Date;
            updatedAt: Date | null;
            goalType: string;
            scheduleType: string;
            requireProof: boolean;
            targetValue: Prisma.Decimal | null;
            targetUnit: string | null;
            deletedAt: Date | null;
            userId: string;
            status: string;
            circleId: string;
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
            logId: string;
            emoji: string;
        }[];
        id: string;
        targetValue: Prisma.Decimal | null;
        userId: string;
        status: string;
        circleId: string;
        date: Date;
        goalId: string;
        clientUuid: string;
        goalInstanceId: string;
        actualValue: Prisma.Decimal | null;
        completionFraction: Prisma.Decimal;
        proofUrl: string | null;
        proofType: string | null;
        notes: string | null;
        loggedAt: Date;
        editedAt: Date | null;
        isLateEdit: boolean;
    } | null>;
    getLog(userId: string, logId: string): Promise<{
        goal: {
            id: string;
            name: string;
            category: string;
            createdAt: Date;
            updatedAt: Date | null;
            goalType: string;
            scheduleType: string;
            requireProof: boolean;
            targetValue: Prisma.Decimal | null;
            targetUnit: string | null;
            deletedAt: Date | null;
            userId: string;
            status: string;
            circleId: string;
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
            ownerUserId: string;
            associatedLogId: string | null;
            storageKey: string;
            cdnUrl: string;
            fileType: string;
            fileSizeBytes: bigint;
            durationSeconds: number | null;
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
            logId: string;
            emoji: string;
        })[];
    } & {
        id: string;
        targetValue: Prisma.Decimal | null;
        userId: string;
        status: string;
        circleId: string;
        date: Date;
        goalId: string;
        clientUuid: string;
        goalInstanceId: string;
        actualValue: Prisma.Decimal | null;
        completionFraction: Prisma.Decimal;
        proofUrl: string | null;
        proofType: string | null;
        notes: string | null;
        loggedAt: Date;
        editedAt: Date | null;
        isLateEdit: boolean;
        xpAwarded: number;
    }>;
    addReaction(userId: string, logId: string, emoji: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        logId: string;
        emoji: string;
    }>;
    removeReaction(userId: string, reactionId: string): Promise<{
        success: boolean;
    }>;
    getCircleFeed(userId: string, circleId: string, date?: string): Promise<{
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
                targetValue: Prisma.Decimal | null;
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
                    logId: string;
                    emoji: string;
                })[];
            } & {
                id: string;
                targetValue: Prisma.Decimal | null;
                userId: string;
                status: string;
                circleId: string;
                date: Date;
                goalId: string;
                clientUuid: string;
                goalInstanceId: string;
                actualValue: Prisma.Decimal | null;
                completionFraction: Prisma.Decimal;
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
            targetValue: Prisma.Decimal | null;
            userId: string;
            status: string;
            circleId: string;
            date: Date;
            goalId: string;
        })[];
    }[]>;
    private calculateXp;
    private updateXp;
}
