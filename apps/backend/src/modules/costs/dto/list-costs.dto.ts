import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CostType } from '@prisma/client';
import { Type } from 'class-transformer';

export class ListCostsDto {
  @IsOptional()
  @IsEnum(CostType)
  type?: CostType;

  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
