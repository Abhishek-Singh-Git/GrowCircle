import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CirclesModule } from './circles/circles.module';
import { GoalsModule } from './goals/goals.module';
import { LoggingModule } from './logging/logging.module';
import { GatewayModule } from './gateway/gateway.module';
import { JobsModule } from './jobs/jobs.module';
import { ScreenTimeModule } from './screen-time/screen-time.module';
import { InterventionsModule } from './interventions/interventions.module';
import { ChatModule } from './chat/chat.module';
import { ChallengesModule } from './challenges/challenges.module';
import { NudgesModule } from './nudges/nudges.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadsModule } from './uploads/uploads.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    PrismaModule,
    AuthModule,
    CirclesModule,
    GoalsModule,
    LoggingModule,
    GatewayModule,
    JobsModule,
    ScreenTimeModule,
    InterventionsModule,
    ChatModule,
    ChallengesModule,
    NudgesModule,
    NotificationsModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
