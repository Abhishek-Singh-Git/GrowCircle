import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsIn,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateChallengeDto {
  @IsUUID()
  circleId: string;

  @IsString()
  title: string;

  @IsString()
  conditionDescription: string;

  @IsIn(['custom', 'goal_based', 'screen_time'])
  conditionType: string;

  @IsOptional()
  @IsUUID()
  conditionGoalId?: string;

  @IsOptional()
  @IsNumber()
  conditionTarget?: number;

  @IsIn(['points', 'iou', 'forfeit'])
  stakeType: string;

  @IsOptional()
  @IsString()
  stakeDescription?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stakePoints?: number;

  @IsBoolean()
  proofRequired: boolean;

  @IsDateString()
  deadline: string;

  @IsUUID("4", { each: true })
  participantIds: string[];
}

export class ResolveChallengeDto {
  @IsOptional()
  @IsUUID()
  winnerId?: string;

  @IsIn(['win', 'draw', 'forfeit'])
  outcomeType: string;
}
