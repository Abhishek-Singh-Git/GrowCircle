import { ScreenTimeService } from './screen-time.service';
import { SyncScreenTimeDto, UpdateHiddenAppsDto, SetThresholdDto } from './dto/screen-time.dto';
export declare class ScreenTimeController {
    private readonly screenTimeService;
    constructor(screenTimeService: ScreenTimeService);
    syncScreenTime(req: {
        user: {
            id: string;
        };
    }, dto: SyncScreenTimeDto): Promise<{
        syncedCount: number;
    }>;
    getScreenTime(req: {
        user: {
            id: string;
        };
    }, userId: string, date: string): Promise<{
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
    updateHiddenApps(req: {
        user: {
            id: string;
        };
    }, dto: UpdateHiddenAppsDto): Promise<{
        hiddenApps: string[];
    }>;
    setThreshold(req: {
        user: {
            id: string;
        };
    }, dto: SetThresholdDto): Promise<{
        circleId: string;
        id: string;
        createdAt: Date;
        userId: string;
        appPackage: string;
        thresholdSeconds: number;
        alertEnabled: boolean;
    }>;
    getThresholds(req: {
        user: {
            id: string;
        };
    }, circleId: string): Promise<{
        circleId: string;
        id: string;
        createdAt: Date;
        userId: string;
        appPackage: string;
        thresholdSeconds: number;
        alertEnabled: boolean;
    }[]>;
}
