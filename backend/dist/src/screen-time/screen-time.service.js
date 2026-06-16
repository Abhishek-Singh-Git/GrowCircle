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
const luxon_1 = require("luxon");
const event_emitter_1 = require("@nestjs/event-emitter");
let ScreenTimeService = class ScreenTimeService {
    prisma;
    circlesService;
    eventEmitter;
    lateNightCooldown = new Map();
    LATE_NIGHT_COOLDOWN_MS = 30 * 60 * 1000;
    constructor(prisma, circlesService, eventEmitter) {
        this.prisma = prisma;
        this.circlesService = circlesService;
        this.eventEmitter = eventEmitter;
    }
    async syncScreenTime(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { timezone: true, preferences: { select: { shareLateNightActivity: true } } },
        });
        const userTz = user?.timezone || 'UTC';
        const localStart = luxon_1.DateTime.fromISO(dto.date).setZone(userTz).startOf('day');
        const date = new Date(Date.UTC(localStart.year, localStart.month - 1, localStart.day));
        const nowLocal = luxon_1.DateTime.now().setZone(userTz);
        const hour = nowLocal.hour;
        const minute = nowLocal.minute;
        const isLate = (hour === 23 && minute >= 30) || (hour >= 0 && hour < 4);
        if (isLate && user?.preferences?.shareLateNightActivity) {
            const circles = await this.prisma.circleMember.findMany({
                where: { userId, status: 'active' },
                select: { circleId: true },
            });
            for (const c of circles) {
                const cooldownKey = `${userId}:${c.circleId}`;
                const lastFired = this.lateNightCooldown.get(cooldownKey) ?? 0;
                if (Date.now() - lastFired > this.LATE_NIGHT_COOLDOWN_MS) {
                    this.lateNightCooldown.set(cooldownKey, Date.now());
                    this.eventEmitter.emitAsync('late_night.detected', {
                        userId,
                        circleId: c.circleId,
                    }).catch(() => { });
                }
            }
        }
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
        const user = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { timezone: true } });
        const userTz = user?.timezone || 'UTC';
        const localStartObj = luxon_1.DateTime.fromISO(date).setZone(userTz).startOf('day');
        const dateObj = new Date(Date.UTC(localStartObj.year, localStartObj.month - 1, localStartObj.day));
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
        const totalUnlocks = snapshots.reduce((sum, s) => sum + (s.openCount || 0), 0);
        const sevenDaysAgoLocal = localStartObj.minus({ days: 6 });
        const sevenDaysAgo = new Date(Date.UTC(sevenDaysAgoLocal.year, sevenDaysAgoLocal.month - 1, sevenDaysAgoLocal.day));
        const weeklySnapshots = await this.prisma.screenTimeSnapshot.groupBy({
            by: ['date'],
            where: {
                userId: targetUserId,
                date: {
                    gte: sevenDaysAgo,
                    lte: dateObj,
                },
                isHidden: false,
            },
            _sum: {
                durationSeconds: true,
            },
        });
        const weeklyTrend = Array(7).fill(0);
        for (let i = 6; i >= 0; i--) {
            const targetLocal = localStartObj.minus({ days: i });
            const targetUtc = new Date(Date.UTC(targetLocal.year, targetLocal.month - 1, targetLocal.day));
            const match = weeklySnapshots.find(s => s.date.getTime() === targetUtc.getTime());
            if (match) {
                weeklyTrend[6 - i] = Math.round((match._sum.durationSeconds || 0) / 60);
            }
        }
        return {
            date: luxon_1.DateTime.fromJSDate(dateObj).setZone(userTz).toFormat('yyyy-MM-dd'),
            totalSeconds,
            unlocks: totalUnlocks,
            weeklyTrend,
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
        circles_service_1.CirclesService,
        event_emitter_1.EventEmitter2])
], ScreenTimeService);
//# sourceMappingURL=screen-time.service.js.map