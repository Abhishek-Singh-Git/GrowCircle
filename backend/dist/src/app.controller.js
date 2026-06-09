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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const app_service_1 = require("./app.service");
const jwt_auth_guard_1 = require("./auth/jwt-auth.guard");
const prisma_service_1 = require("./prisma/prisma.service");
let AppController = class AppController {
    appService;
    prisma;
    constructor(appService, prisma) {
        this.appService = appService;
        this.prisma = prisma;
    }
    getHello() {
        return this.appService.getHello();
    }
    getAssetLinks() {
        return [
            {
                relation: ['delegate_permission/common.handle_all_urls'],
                target: {
                    namespace: 'android_app',
                    package_name: 'com.growcircle.app',
                    sha256_cert_fingerprints: [
                        'XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX'
                    ],
                },
            },
        ];
    }
    async getMe(req) {
        if (!req.user?.id) {
            throw new common_1.UnauthorizedException('User not authenticated');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatarUrl: true,
                timezone: true,
                plan: true,
            },
        });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        return user;
    }
    async updateProfile(req, body) {
        if (!req.user?.id) {
            throw new common_1.UnauthorizedException('User not authenticated');
        }
        return this.prisma.user.update({
            where: { id: req.user.id },
            data: { fcmToken: body.fcmToken },
        });
    }
    async getPreferences(req) {
        if (!req.user?.id) {
            throw new common_1.UnauthorizedException('User not authenticated');
        }
        let prefs = await this.prisma.userPreference.findUnique({
            where: { userId: req.user.id },
        });
        if (!prefs) {
            prefs = await this.prisma.userPreference.create({
                data: { userId: req.user.id },
            });
        }
        return prefs;
    }
    async updatePreferences(req, body) {
        const userId = req.user?.id;
        if (!userId)
            throw new Error('User not authenticated');
        const { timeoutConsent, screenTimeConsent, ...prefsData } = body;
        const result = await this.prisma.userPreference.upsert({
            where: { userId },
            update: prefsData,
            create: { userId, ...prefsData },
        });
        if (timeoutConsent !== undefined || screenTimeConsent !== undefined) {
            const activeCircles = await this.prisma.circleMember.findMany({
                where: { userId, status: 'active' },
                select: { circleId: true },
            });
            for (const cm of activeCircles) {
                if (timeoutConsent !== undefined) {
                    await this.prisma.consentRecord.upsert({
                        where: { id: `${userId}-${cm.circleId}-timeout` },
                        update: { revokedAt: timeoutConsent ? null : new Date() },
                        create: {
                            userId,
                            circleId: cm.circleId,
                            feature: 'timeout',
                            revokedAt: timeoutConsent ? null : new Date(),
                        },
                    }).catch(async () => {
                        const existing = await this.prisma.consentRecord.findFirst({
                            where: { userId, circleId: cm.circleId, feature: 'timeout' }
                        });
                        if (existing) {
                            await this.prisma.consentRecord.update({
                                where: { id: existing.id },
                                data: { revokedAt: timeoutConsent ? null : new Date() }
                            });
                        }
                        else {
                            await this.prisma.consentRecord.create({
                                data: { userId, circleId: cm.circleId, feature: 'timeout', revokedAt: timeoutConsent ? null : new Date() }
                            });
                        }
                    });
                }
                if (screenTimeConsent !== undefined) {
                    const existing = await this.prisma.consentRecord.findFirst({
                        where: { userId, circleId: cm.circleId, feature: 'screen_time' }
                    });
                    if (existing) {
                        await this.prisma.consentRecord.update({
                            where: { id: existing.id },
                            data: { revokedAt: screenTimeConsent ? null : new Date() }
                        });
                    }
                    else {
                        await this.prisma.consentRecord.create({
                            data: { userId, circleId: cm.circleId, feature: 'screen_time', revokedAt: screenTimeConsent ? null : new Date() }
                        });
                    }
                }
            }
        }
        return result;
    }
    healthCheck() {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('.well-known/assetlinks.json'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getAssetLinks", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('v1/users/me'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getMe", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Patch)('v1/users/me'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('v1/users/me/preferences'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getPreferences", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('v1/users/me/preferences'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "updatePreferences", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "healthCheck", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        prisma_service_1.PrismaService])
], AppController);
//# sourceMappingURL=app.controller.js.map