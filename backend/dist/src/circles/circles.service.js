"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CirclesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const uuid_1 = require("uuid");
const crypto = __importStar(require("crypto"));
let CirclesService = class CirclesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCircle(userId, dto) {
        const inviteCode = this.generateInviteCode();
        const inviteLinkToken = (0, uuid_1.v4)();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const circle = await this.prisma.circle.create({
            data: {
                name: dto.name,
                description: dto.description,
                ownerId: userId,
                inviteCode,
                inviteLinkToken,
                inviteExpiresAt: expiresAt,
                timeoutEnabled: dto.timeoutEnabled ?? true,
                timeoutPermissionType: dto.timeoutPermissionType ?? 'mutual',
                leaderboardVisibility: dto.leaderboardVisibility ?? 'all_members',
                maxStakeType: dto.maxStakeType ?? 'points_only',
            },
        });
        await this.prisma.circleMember.create({
            data: {
                circleId: circle.id,
                userId,
                role: 'owner',
                status: 'active',
            },
        });
        await this.prisma.gamificationProfile.create({
            data: {
                userId,
                circleId: circle.id,
            },
        });
        return {
            ...circle,
            inviteLink: `growcircle://join/${inviteLinkToken}`,
        };
    }
    async joinCircle(userId, dto) {
        if (!dto.code && !dto.token) {
            throw new common_1.BadRequestException('Invite code or token is required');
        }
        const circle = await this.prisma.circle.findFirst({
            where: {
                OR: [
                    ...(dto.code ? [{ inviteCode: dto.code }] : []),
                    ...(dto.token ? [{ inviteLinkToken: dto.token }] : []),
                ],
                disbandedAt: null,
            },
            include: {
                members: { where: { status: 'active' } },
            },
        });
        if (!circle) {
            throw new common_1.NotFoundException('Invalid invite code or link');
        }
        if (circle.inviteExpiresAt && circle.inviteExpiresAt < new Date()) {
            throw new common_1.BadRequestException('Invite link has expired. Ask the circle owner to regenerate.');
        }
        const existingMember = circle.members.find((m) => m.userId === userId);
        if (existingMember) {
            throw new common_1.ConflictException('You are already a member of this circle');
        }
        if (circle.members.length >= 10) {
            throw new common_1.BadRequestException('Circle is full (maximum 10 members)');
        }
        await this.prisma.circleMember.upsert({
            where: { circleId_userId: { circleId: circle.id, userId } },
            create: {
                circleId: circle.id,
                userId,
                role: 'member',
                status: 'active',
            },
            update: {
                status: 'active',
                role: 'member',
                joinedAt: new Date(),
                leftAt: null,
                removedAt: null,
            },
        });
        await this.prisma.gamificationProfile.upsert({
            where: { userId_circleId: { userId, circleId: circle.id } },
            create: {
                userId,
                circleId: circle.id,
            },
            update: {
                updatedAt: new Date(),
            },
        });
        const groupThread = await this.prisma.chatThread.findFirst({
            where: { circleId: circle.id, threadType: 'group' },
        });
        if (groupThread) {
            await this.prisma.chatThreadParticipant.upsert({
                where: { threadId_userId: { threadId: groupThread.id, userId } },
                create: {
                    threadId: groupThread.id,
                    userId,
                },
                update: {
                    clearedAt: null,
                    lastReadAt: null,
                },
            });
        }
        return {
            id: circle.id,
            name: circle.name,
            memberCount: circle.members.length + 1,
        };
    }
    async getUserCircles(userId) {
        const memberships = await this.prisma.circleMember.findMany({
            where: { userId, status: 'active' },
            include: {
                circle: {
                    include: {
                        members: {
                            where: { status: 'active' },
                            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
                        },
                    },
                },
            },
        });
        const results = [];
        for (const m of memberships) {
            const enrichedMembers = [];
            for (const mem of m.circle.members) {
                const profile = await this.prisma.gamificationProfile.findUnique({
                    where: { userId_circleId: { userId: mem.user.id, circleId: m.circle.id } },
                });
                enrichedMembers.push({
                    id: mem.user.id,
                    name: mem.user.name,
                    avatarUrl: mem.user.avatarUrl,
                    role: mem.role,
                    streak: profile?.currentStreak || 0,
                    xp: profile?.totalXp || 0,
                    level: profile?.currentLevel || 0,
                });
            }
            results.push({
                id: m.circle.id,
                name: m.circle.name,
                description: m.circle.description,
                inviteCode: m.circle.inviteCode,
                role: m.role,
                memberCount: m.circle.members.length,
                members: enrichedMembers,
                joinedAt: m.joinedAt,
            });
        }
        return results;
    }
    async getCircleDetails(userId, circleId) {
        await this.validateMembership(userId, circleId);
        const circle = await this.prisma.circle.findUnique({
            where: { id: circleId },
            include: {
                members: {
                    where: { status: 'active' },
                    include: {
                        user: {
                            select: { id: true, name: true, avatarUrl: true, lastActiveAt: true },
                        },
                    },
                },
            },
        });
        if (!circle)
            throw new common_1.NotFoundException('Circle not found');
        return circle;
    }
    async leaveCircle(userId, circleId) {
        const membership = await this.validateMembership(userId, circleId);
        if (membership.role === 'owner') {
            throw new common_1.BadRequestException('As the owner, you cannot leave the circle. Delete the circle instead.');
        }
        await this.prisma.circleMember.update({
            where: { circleId_userId: { circleId, userId } },
            data: { status: 'inactive' },
        });
        return { message: 'You have left the circle.' };
    }
    async deleteCircle(userId, circleId) {
        const membership = await this.validateMembership(userId, circleId);
        if (membership.role !== 'owner') {
            throw new common_1.ForbiddenException('Only the circle owner can delete the circle.');
        }
        await this.prisma.circle.update({
            where: { id: circleId },
            data: { disbandedAt: new Date() },
        });
        await this.prisma.circleMember.updateMany({
            where: { circleId },
            data: { status: 'inactive', leftAt: new Date() },
        });
        return { message: 'Circle has been deleted.' };
    }
    async validateMembership(userId, circleId) {
        const membership = await this.prisma.circleMember.findUnique({
            where: {
                circleId_userId: { circleId, userId },
            },
        });
        if (!membership || membership.status !== 'active') {
            throw new common_1.ForbiddenException('You are not a member of this circle');
        }
        return membership;
    }
    generateInviteCode() {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    }
};
exports.CirclesService = CirclesService;
exports.CirclesService = CirclesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CirclesService);
//# sourceMappingURL=circles.service.js.map