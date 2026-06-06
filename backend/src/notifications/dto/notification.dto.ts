import {
  IsString,
  IsOptional,
  IsUUID,
  IsObject,
} from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  userId: string;

  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
