import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InterventionsService } from './interventions.service';
import {
  CreateInterventionDto,
  OverrideInterventionDto,
} from './dto/interventions.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/interventions')
@UseGuards(JwtAuthGuard)
export class InterventionsController {
  constructor(
    private readonly interventionsService: InterventionsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createIntervention(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateInterventionDto,
  ) {
    return this.interventionsService.createIntervention(req.user.id, dto);
  }

  @Post(':interventionId/override')
  async overrideIntervention(
    @Request() req: { user: { id: string } },
    @Param('interventionId') interventionId: string,
    @Body() dto: OverrideInterventionDto,
  ) {
    return this.interventionsService.overrideIntervention(
      req.user.id,
      interventionId,
      dto.reason,
    );
  }

  @Get()
  async getInterventions(
    @Request() req: { user: { id: string } },
    @Query('circle_id') circleId: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const safePage = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const safeLimit = isNaN(parsedLimit) || parsedLimit < 1 ? 20 : parsedLimit;
    return this.interventionsService.getInterventions(
      req.user.id,
      circleId,
      dateFrom,
      dateTo,
      safePage,
      safeLimit,
    );
  }
}
