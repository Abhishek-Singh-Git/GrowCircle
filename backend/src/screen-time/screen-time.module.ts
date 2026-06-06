import { Module } from '@nestjs/common';
import { ScreenTimeController } from './screen-time.controller';
import { ScreenTimeService } from './screen-time.service';
import { CirclesModule } from '../circles/circles.module';

@Module({
  imports: [CirclesModule],
  controllers: [ScreenTimeController],
  providers: [ScreenTimeService],
  exports: [ScreenTimeService],
})
export class ScreenTimeModule {}
