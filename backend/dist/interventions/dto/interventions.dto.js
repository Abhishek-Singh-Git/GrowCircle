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
exports.OverrideInterventionDto = exports.CreateInterventionDto = void 0;
const class_validator_1 = require("class-validator");
class CreateInterventionDto {
    targetId;
    circleId;
    type;
    appPackage;
    durationSeconds;
}
exports.CreateInterventionDto = CreateInterventionDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateInterventionDto.prototype, "targetId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateInterventionDto.prototype, "circleId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['alert', 'timeout']),
    __metadata("design:type", String)
], CreateInterventionDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInterventionDto.prototype, "appPackage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(300),
    (0, class_validator_1.Max)(3600),
    __metadata("design:type", Number)
], CreateInterventionDto.prototype, "durationSeconds", void 0);
class OverrideInterventionDto {
    reason;
}
exports.OverrideInterventionDto = OverrideInterventionDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], OverrideInterventionDto.prototype, "reason", void 0);
//# sourceMappingURL=interventions.dto.js.map