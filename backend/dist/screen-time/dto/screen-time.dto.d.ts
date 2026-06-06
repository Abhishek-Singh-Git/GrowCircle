declare class ScreenTimeSnapshotItem {
    appPackage: string;
    appDisplayName?: string;
    durationSeconds: number;
    openCount?: number;
}
export declare class SyncScreenTimeDto {
    date: string;
    snapshots: ScreenTimeSnapshotItem[];
    platform: string;
}
export declare class GetScreenTimeDto {
    userId: string;
    date: string;
}
export declare class UpdateHiddenAppsDto {
    appPackages: string[];
}
export declare class SetThresholdDto {
    circleId: string;
    appPackage: string;
    thresholdSeconds: number;
}
export {};
