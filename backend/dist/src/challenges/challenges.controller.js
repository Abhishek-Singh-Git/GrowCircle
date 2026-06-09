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
exports.ChallengesController = void 0;
const common_1 = require("@nestjs/common");
const challenges_service_1 = require("./challenges.service");
const challenge_dto_1 = require("./dto/challenge.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let ChallengesController = class ChallengesController {
    challengesService;
    constructor(challengesService) {
        this.challengesService = challengesService;
    }
    async createChallenge(req, dto) {
        return this.challengesService.createChallenge(req.user.id, dto);
    }
    async getChallenges(req, circleId, status) {
        return this.challengesService.getChallenges(req.user.id, circleId, status);
    }
    async respondToChallenge(req, challengeId, accept) {
        return this.challengesService.respondToChallenge(req.user.id, challengeId, accept);
    }
    async incrementProgress(req, challengeId) {
        return this.challengesService.incrementProgress(req.user.id, challengeId);
    }
    async resolveChallenge(req, challengeId, dto) {
        return this.challengesService.resolveChallenge(req.user.id, challengeId, dto);
    }
};
exports.ChallengesController = ChallengesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, challenge_dto_1.CreateChallengeDto]),
    __metadata("design:returntype", Promise)
], ChallengesController.prototype, "createChallenge", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('circle_id')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ChallengesController.prototype, "getChallenges", null);
__decorate([
    (0, common_1.Put)(':challengeId/respond'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('challengeId')),
    __param(2, (0, common_1.Body)('accept')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Boolean]),
    __metadata("design:returntype", Promise)
], ChallengesController.prototype, "respondToChallenge", null);
__decorate([
    (0, common_1.Post)(':challengeId/increment'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('challengeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChallengesController.prototype, "incrementProgress", null);
__decorate([
    (0, common_1.Post)(':challengeId/resolve'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('challengeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, challenge_dto_1.ResolveChallengeDto]),
    __metadata("design:returntype", Promise)
], ChallengesController.prototype, "resolveChallenge", null);
exports.ChallengesController = ChallengesController = __decorate([
    (0, common_1.Controller)('v1/challenges'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [challenges_service_1.ChallengesService])
], ChallengesController);
//# sourceMappingURL=challenges.controller.js.map