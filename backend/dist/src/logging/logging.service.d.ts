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
            targetValue: Prisma.Decimal | null;
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
        targetValue: Prisma.Decimal | null;
        id: string;
        userId: string;
        status: string;
        circleId: string;
        date: Date;
        goalId: string;
        clientUuid: string;
        goalInstanceId: string;
        actualValue: Prisma.Decimal | null;
        completionFraction: Prisma.Decimal;
        notes: string | null;
        proofUrl: string | null;
        proofType: string | null;
        loggedAt: Date;
        editedAt: Date | null;
        isLateEdit: boolean;
    } | null>;
    getLog(userId: string, logId: string): Promise<{
        goal: {
            targetValue: Prisma.Decimal | null;
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
        targetValue: Prisma.Decimal | null;
        id: string;
        userId: string;
        status: string;
        circleId: string;
        date: Date;
        goalId: string;
        clientUuid: string;
        goalInstanceId: string;
        actualValue: Prisma.Decimal | null;
        completionFraction: Prisma.Decimal;
        notes: string | null;
        proofUrl: string | null;
        proofType: string | null;
        loggedAt: Date;
        editedAt: Date | null;
        isLateEdit: boolean;
        xpAwarded: number;
    }>;
    addReaction(userId: string, logId: string, emoji: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        emoji: string;
        logId: string;
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
                targetValue: Prisma.Decimal | null;
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
                targetValue: Prisma.Decimal | null;
                id: string;
                userId: string;
                status: string;
                circleId: string;
                date: Date;
                goalId: string;
                clientUuid: string;
                goalInstanceId: string;
                actualValue: Prisma.Decimal | null;
                completionFraction: Prisma.Decimal;
                notes: string | null;
                proofUrl: string | null;
                proofType: string | null;
                loggedAt: Date;
                editedAt: Date | null;
                isLateEdit: boolean;
                xpAwarded: number;
            })[];
        } & {
            targetValue: Prisma.Decimal | null;
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
    private calculateXp;
    private updateXp;
}
