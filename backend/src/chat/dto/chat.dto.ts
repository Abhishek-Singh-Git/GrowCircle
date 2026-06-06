import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  MaxLength,
} from 'class-validator';

export class CreateThreadDto {
  @IsUUID()
  circleId: string;

  @IsIn(['group', 'direct'])
  threadType: string;

  @IsOptional()
  @IsUUID("4", { each: true })
  participantIds?: string[]; // For direct threads
}

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsIn(['image', 'video', 'screenshot'])
  mediaType?: string;
}
