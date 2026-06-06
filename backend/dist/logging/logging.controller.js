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
exports.LoggingController = void 0;
const common_1 = require("@nestjs/common");
const logging_service_1 = require("./logging.service");
const logging_dto_1 = require("./dto/logging.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let LoggingController = class LoggingController {
    loggingService;
    constructor(loggingService) {
        this.loggingService = loggingService;
    }
    async createLog(req, dto) {
        return this.loggingService.createLog(req.user.id, dto);
    }
    async getLog(req, logId) {
        return this.loggingService.getLog(req.user.id, logId);
    }
    async addReaction(req, logId, dto) {
        return this.loggingService.addReaction(req.user.id, logId, dto.emoji);
    }
    async removeReaction(req, reactionId) {
        return this.loggingService.removeReaction(req.user.id, reactionId);
    }
    async getCircleFeed(req, circleId, date) {
        return this.loggingService.getCircleFeed(req.user.id, circleId, date);
    }
};
exports.LoggingController = LoggingController;
__decorate([
    (0, common_1.Post)('logs'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, logging_dto_1.CreateLogDto]),
    __metadata("design:returntype", Promise)
], LoggingController.prototype, "createLog", null);
__decorate([
    (0, common_1.Get)('logs/:logId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('logId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LoggingController.prototype, "getLog", null);
__decorate([
    (0, common_1.Post)('logs/:logId/reactions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('logId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, logging_dto_1.CreateReactionDto]),
    __metadata("design:returntype", Promise)
], LoggingController.prototype, "addReaction", null);
__decorate([
    (0, common_1.Delete)('logs/:logId/reactions/:reactionId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('reactionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LoggingController.prototype, "removeReaction", null);
__decorate([
    (0, common_1.Get)('circles/:circleId/feed'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('circleId')),
    __param(2, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LoggingController.prototype, "getCircleFeed", null);
exports.LoggingController = LoggingController = __decorate([
    (0, common_1.Controller)('v1'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [logging_service_1.LoggingService])
], LoggingController);
//# sourceMappingURL=logging.controller.js.map