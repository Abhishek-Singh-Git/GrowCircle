import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
export declare class AppController {
    private readonly appService;
    private readonly prisma;
    constructor(appService: AppService, prisma: PrismaService);
    getHello(): string;
    getAssetLinks(): {
        relation: string[];
        target: {
            namespace: string;
            package_name: string;
            sha256_cert_fingerprints: string[];
        };
    }[];
    updateUser(req: any, body: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        email: string | null;
        phone: string | null;
        passwordHash: string;
        avatarUrl: string | null;
        bio: string | null;
        timezone: string;
        plan: string;
        accountStatus: string;
        ageVerifiedAt: Date | null;
        parentalConsentAt: Date | null;
        lastActiveAt: Date | null;
        deletedAt: Date | null;
        fcmToken: string | null;
    }>;
    getPreferences(req: any): Promise<{
        updatedAt: Date;
        userId: string;
        notifyPartnerLog: boolean;
        notifyNudge: boolean;
        notifyFocusAlert: boolean;
        notifyTimeout: boolean;
        notifyChallenge: boolean;
        notifyDailyRecap: boolean;
        notifyDailyRecapTime: string;
        notifyEveningReminder: boolean;
        notifyEveningReminderTime: string;
        notifyBadge: boolean;
        notifyStreak: boolean;
        notifyChat: boolean;
        leaderboardVisible: boolean;
        scoresVisible: import("@prisma/client/runtime/client").JsonValue | null;
        darkMode: string;
        nudgeBlockedUsers: string[];
        shareLateNightActivity: boolean;
    }>;
    updatePreferences(req: any, body: any): Promise<{
        updatedAt: Date;
        userId: string;
        notifyPartnerLog: boolean;
        notifyNudge: boolean;
        notifyFocusAlert: boolean;
        notifyTimeout: boolean;
        notifyChallenge: boolean;
        notifyDailyRecap: boolean;
        notifyDailyRecapTime: string;
        notifyEveningReminder: boolean;
        notifyEveningReminderTime: string;
        notifyBadge: boolean;
        notifyStreak: boolean;
        notifyChat: boolean;
        leaderboardVisible: boolean;
        scoresVisible: import("@prisma/client/runtime/client").JsonValue | null;
        darkMode: string;
        nudgeBlockedUsers: string[];
        shareLateNightActivity: boolean;
    }>;
}
