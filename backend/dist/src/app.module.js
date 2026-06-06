"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const bullmq_1 = require("@nestjs/bullmq");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const circles_module_1 = require("./circles/circles.module");
const goals_module_1 = require("./goals/goals.module");
const logging_module_1 = require("./logging/logging.module");
const gateway_module_1 = require("./gateway/gateway.module");
const jobs_module_1 = require("./jobs/jobs.module");
const screen_time_module_1 = require("./screen-time/screen-time.module");
const interventions_module_1 = require("./interventions/interventions.module");
const chat_module_1 = require("./chat/chat.module");
const challenges_module_1 = require("./challenges/challenges.module");
const nudges_module_1 = require("./nudges/nudges.module");
const notifications_module_1 = require("./notifications/notifications.module");
const uploads_module_1 = require("./uploads/uploads.module");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            event_emitter_1.EventEmitterModule.forRoot(),
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                },
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            circles_module_1.CirclesModule,
            goals_module_1.GoalsModule,
            logging_module_1.LoggingModule,
            gateway_module_1.GatewayModule,
            jobs_module_1.JobsModule,
            screen_time_module_1.ScreenTimeModule,
            interventions_module_1.InterventionsModule,
            chat_module_1.ChatModule,
            challenges_module_1.ChallengesModule,
            nudges_module_1.NudgesModule,
            notifications_module_1.NotificationsModule,
            uploads_module_1.UploadsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map