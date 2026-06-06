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
exports.SetThresholdDto = exports.UpdateHiddenAppsDto = exports.GetScreenTimeDto = exports.SyncScreenTimeDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class ScreenTimeSnapshotItem {
    appPackage;
    appDisplayName;
    durationSeconds;
    openCount;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScreenTimeSnapshotItem.prototype, "appPackage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScreenTimeSnapshotItem.prototype, "appDisplayName", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ScreenTimeSnapshotItem.prototype, "durationSeconds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ScreenTimeSnapshotItem.prototype, "openCount", void 0);
class SyncScreenTimeDto {
    date;
    snapshots;
    platform;
}
exports.SyncScreenTimeDto = SyncScreenTimeDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SyncScreenTimeDto.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ScreenTimeSnapshotItem),
    __metadata("design:type", Array)
], SyncScreenTimeDto.prototype, "snapshots", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncScreenTimeDto.prototype, "platform", void 0);
class GetScreenTimeDto {
    userId;
    date;
}
exports.GetScreenTimeDto = GetScreenTimeDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GetScreenTimeDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GetScreenTimeDto.prototype, "date", void 0);
class UpdateHiddenAppsDto {
    appPackages;
}
exports.UpdateHiddenAppsDto = UpdateHiddenAppsDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateHiddenAppsDto.prototype, "appPackages", void 0);
class SetThresholdDto {
    circleId;
    appPackage;
    thresholdSeconds;
}
exports.SetThresholdDto = SetThresholdDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SetThresholdDto.prototype, "circleId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SetThresholdDto.prototype, "appPackage", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(60),
    __metadata("design:type", Number)
], SetThresholdDto.prototype, "thresholdSeconds", void 0);
//# sourceMappingURL=screen-time.dto.js.map