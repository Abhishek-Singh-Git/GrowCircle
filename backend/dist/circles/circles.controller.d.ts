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
        name: string;
        id: string;
        createdAt: Date;
        description: string | null;
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
        role: string;
        memberCount: number;
        members: {
            id: string;
            name: string;
            avatarUrl: string | null;
            role: string;
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
                name: string;
                id: string;
                avatarUrl: string | null;
                lastActiveAt: Date | null;
            };
        } & {
            userId: string;
            id: string;
            role: string;
            status: string;
            joinedAt: Date;
            leftAt: Date | null;
            removedAt: Date | null;
            circleId: string;
            removedBy: string | null;
        })[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        description: string | null;
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
        ownerId: string;
    }>;
}
