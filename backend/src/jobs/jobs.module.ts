import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { DailyCronProcessor } from './processors/daily-cron.processor';
import { CleanupProcessor } from './processors/cleanup.processor';
import { GoalsModule } from '../goals/goals.module';
import { ChallengesModule } from '../challenges/challenges.module';
import { InterventionsModule } from '../interventions/interventions.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'daily_cron',
    }),
    GoalsModule,
    ChallengesModule,
    InterventionsModule,
  ],
  providers: [JobsService, DailyCronProcessor, CleanupProcessor],
})
export class JobsModule {}
