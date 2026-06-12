import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsIn,
  IsBoolean,
  Min,
  Max,
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

  // Battle Arena 2.0: Duration in hours (replaces deadline string).
  // The backend computes deadline = now + durationHours.
  @IsNumber()
  @Min(1)
  @Max(168) // Max 7 days
  durationHours: number;

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

// Battle Arena 2.0: Victory claim submission
export class SubmitVictoryDto {
  @IsString()
  proofText: string;
}
