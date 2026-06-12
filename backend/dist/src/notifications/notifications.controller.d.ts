import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getNotifications(req: {
        user: {
            id: string;
        };
    }, page?: string, limit?: string): Promise<{
        items: {
            id: string;
            userId: string;
            title: string;
            type: string;
            sentAt: Date;
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
    markAsRead(req: {
        user: {
            id: string;
        };
    }, notificationId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
