import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsIn,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateInterventionDto {
  @IsUUID()
  targetId: string;

  @IsUUID()
  circleId: string;

  @IsIn(['alert', 'timeout'])
  type: string;

  @IsOptional()
  @IsString()
  appPackage?: string;

  @IsOptional()
  @IsNumber()
  @Min(300) // 5 minutes minimum
  @Max(3600) // 1 hour maximum
  durationSeconds?: number;
}

export class OverrideInterventionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
