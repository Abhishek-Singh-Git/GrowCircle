"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenTimeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const circles_service_1 = require("../circles/circles.service");
let ScreenTimeService = class ScreenTimeService {
    prisma;
    circlesService;
    constructor(prisma, circlesService) {
        this.prisma = prisma;
        this.circlesService = circlesService;
    }
    async syncScreenTime(userId, dto) {
        const date = new Date(dto.date);
        date.setHours(0, 0, 0, 0);
        let syncedCount = 0;
        for (const snapshot of dto.snapshots) {
            await this.prisma.screenTimeSnapshot.upsert({
                where: {
                    userId_date_appPackage: {
                        userId,
                        date,
                        appPackage: snapshot.appPackage,
                    },
                },
                update: {
                    durationSeconds: snapshot.durationSeconds,
                    openCount: snapshot.openCount ?? null,
                    appDisplayName: snapshot.appDisplayName ?? null,
                    syncedAt: new Date(),
                },
                create: {
                    userId,
                    date,
                    appPackage: snapshot.appPackage,
                    appDisplayName: snapshot.appDisplayName ?? null,
                    durationSeconds: snapshot.durationSeconds,
                    openCount: snapshot.openCount ?? null,
                    platform: dto.platform,
                },
            });
            syncedCount++;
        }
        await this.checkThresholds(userId, date);
        return { syncedCount };
    }
    async getScreenTime(requesterId, targetUserId, date) {
        if (requesterId !== targetUserId) {
            const requesterCircles = await this.prisma.circleMember.findMany({
                where: { userId: requesterId, status: 'active' },
                select: { circleId: true },
            });
            const targetCircles = await this.prisma.circleMember.findMany({
                where: { userId: targetUserId, status: 'active' },
                select: { circleId: true },
            });
            const requesterCircleIds = requesterCircles.map((c) => c.circleId);
            const sharedCircle = targetCircles.find((c) => requesterCircleIds.includes(c.circleId));
            if (!sharedCircle) {
                throw new common_1.ForbiddenException('You are not in a shared circle with this user');
            }
            const consent = await this.prisma.consentRecord.findFirst({
                where: {
                    userId: targetUserId,
                    circleId: sharedCircle.circleId,
                    feature: 'screen_time',
                    revokedAt: null,
                },
            });
            if (!consent) {
                throw new common_1.ForbiddenException('User has not shared screen time data');
            }
        }
        const dateObj = new Date(date);
        dateObj.setHours(0, 0, 0, 0);
        const snapshots = await this.prisma.screenTimeSnapshot.findMany({
            where: {
                userId: targetUserId,
                date: dateObj,
                isHidden: false,
            },
            orderBy: { durationSeconds: 'desc' },
        });
        const hiddenCount = await this.prisma.screenTimeSnapshot.count({
            where: {
                userId: targetUserId,
                date: dateObj,
                isHidden: true,
            },
        });
        const totalSeconds = snapshots.reduce((sum, s) => sum + s.durationSeconds, 0);
        return {
            date: dateObj.toISOString().split('T')[0],
            totalSeconds,
            apps: snapshots.map((s) => ({
                appPackage: s.appPackage,
                appDisplayName: s.appDisplayName,
                durationSeconds: s.durationSeconds,
                openCount: s.openCount,
            })),
            hiddenCount,
        };
    }
    async updateHiddenApps(userId, appPackages) {
        await this.prisma.screenTimeSnapshot.updateMany({
            where: { userId, isHidden: true },
            data: { isHidden: false },
        });
        if (appPackages.length > 0) {
            await this.prisma.screenTimeSnapshot.updateMany({
                where: {
                    userId,
                    appPackage: { in: appPackages },
                },
                data: { isHidden: true },
            });
        }
        return { hiddenApps: appPackages };
    }
    async setThreshold(userId, dto) {
        await this.circlesService.validateMembership(userId, dto.circleId);
        return this.prisma.appThreshold.upsert({
            where: {
                userId_circleId_appPackage: {
                    userId,
                    circleId: dto.circleId,
                    appPackage: dto.appPackage,
                },
            },
            update: {
                thresholdSeconds: dto.thresholdSeconds,
            },
            create: {
                userId,
                circleId: dto.circleId,
                appPackage: dto.appPackage,
                thresholdSeconds: dto.thresholdSeconds,
            },
        });
    }
    async getThresholds(userId, circleId) {
        await this.circlesService.validateMembership(userId, circleId);
        return this.prisma.appThreshold.findMany({
            where: { userId, circleId },
        });
    }
    async checkThresholds(userId, date) {
        const thresholds = await this.prisma.appThreshold.findMany({
            where: { userId, alertEnabled: true },
        });
        for (const threshold of thresholds) {
            const snapshot = await this.prisma.screenTimeSnapshot.findUnique({
                where: {
                    userId_date_appPackage: {
                        userId,
                        date,
                        appPackage: threshold.appPackage,
                    },
                },
            });
            if (snapshot && snapshot.durationSeconds >= threshold.thresholdSeconds) {
            }
        }
    }
};
exports.ScreenTimeService = ScreenTimeService;
exports.ScreenTimeService = ScreenTimeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        circles_service_1.CirclesService])
], ScreenTimeService);
//# sourceMappingURL=screen-time.service.js.map