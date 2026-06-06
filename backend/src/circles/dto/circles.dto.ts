import { IsString, MinLength, MaxLength, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateCircleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsBoolean()
  timeoutEnabled?: boolean;

  @IsOptional()
  @IsIn(['mutual', 'owner_grants'])
  timeoutPermissionType?: string;

  @IsOptional()
  @IsIn(['all_members', 'opt_in'])
  leaderboardVisibility?: string;

  @IsOptional()
  @IsIn(['points_only', 'iou', 'forfeit'])
  maxStakeType?: string;
}

export class JoinCircleDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  token?: string;
}
