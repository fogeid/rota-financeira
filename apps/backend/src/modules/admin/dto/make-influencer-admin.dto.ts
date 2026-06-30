import { IsEnum, IsInt, IsString, IsUrl, Min } from 'class-validator';
import { InfluencerTier } from '@prisma/client';

export class MakeInfluencerAdminDto {
  @IsString() channel_name!: string;
  @IsUrl() channel_url!: string;
  @IsInt() @Min(1) followers!: number;
  @IsString() niche!: string;
  @IsEnum(InfluencerTier) tier!: InfluencerTier;
}
