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
  Delete,
} from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { CreateChallengeDto, ResolveChallengeDto, SubmitVictoryDto } from './dto/challenge.dto';
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

  @Post(':challengeId/increment')
  async incrementProgress(
    @Request() req: { user: { id: string } },
    @Param('challengeId') challengeId: string,
  ) {
    return this.challengesService.incrementProgress(req.user.id, challengeId);
  }

  // Battle Arena 2.0: Claim Victory
  @Post(':challengeId/submit-victory')
  @HttpCode(HttpStatus.OK)
  async submitVictory(
    @Request() req: { user: { id: string } },
    @Param('challengeId') challengeId: string,
    @Body() dto: SubmitVictoryDto,
  ) {
    return this.challengesService.submitVictory(req.user.id, challengeId, dto);
  }

  @Post(':challengeId/resolve')
  async resolveChallenge(
    @Request() req: { user: { id: string } },
    @Param('challengeId') challengeId: string,
    @Body() dto: ResolveChallengeDto,
  ) {
    return this.challengesService.resolveChallenge(req.user.id, challengeId, dto);
  }

  @Post(':challengeId/participants/:participantId/accept-victory')
  async acceptVictory(
    @Request() req: { user: { id: string } },
    @Param('challengeId') challengeId: string,
    @Param('participantId') participantId: string,
  ) {
    return this.challengesService.acceptVictory(req.user.id, challengeId, participantId);
  }

  @Post(':challengeId/participants/:participantId/reject-victory')
  async rejectVictory(
    @Request() req: { user: { id: string } },
    @Param('challengeId') challengeId: string,
    @Param('participantId') participantId: string,
    @Body('reason') reason: string,
  ) {
    return this.challengesService.rejectVictory(req.user.id, challengeId, participantId, reason);
  }

  @Delete(':challengeId/history')
  @HttpCode(HttpStatus.OK)
  async clearHistory(
    @Request() req: { user: { id: string } },
    @Param('challengeId') challengeId: string,
  ) {
    return this.challengesService.clearHistory(req.user.id, challengeId);
  }
}
