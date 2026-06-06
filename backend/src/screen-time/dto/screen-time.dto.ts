import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  ValidateNested,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

class ScreenTimeSnapshotItem {
  @IsString()
  appPackage: string;

  @IsOptional()
  @IsString()
  appDisplayName?: string;

  @IsNumber()
  @Min(0)
  durationSeconds: number;

  @IsOptional()
  @IsNumber()
  openCount?: number;
}

export class SyncScreenTimeDto {
  @IsDateString()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScreenTimeSnapshotItem)
  snapshots: ScreenTimeSnapshotItem[];

  @IsString()
  platform: string; // 'android' | 'ios'
}

export class GetScreenTimeDto {
  @IsUUID()
  userId: string;

  @IsDateString()
  date: string;
}

export class UpdateHiddenAppsDto {
  @IsArray()
  @IsString({ each: true })
  appPackages: string[];
}

export class SetThresholdDto {
  @IsUUID()
  circleId: string;

  @IsString()
  appPackage: string;

  @IsNumber()
  @Min(60)
  thresholdSeconds: number;
}
