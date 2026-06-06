import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { CreateChallengeDto, ResolveChallengeDto } from './dto/challenge.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/challenges')
@UseGuards(JwtAuthGuard)
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createChallenge(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateChallengeDto,
  ) {
    return this.challengesService.createChallenge(req.user.id, dto);
  }

  @Get()
  async getChallenges(
    @Request() req: { user: { id: string } },
    @Query('circle_id') circleId: string,
    @Query('status') status?: string,
  ) {
    return this.challengesService.getChallenges(req.user.id, circleId, status);
  }

  @Put(':challengeId/respond')
  async respondToChallenge(
    @Request() req: { user: { id: string } },
    @Param('challengeId') challengeId: string,
    @Body('accept') accept: boolean,
  ) {
    return this.challengesService.respondToChallenge(req.user.id, challengeId, accept);
  }

  @Post(':challengeId/resolve')
  async resolveChallenge(
    @Request() req: { user: { id: string } },
    @Param('challengeId') challengeId: string,
    @Body() dto: ResolveChallengeDto,
  ) {
    return this.challengesService.resolveChallenge(req.user.id, challengeId, dto);
  }
}
