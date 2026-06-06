export declare class CreateCircleDto {
    name: string;
    description?: string;
    timeoutEnabled?: boolean;
    timeoutPermissionType?: string;
    leaderboardVisibility?: string;
    maxStakeType?: string;
}
export declare class JoinCircleDto {
    code?: string;
    token?: string;
}
