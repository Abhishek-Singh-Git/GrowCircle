import { Module } from '@nestjs/common';
import { NudgesController } from './nudges.controller';
import { NudgesService } from './nudges.service';
import { CirclesModule } from '../circles/circles.module';

@Module({
  imports: [CirclesModule],
  controllers: [NudgesController],
  providers: [NudgesService],
  exports: [NudgesService],
})
export class NudgesModule {}
