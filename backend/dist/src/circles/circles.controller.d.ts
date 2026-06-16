import { CirclesService } from './circles.service';
import { CreateCircleDto, JoinCircleDto } from './dto/circles.dto';
export declare class CirclesController {
    private readonly circlesService;
    constructor(circlesService: CirclesService);
    create(req: {
        user: {
            id: string;
        };
    }, dto: CreateCircleDto): Promise<{
        inviteLink: string;
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        timeoutEnabled: boolean;
        timeoutPermissionType: string;
        leaderboardVisibility: string;
        maxStakeType: string;
        inviteCode: string;
        inviteLinkToken: string;
        inviteExpiresAt: Date | null;
        privacyLevel: string;
        maxDailyTimeoutsPerMember: number;
        disbandedAt: Date | null;
        canvasState: import("@prisma/client/runtime/client").JsonValue | null;
        ownerId: string;
    }>;
    join(req: {
        user: {
            id: string;
        };
    }, dto: JoinCircleDto): Promise<{
        id: string;
        name: string;
        memberCount: number;
    }>;
    listMyCircles(req: {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        name: string;
        description: string | null;
        inviteCode: string;
        role: string;
        memberCount: number;
        members: {
            id: string;
            name: string;
            avatarUrl: string | null;
            role: string;
            streak: number;
            xp: number;
            level: number;
        }[];
        joinedAt: Date;
    }[]>;
    getCircle(req: {
        user: {
            id: string;
        };
    }, circleId: string): Promise<{
        members: ({
            user: {
                id: string;
                name: string;
                avatarUrl: string | null;
                lastActiveAt: Date | null;
            };
        } & {
            id: string;
            userId: string;
            circleId: string;
            role: string;
            status: string;
            joinedAt: Date;
            leftAt: Date | null;
            removedAt: Date | null;
            removedBy: string | null;
        })[];
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        timeoutEnabled: boolean;
        timeoutPermissionType: string;
        leaderboardVisibility: string;
        maxStakeType: string;
        inviteCode: string;
        inviteLinkToken: string;
        inviteExpiresAt: Date | null;
        privacyLevel: string;
        maxDailyTimeoutsPerMember: number;
        disbandedAt: Date | null;
        canvasState: import("@prisma/client/runtime/client").JsonValue | null;
        ownerId: string;
    }>;
    getCanvas(req: {
        user: {
            id: string;
        };
    }, circleId: string): Promise<{
        strokes: any[];
    }>;
    deleteCircle(req: {
        user: {
            id: string;
        };
    }, circleId: string): Promise<{
        message: string;
    }>;
    leaveCircle(req: {
        user: {
            id: string;
        };
    }, circleId: string): Promise<{
        message: string;
    }>;
}
