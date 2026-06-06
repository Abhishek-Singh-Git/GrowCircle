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
exports.InterventionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const circles_service_1 = require("../circles/circles.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const UNLOCKABLE_APPS = [
    'com.android.dialer',
    'com.android.phone',
    'com.android.emergency',
    'com.android.settings',
    'com.growcircle.app',
];
const OVERRIDE_COOLDOWN_SECONDS = 300;
const DEFAULT_MAX_DAILY_TIMEOUTS = 5;
let InterventionsService = class InterventionsService {
    prisma;
    circlesService;
    eventEmitter;
    constructor(prisma, circlesService, eventEmitter) {
        this.prisma = prisma;
        this.circlesService = circlesService;
        this.eventEmitter = eventEmitter;
    }
    async createIntervention(initiatorId, dto) {
        await this.circlesService.validateMembership(initiatorId, dto.circleId);
        await this.circlesService.validateMembership(dto.targetId, dto.circleId);
        if (initiatorId === dto.targetId) {
            throw new common_1.BadRequestException('Cannot create an intervention on yourself');
        }
        const circle = await this.prisma.circle.findUnique({
            where: { id: dto.circleId },
        });
        if (!circle)
            throw new common_1.NotFoundException('Circle not found');
        if (dto.type === 'timeout') {
            if (!circle.timeoutEnabled) {
                throw new common_1.ForbiddenException('Timeouts are not enabled in this circle');
            }
            const consent = await this.prisma.consentRecord.findFirst({
                where: {
                    userId: dto.targetId,
                    circleId: dto.circleId,
                    feature: 'timeout',
                    revokedAt: null,
                },
            });
            if (!consent) {
                throw new common_1.ForbiddenException('Target user has not granted timeout permission');
            }
            if (!dto.durationSeconds) {
                throw new common_1.BadRequestException('Duration is required for timeouts');
            }
            if (dto.appPackage && UNLOCKABLE_APPS.includes(dto.appPackage)) {
                throw new common_1.BadRequestException('Cannot lock system-critical apps');
            }
        }
        if (dto.type === 'timeout') {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayCount = await this.prisma.interventionLog.count({
                where: {
                    targetId: dto.targetId,
                    circleId: dto.circleId,
                    interventionType: 'timeout',
                    initiatedAt: { gte: todayStart },
                },
            });
            const maxDaily = circle.maxDailyTimeoutsPerMember ?? DEFAULT_MAX_DAILY_TIMEOUTS;
            if (todayCount >= maxDaily) {
                throw new common_1.ForbiddenException(`Daily timeout limit exceeded (${maxDaily} per day)`);
            }
        }
        if (dto.type === 'timeout') {
            const activeCall = await this.prisma.callSession.findFirst({
                where: {
                    circleId: dto.circleId,
                    participants: { has: dto.targetId },
                    status: 'active',
                },
            });
            if (activeCall) {
                throw new common_1.BadRequestException('Target is on an active call. Timeout deferred.');
            }
        }
        const expiresAt = dto.durationSeconds
            ? new Date(Date.now() + dto.durationSeconds * 1000 + 10000)
            : null;
        const intervention = await this.prisma.interventionLog.create({
            data: {
                initiatorId,
                targetId: dto.targetId,
                circleId: dto.circleId,
                interventionType: dto.type,
                appPackage: dto.appPackage ?? null,
                durationSeconds: dto.durationSeconds ?? null,
                status: dto.type === 'timeout' ? 'pending_grace' : 'sent',
                expiresAt,
            },
            include: {
                initiator: {
                    select: { id: true, name: true, avatarUrl: true },
                },
                target: {
                    select: { id: true, name: true },
                },
            },
        });
        this.eventEmitter.emit('intervention.created', {
            intervention,
            circleId: dto.circleId,
            type: dto.type,
        });
        return intervention;
    }
    async overrideIntervention(userId, interventionId, reason) {
        const intervention = await this.prisma.interventionLog.findUnique({
            where: { id: interventionId },
        });
        if (!intervention)
            throw new common_1.NotFoundException('Intervention not found');
        if (intervention.targetId !== userId) {
            throw new common_1.ForbiddenException('Only the target can override');
        }
        if (intervention.interventionType !== 'timeout' ||
            intervention.status === 'overridden' ||
            intervention.status === 'expired') {
            throw new common_1.BadRequestException('Intervention is not active');
        }
        const elapsedSeconds = (Date.now() - intervention.initiatedAt.getTime()) / 1000;
        if (elapsedSeconds < OVERRIDE_COOLDOWN_SECONDS) {
            const remaining = Math.ceil(OVERRIDE_COOLDOWN_SECONDS - elapsedSeconds);
            throw new common_1.ForbiddenException(JSON.stringify({
                error: 'COOLDOWN_ACTIVE',
                secondsRemaining: remaining,
            }));
        }
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const overrideCountToday = await this.prisma.interventionLog.count({
            where: {
                targetId: userId,
                status: 'overridden',
                overrideAt: { gte: todayStart },
            },
        });
        if (overrideCountToday >= 3) {
            throw new common_1.ForbiddenException('Maximum daily override limit (3) reached.');
        }
        const updated = await this.prisma.interventionLog.update({
            where: { id: interventionId },
            data: {
                status: 'overridden',
                overrideAt: new Date(),
                overrideReason: reason ?? null,
            },
        });
        this.eventEmitter.emit('intervention.overridden', {
            intervention: updated,
            circleId: intervention.circleId,
        });
        return { overriddenAt: updated.overrideAt };
    }
    async getInterventions(userId, circleId, dateFrom, dateTo, page = 1, limit = 20) {
        await this.circlesService.validateMembership(userId, circleId);
        const where = { circleId };
        if (dateFrom || dateTo) {
            where.initiatedAt = {};
            if (dateFrom)
                where.initiatedAt.gte = new Date(dateFrom);
            if (dateTo)
                where.initiatedAt.lte = new Date(dateTo);
        }
        const [items, total] = await Promise.all([
            this.prisma.interventionLog.findMany({
                where,
                include: {
                    initiator: {
                        select: { id: true, name: true, avatarUrl: true },
                    },
                    target: {
                        select: { id: true, name: true, avatarUrl: true },
                    },
                },
                orderBy: { initiatedAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.interventionLog.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async handleConsentRevocation(userId, circleId) {
        const activeTimeouts = await this.prisma.interventionLog.findMany({
            where: {
                targetId: userId,
                circleId,
                interventionType: 'timeout',
                status: { in: ['pending_grace', 'active'] },
            },
        });
        for (const timeout of activeTimeouts) {
            await this.prisma.interventionLog.update({
                where: { id: timeout.id },
                data: {
                    status: 'cancelled_consent_revoked',
                    overrideAt: new Date(),
                    overrideReason: 'Consent revoked by target user',
                },
            });
            this.eventEmitter.emit('intervention.cancelled', {
                intervention: timeout,
                circleId,
                reason: 'consent_revoked',
            });
        }
        return { cancelledCount: activeTimeouts.length };
    }
};
exports.InterventionsService = InterventionsService;
exports.InterventionsService = InterventionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        circles_service_1.CirclesService,
        event_emitter_1.EventEmitter2])
], InterventionsService);
//# sourceMappingURL=interventions.service.js.map