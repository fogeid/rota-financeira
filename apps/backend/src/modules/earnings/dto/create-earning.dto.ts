import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateEarningDto {
  @ApiProperty({ enum: Platform, example: 'UBER' })
  @IsEnum(Platform)
  platform!: Platform;

  @ApiProperty({ example: 45.5, description: 'Valor em R$' })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 12.3, description: 'Km rodados na corrida' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  km_driven?: number;

  @ApiProperty({ example: '2026-06-15T14:30:00Z', description: 'Horário de início da corrida' })
  @IsDateString()
  started_at!: string;

  @ApiProperty({ example: '2026-06-15', description: 'Data de recebimento (YYYY-MM-DD)' })
  @IsDateString()
  earned_at!: string;

  @ApiPropertyOptional({ example: 'uber_notif_1718700000000', description: 'ID externo para deduplicação (gerado pelo cliente)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  external_id?: string;
}
