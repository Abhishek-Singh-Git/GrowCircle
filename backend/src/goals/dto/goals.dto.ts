import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsIn,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsUUID,
  IsDateString,
} from 'class-validator';

export class CreateGoalDto {
  @IsUUID()
  circleId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsIn(['boolean', 'numeric', 'timer', 'checklist'])
  goalType: string;

  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  targetUnit?: string;

  @IsIn(['daily', 'specific_days', 'weekly_frequency'])
  scheduleType: string;

  @IsOptional()
  @IsArray()
  scheduleDays?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  scheduleWeeklyFreq?: number;

  @IsOptional()
  @IsDateString()
  scheduleStartDate?: string;

  @IsOptional()
  @IsDateString()
  scheduleEndDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsString()
  categoryEmoji?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  difficultyWeight?: number;

  @IsOptional()
  @IsBoolean()
  requireProof?: boolean;

  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;
}

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @IsOptional()
  @IsString()
  targetUnit?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  categoryEmoji?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  difficultyWeight?: number;

  @IsOptional()
  @IsBoolean()
  requireProof?: boolean;

  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;
}
