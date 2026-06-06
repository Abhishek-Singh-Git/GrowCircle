import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { DailyCronProcessor } from './processors/daily-cron.processor';
import { GoalsModule } from '../goals/goals.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'daily_cron',
    }),
    GoalsModule,
  ],
  providers: [JobsService, DailyCronProcessor],
})
export class JobsModule {}
