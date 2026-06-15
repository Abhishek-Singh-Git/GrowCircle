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
exports.NudgesController = void 0;
const common_1 = require("@nestjs/common");
const nudges_service_1 = require("./nudges.service");
const nudge_dto_1 = require("./dto/nudge.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let NudgesController = class NudgesController {
    nudgesService;
    constructor(nudgesService) {
        this.nudgesService = nudgesService;
    }
    async sendNudge(req, dto) {
        return this.nudgesService.sendNudge(req.user.id, dto);
    }
    async getNudges(req, circleId, sentBy, page, limit) {
        const parsedPage = page ? parseInt(page, 10) : 1;
        const parsedLimit = limit ? parseInt(limit, 10) : 20;
        const safePage = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
        const safeLimit = isNaN(parsedLimit) || parsedLimit < 1 ? 20 : parsedLimit;
        return this.nudgesService.getNudges(req.user.id, circleId, sentBy, safePage, safeLimit);
    }
};
exports.NudgesController = NudgesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, nudge_dto_1.SendNudgeDto]),
    __metadata("design:returntype", Promise)
], NudgesController.prototype, "sendNudge", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('circle_id')),
    __param(2, (0, common_1.Query)('sent_by')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], NudgesController.prototype, "getNudges", null);
exports.NudgesController = NudgesController = __decorate([
    (0, common_1.Controller)('v1/nudges'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [nudges_service_1.NudgesService])
], NudgesController);
//# sourceMappingURL=nudges.controller.js.map