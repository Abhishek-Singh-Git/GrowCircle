import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import { SyncScreenTimeDto, SetThresholdDto } from './dto/screen-time.dto';
export declare class ScreenTimeService {
    private readonly prisma;
    private readonly circlesService;
    constructor(prisma: PrismaService, circlesService: CirclesService);
    syncScreenTime(userId: string, dto: SyncScreenTimeDto): Promise<{
        syncedCount: number;
    }>;
    getScreenTime(requesterId: string, targetUserId: string, date: string): Promise<{
        date: string;
        totalSeconds: number;
        unlocks: number;
        weeklyTrend: any[];
        apps: {
            appPackage: string;
            appDisplayName: string | null;
            durationSeconds: number;
            openCount: number | null;
        }[];
        hiddenCount: number;
    }>;
    updateHiddenApps(userId: string, appPackages: string[]): Promise<{
        hiddenApps: string[];
    }>;
    setThreshold(userId: string, dto: SetThresholdDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        circleId: string;
        appPackage: string;
        thresholdSeconds: number;
        alertEnabled: boolean;
    }>;
    getThresholds(userId: string, circleId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        circleId: string;
        appPackage: string;
        thresholdSeconds: number;
        alertEnabled: boolean;
    }[]>;
    private checkThresholds;
}
