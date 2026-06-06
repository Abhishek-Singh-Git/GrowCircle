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
exports.ScreenTimeController = void 0;
const common_1 = require("@nestjs/common");
const screen_time_service_1 = require("./screen-time.service");
const screen_time_dto_1 = require("./dto/screen-time.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let ScreenTimeController = class ScreenTimeController {
    screenTimeService;
    constructor(screenTimeService) {
        this.screenTimeService = screenTimeService;
    }
    async syncScreenTime(req, dto) {
        return this.screenTimeService.syncScreenTime(req.user.id, dto);
    }
    async getScreenTime(req, userId, date) {
        return this.screenTimeService.getScreenTime(req.user.id, userId, date);
    }
    async updateHiddenApps(req, dto) {
        return this.screenTimeService.updateHiddenApps(req.user.id, dto.appPackages);
    }
    async setThreshold(req, dto) {
        return this.screenTimeService.setThreshold(req.user.id, dto);
    }
    async getThresholds(req, circleId) {
        return this.screenTimeService.getThresholds(req.user.id, circleId);
    }
};
exports.ScreenTimeController = ScreenTimeController;
__decorate([
    (0, common_1.Post)('screen-time/sync'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, screen_time_dto_1.SyncScreenTimeDto]),
    __metadata("design:returntype", Promise)
], ScreenTimeController.prototype, "syncScreenTime", null);
__decorate([
    (0, common_1.Get)('screen-time'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('user_id')),
    __param(2, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ScreenTimeController.prototype, "getScreenTime", null);
__decorate([
    (0, common_1.Put)('screen-time/hidden-apps'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, screen_time_dto_1.UpdateHiddenAppsDto]),
    __metadata("design:returntype", Promise)
], ScreenTimeController.prototype, "updateHiddenApps", null);
__decorate([
    (0, common_1.Put)('app-thresholds'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, screen_time_dto_1.SetThresholdDto]),
    __metadata("design:returntype", Promise)
], ScreenTimeController.prototype, "setThreshold", null);
__decorate([
    (0, common_1.Get)('app-thresholds'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('circle_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ScreenTimeController.prototype, "getThresholds", null);
exports.ScreenTimeController = ScreenTimeController = __decorate([
    (0, common_1.Controller)('v1'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [screen_time_service_1.ScreenTimeService])
], ScreenTimeController);
//# sourceMappingURL=screen-time.controller.js.map