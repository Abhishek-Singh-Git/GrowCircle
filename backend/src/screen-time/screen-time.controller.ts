import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ScreenTimeService } from './screen-time.service';
import {
  SyncScreenTimeDto,
  UpdateHiddenAppsDto,
  SetThresholdDto,
} from './dto/screen-time.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1')
@UseGuards(JwtAuthGuard)
export class ScreenTimeController {
  constructor(private readonly screenTimeService: ScreenTimeService) {}

  @Post('screen-time/sync')
  @HttpCode(HttpStatus.OK)
  async syncScreenTime(
    @Request() req: { user: { id: string } },
    @Body() dto: SyncScreenTimeDto,
  ) {
    return this.screenTimeService.syncScreenTime(req.user.id, dto);
  }

  @Get('screen-time')
  async getScreenTime(
    @Request() req: { user: { id: string } },
    @Query('user_id') userId: string,
    @Query('date') date: string,
  ) {
    return this.screenTimeService.getScreenTime(req.user.id, userId, date);
  }

  @Put('screen-time/hidden-apps')
  async updateHiddenApps(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateHiddenAppsDto,
  ) {
    return this.screenTimeService.updateHiddenApps(req.user.id, dto.appPackages);
  }

  @Put('app-thresholds')
  async setThreshold(
    @Request() req: { user: { id: string } },
    @Body() dto: SetThresholdDto,
  ) {
    return this.screenTimeService.setThreshold(req.user.id, dto);
  }

  @Get('app-thresholds')
  async getThresholds(
    @Request() req: { user: { id: string } },
    @Query('circle_id') circleId: string,
  ) {
    return this.screenTimeService.getThresholds(req.user.id, circleId);
  }
}
