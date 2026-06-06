import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LoggingService } from './logging.service';
import { CreateLogDto, CreateReactionDto } from './dto/logging.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1')
@UseGuards(JwtAuthGuard)
export class LoggingController {
  constructor(private readonly loggingService: LoggingService) {}

  // ── Activity Logs ─────────────────────────────────────────────────────

  @Post('logs')
  @HttpCode(HttpStatus.CREATED)
  async createLog(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateLogDto,
  ) {
    return this.loggingService.createLog(req.user.id, dto);
  }

  @Get('logs/:logId')
  async getLog(
    @Request() req: { user: { id: string } },
    @Param('logId') logId: string,
  ) {
    return this.loggingService.getLog(req.user.id, logId);
  }

  // ── Reactions ─────────────────────────────────────────────────────────

  @Post('logs/:logId/reactions')
  @HttpCode(HttpStatus.CREATED)
  async addReaction(
    @Request() req: { user: { id: string } },
    @Param('logId') logId: string,
    @Body() dto: CreateReactionDto,
  ) {
    return this.loggingService.addReaction(req.user.id, logId, dto.emoji);
  }

  @Delete('logs/:logId/reactions/:reactionId')
  async removeReaction(
    @Request() req: { user: { id: string } },
    @Param('reactionId') reactionId: string,
  ) {
    return this.loggingService.removeReaction(req.user.id, reactionId);
  }

  // ── Circle Feed ───────────────────────────────────────────────────────

  @Get('circles/:circleId/feed')
  async getCircleFeed(
    @Request() req: { user: { id: string } },
    @Param('circleId') circleId: string,
    @Query('date') date?: string,
  ) {
    return this.loggingService.getCircleFeed(req.user.id, circleId, date);
  }
}
