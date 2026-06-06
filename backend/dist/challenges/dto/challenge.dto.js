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
exports.ResolveChallengeDto = exports.CreateChallengeDto = void 0;
const class_validator_1 = require("class-validator");
class CreateChallengeDto {
    circleId;
    title;
    conditionDescription;
    conditionType;
    conditionGoalId;
    conditionTarget;
    stakeType;
    stakeDescription;
    stakePoints;
    proofRequired;
    deadline;
    participantIds;
}
exports.CreateChallengeDto = CreateChallengeDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateChallengeDto.prototype, "circleId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateChallengeDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateChallengeDto.prototype, "conditionDescription", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['custom', 'goal_based', 'screen_time']),
    __metadata("design:type", String)
], CreateChallengeDto.prototype, "conditionType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateChallengeDto.prototype, "conditionGoalId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateChallengeDto.prototype, "conditionTarget", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['points', 'iou', 'forfeit']),
    __metadata("design:type", String)
], CreateChallengeDto.prototype, "stakeType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateChallengeDto.prototype, "stakeDescription", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateChallengeDto.prototype, "stakePoints", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateChallengeDto.prototype, "proofRequired", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateChallengeDto.prototype, "deadline", void 0);
__decorate([
    (0, class_validator_1.IsUUID)("4", { each: true }),
    __metadata("design:type", Array)
], CreateChallengeDto.prototype, "participantIds", void 0);
class ResolveChallengeDto {
    winnerId;
    outcomeType;
}
exports.ResolveChallengeDto = ResolveChallengeDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ResolveChallengeDto.prototype, "winnerId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['win', 'draw', 'forfeit']),
    __metadata("design:type", String)
], ResolveChallengeDto.prototype, "outcomeType", void 0);
//# sourceMappingURL=challenge.dto.js.map