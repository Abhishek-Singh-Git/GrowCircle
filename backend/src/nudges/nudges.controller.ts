import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NudgesService } from './nudges.service';
import { SendNudgeDto } from './dto/nudge.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/nudges')
@UseGuards(JwtAuthGuard)
export class NudgesController {
  constructor(private readonly nudgesService: NudgesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async sendNudge(
    @Request() req: { user: { id: string } },
    @Body() dto: SendNudgeDto,
  ) {
    return this.nudgesService.sendNudge(req.user.id, dto);
  }

  @Get()
  async getNudges(
    @Request() req: { user: { id: string } },
    @Query('circle_id') circleId: string,
    @Query('sent_by') sentBy: 'me' | 'others',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const safePage = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const safeLimit = isNaN(parsedLimit) || parsedLimit < 1 ? 20 : parsedLimit;
    return this.nudgesService.getNudges(
      req.user.id,
      circleId,
      sentBy,
      safePage,
      safeLimit,
    );
  }
}
