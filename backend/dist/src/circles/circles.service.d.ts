import { PrismaService } from '../prisma/prisma.service';
import { CreateCircleDto, JoinCircleDto } from './dto/circles.dto';
export declare class CirclesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createCircle(userId: string, dto: CreateCircleDto): Promise<{
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
    joinCircle(userId: string, dto: JoinCircleDto): Promise<{
        id: string;
        name: string;
        memberCount: number;
    }>;
    getUserCircles(userId: string): Promise<{
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
    getCircleDetails(userId: string, circleId: string): Promise<{
        members: ({
            user: {
                id: string;
                name: string;
                avatarUrl: string | null;
                lastActiveAt: Date | null;
            };
        } & {
            circleId: string;
            id: string;
            userId: string;
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
    leaveCircle(userId: string, circleId: string): Promise<{
        message: string;
    }>;
    deleteCircle(userId: string, circleId: string): Promise<{
        message: string;
    }>;
    validateMembership(userId: string, circleId: string): Promise<{
        circleId: string;
        id: string;
        userId: string;
        role: string;
        status: string;
        joinedAt: Date;
        leftAt: Date | null;
        removedAt: Date | null;
        removedBy: string | null;
    }>;
    private generateInviteCode;
}
