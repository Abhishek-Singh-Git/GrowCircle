import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/notification.dto';
export declare class NotificationsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    sendNotification(dto: CreateNotificationDto): Promise<{
        id: string;
        userId: string;
        type: string;
        sentAt: Date;
        title: string;
        body: string;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        isRead: boolean;
        readAt: Date | null;
        actionTakenAt: Date | null;
    } | null>;
    private dispatchPushNotification;
    markAsRead(userId: string, notificationId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    getNotifications(userId: string, page?: number, limit?: number): Promise<{
        items: {
            id: string;
            userId: string;
            type: string;
            sentAt: Date;
            title: string;
            body: string;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            isRead: boolean;
            readAt: Date | null;
            actionTakenAt: Date | null;
        }[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    handleChallengeProgress(payload: {
        challengeId: string;
        userId: string;
        progress: number;
        total: number;
    }): Promise<void>;
    handleNudgeSent(payload: {
        nudge: any;
    }): Promise<void>;
    handleChallengeCreated(payload: {
        challenge: any;
    }): Promise<void>;
    handleChallengeResolved(payload: {
        challenge: any;
    }): Promise<void>;
    handleChallengeActivated(payload: {
        challengeId: string;
        participants: any[];
    }): Promise<void>;
    handleChallengeAccepted(payload: {
        challenge: any;
        acceptorId: string;
    }): Promise<void>;
    handleLogCreated(payload: {
        log: any;
        userId: string;
        circleId: string;
        goalName: string;
        goalEmoji?: string;
    }): Promise<void>;
    handleChatMessageSent(payload: {
        message: any;
        circleId: string;
        threadId: string;
    }): Promise<void>;
    handleInterventionCreated(payload: {
        intervention: any;
        type: string;
        circleId: string;
    }): Promise<void>;
    handleLateNightDetected(payload: {
        userId: string;
        circleId: string;
    }): Promise<void>;
}
