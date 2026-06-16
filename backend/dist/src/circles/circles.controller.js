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
exports.CirclesController = void 0;
const common_1 = require("@nestjs/common");
const circles_service_1 = require("./circles.service");
const circles_dto_1 = require("./dto/circles.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let CirclesController = class CirclesController {
    circlesService;
    constructor(circlesService) {
        this.circlesService = circlesService;
    }
    async create(req, dto) {
        return this.circlesService.createCircle(req.user.id, dto);
    }
    async join(req, dto) {
        return this.circlesService.joinCircle(req.user.id, dto);
    }
    async listMyCircles(req) {
        return this.circlesService.getUserCircles(req.user.id);
    }
    async getCircle(req, circleId) {
        return this.circlesService.getCircleDetails(req.user.id, circleId);
    }
    async getCanvas(req, circleId) {
        return this.circlesService.getCanvasState(req.user.id, circleId);
    }
    async deleteCircle(req, circleId) {
        return this.circlesService.deleteCircle(req.user.id, circleId);
    }
    async leaveCircle(req, circleId) {
        return this.circlesService.leaveCircle(req.user.id, circleId);
    }
};
exports.CirclesController = CirclesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, circles_dto_1.CreateCircleDto]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('join'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, circles_dto_1.JoinCircleDto]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "join", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "listMyCircles", null);
__decorate([
    (0, common_1.Get)(':circleId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('circleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "getCircle", null);
__decorate([
    (0, common_1.Get)(':circleId/canvas'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('circleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "getCanvas", null);
__decorate([
    (0, common_1.Delete)(':circleId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('circleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "deleteCircle", null);
__decorate([
    (0, common_1.Delete)(':circleId/leave'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('circleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CirclesController.prototype, "leaveCircle", null);
exports.CirclesController = CirclesController = __decorate([
    (0, common_1.Controller)('v1/circles'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [circles_service_1.CirclesService])
], CirclesController);
//# sourceMappingURL=circles.controller.js.map