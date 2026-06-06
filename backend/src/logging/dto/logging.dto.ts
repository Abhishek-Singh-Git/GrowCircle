import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsIn,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateLogDto {
  @IsUUID()
  clientUuid: string; // Client-side deduplication key

  @IsUUID()
  goalInstanceId: string;

  @IsOptional()
  @IsNumber()
  actualValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  completionFraction?: number;

  @IsIn(['completed', 'partial', 'skipped'])
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  proofUrl?: string;

  @IsOptional()
  @IsIn(['photo', 'video', 'screenshot'])
  proofType?: string;
}

export class CreateReactionDto {
  @IsString()
  emoji: string;
}
