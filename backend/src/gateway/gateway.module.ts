import { Module } from '@nestjs/common';
import { FeedGateway } from './feed.gateway';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [FeedGateway],
  exports: [FeedGateway],
})
export class GatewayModule {}
