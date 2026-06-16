import { PrismaService } from '../prisma/prisma.service';
import { CirclesService } from '../circles/circles.service';
import { SyncScreenTimeDto, SetThresholdDto } from './dto/screen-time.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class ScreenTimeService {
    private readonly prisma;
    private readonly circlesService;
    private readonly eventEmitter;
    private readonly lateNightCooldown;
    private readonly LATE_NIGHT_COOLDOWN_MS;
    constructor(prisma: PrismaService, circlesService: CirclesService, eventEmitter: EventEmitter2);
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
