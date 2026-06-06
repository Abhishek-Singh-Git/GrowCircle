import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class SendNudgeDto {
  @IsUUID()
  recipientId: string;

  @IsUUID()
  circleId: string;

  @IsOptional()
  @IsUUID()
  goalId?: string;

  @IsOptional()
  @IsUUID()
  goalInstanceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;
}
