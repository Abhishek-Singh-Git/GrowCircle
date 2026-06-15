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
exports.InterventionsController = void 0;
const common_1 = require("@nestjs/common");
const interventions_service_1 = require("./interventions.service");
const interventions_dto_1 = require("./dto/interventions.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let InterventionsController = class InterventionsController {
    interventionsService;
    constructor(interventionsService) {
        this.interventionsService = interventionsService;
    }
    async createIntervention(req, dto) {
        return this.interventionsService.createIntervention(req.user.id, dto);
    }
    async overrideIntervention(req, interventionId, dto) {
        return this.interventionsService.overrideIntervention(req.user.id, interventionId, dto.reason);
    }
    async getInterventions(req, circleId, dateFrom, dateTo, page, limit) {
        const parsedPage = page ? parseInt(page, 10) : 1;
        const parsedLimit = limit ? parseInt(limit, 10) : 20;
        const safePage = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
        const safeLimit = isNaN(parsedLimit) || parsedLimit < 1 ? 20 : parsedLimit;
        return this.interventionsService.getInterventions(req.user.id, circleId, dateFrom, dateTo, safePage, safeLimit);
    }
};
exports.InterventionsController = InterventionsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, interventions_dto_1.CreateInterventionDto]),
    __metadata("design:returntype", Promise)
], InterventionsController.prototype, "createIntervention", null);
__decorate([
    (0, common_1.Post)(':interventionId/override'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('interventionId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, interventions_dto_1.OverrideInterventionDto]),
    __metadata("design:returntype", Promise)
], InterventionsController.prototype, "overrideIntervention", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('circle_id')),
    __param(2, (0, common_1.Query)('date_from')),
    __param(3, (0, common_1.Query)('date_to')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], InterventionsController.prototype, "getInterventions", null);
exports.InterventionsController = InterventionsController = __decorate([
    (0, common_1.Controller)('v1/interventions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [interventions_service_1.InterventionsService])
], InterventionsController);
//# sourceMappingURL=interventions.controller.js.map