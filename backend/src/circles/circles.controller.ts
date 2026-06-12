import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CirclesService } from './circles.service';
import { CreateCircleDto, JoinCircleDto } from './dto/circles.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/circles')
@UseGuards(JwtAuthGuard)
export class CirclesController {
  constructor(private readonly circlesService: CirclesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: { user: { id: string } }, @Body() dto: CreateCircleDto) {
    return this.circlesService.createCircle(req.user.id, dto);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  async join(@Request() req: { user: { id: string } }, @Body() dto: JoinCircleDto) {
    return this.circlesService.joinCircle(req.user.id, dto);
  }

  @Get()
  async listMyCircles(@Request() req: { user: { id: string } }) {
    return this.circlesService.getUserCircles(req.user.id);
  }

  @Get(':circleId')
  async getCircle(@Request() req: { user: { id: string } }, @Param('circleId') circleId: string) {
    return this.circlesService.getCircleDetails(req.user.id, circleId);
  }

  @Delete(':circleId')
  @HttpCode(HttpStatus.OK)
  async deleteCircle(@Request() req: { user: { id: string } }, @Param('circleId') circleId: string) {
    return this.circlesService.deleteCircle(req.user.id, circleId);
  }

  @Delete(':circleId/leave')
  @HttpCode(HttpStatus.OK)
  async leaveCircle(@Request() req: { user: { id: string } }, @Param('circleId') circleId: string) {
    return this.circlesService.leaveCircle(req.user.id, circleId);
  }
}
