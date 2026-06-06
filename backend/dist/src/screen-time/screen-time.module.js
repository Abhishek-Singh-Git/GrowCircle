"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenTimeModule = void 0;
const common_1 = require("@nestjs/common");
const screen_time_controller_1 = require("./screen-time.controller");
const screen_time_service_1 = require("./screen-time.service");
const circles_module_1 = require("../circles/circles.module");
let ScreenTimeModule = class ScreenTimeModule {
};
exports.ScreenTimeModule = ScreenTimeModule;
exports.ScreenTimeModule = ScreenTimeModule = __decorate([
    (0, common_1.Module)({
        imports: [circles_module_1.CirclesModule],
        controllers: [screen_time_controller_1.ScreenTimeController],
        providers: [screen_time_service_1.ScreenTimeService],
        exports: [screen_time_service_1.ScreenTimeService],
    })
], ScreenTimeModule);
//# sourceMappingURL=screen-time.module.js.map