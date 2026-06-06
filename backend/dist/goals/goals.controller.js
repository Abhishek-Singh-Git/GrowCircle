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
exports.GoalsController = void 0;
const common_1 = require("@nestjs/common");
const goals_service_1 = require("./goals.service");
const goals_dto_1 = require("./dto/goals.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let GoalsController = class GoalsController {
    goalsService;
    constructor(goalsService) {
        this.goalsService = goalsService;
    }
    async createGoal(req, dto) {
        return this.goalsService.createGoal(req.user.id, dto);
    }
    async getGoals(req, circleId, status) {
        return this.goalsService.getGoals(req.user.id, circleId, status);
    }
    async getGoal(req, goalId) {
        return this.goalsService.getGoal(req.user.id, goalId);
    }
    async updateGoal(req, goalId, dto) {
        return this.goalsService.updateGoal(req.user.id, goalId, dto);
    }
    async deleteGoal(req, goalId) {
        return this.goalsService.deleteGoal(req.user.id, goalId);
    }
    async pauseGoal(req, goalId) {
        return this.goalsService.pauseGoal(req.user.id, goalId);
    }
    async archiveGoal(req, goalId) {
        return this.goalsService.archiveGoal(req.user.id, goalId);
    }
    async getTodayInstances(req, circleId) {
        return this.goalsService.getTodayInstances(req.user.id, circleId);
    }
};
exports.GoalsController = GoalsController;
__decorate([
    (0, common_1.Post)('goals'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, goals_dto_1.CreateGoalDto]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "createGoal", null);
__decorate([
    (0, common_1.Get)('goals'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('circle_id')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "getGoals", null);
__decorate([
    (0, common_1.Get)('goals/:goalId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('goalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "getGoal", null);
__decorate([
    (0, common_1.Put)('goals/:goalId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('goalId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, goals_dto_1.UpdateGoalDto]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "updateGoal", null);
__decorate([
    (0, common_1.Delete)('goals/:goalId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('goalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "deleteGoal", null);
__decorate([
    (0, common_1.Post)('goals/:goalId/pause'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('goalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "pauseGoal", null);
__decorate([
    (0, common_1.Post)('goals/:goalId/archive'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('goalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "archiveGoal", null);
__decorate([
    (0, common_1.Get)('goal-instances'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('circle_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "getTodayInstances", null);
exports.GoalsController = GoalsController = __decorate([
    (0, common_1.Controller)('v1'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [goals_service_1.GoalsService])
], GoalsController);
//# sourceMappingURL=goals.controller.js.map