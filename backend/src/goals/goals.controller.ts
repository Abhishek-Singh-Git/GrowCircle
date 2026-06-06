import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto, UpdateGoalDto } from './dto/goals.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post('goals')
  @HttpCode(HttpStatus.CREATED)
  async createGoal(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateGoalDto,
  ) {
    return this.goalsService.createGoal(req.user.id, dto);
  }

  @Get('goals')
  async getGoals(
    @Request() req: { user: { id: string } },
    @Query('circle_id') circleId: string,
    @Query('status') status?: string,
  ) {
    return this.goalsService.getGoals(req.user.id, circleId, status);
  }

  @Get('goals/:goalId')
  async getGoal(
    @Request() req: { user: { id: string } },
    @Param('goalId') goalId: string,
  ) {
    return this.goalsService.getGoal(req.user.id, goalId);
  }

  @Put('goals/:goalId')
  async updateGoal(
    @Request() req: { user: { id: string } },
    @Param('goalId') goalId: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.updateGoal(req.user.id, goalId, dto);
  }

  @Delete('goals/:goalId')
  async deleteGoal(
    @Request() req: { user: { id: string } },
    @Param('goalId') goalId: string,
  ) {
    return this.goalsService.deleteGoal(req.user.id, goalId);
  }

  @Post('goals/:goalId/pause')
  async pauseGoal(
    @Request() req: { user: { id: string } },
    @Param('goalId') goalId: string,
  ) {
    return this.goalsService.pauseGoal(req.user.id, goalId);
  }

  @Post('goals/:goalId/archive')
  async archiveGoal(
    @Request() req: { user: { id: string } },
    @Param('goalId') goalId: string,
  ) {
    return this.goalsService.archiveGoal(req.user.id, goalId);
  }

  // Today's goal instances
  @Get('goal-instances')
  async getTodayInstances(
    @Request() req: { user: { id: string } },
    @Query('circle_id') circleId: string,
  ) {
    return this.goalsService.getTodayInstances(req.user.id, circleId);
  }
}
