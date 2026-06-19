import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CostType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCostDto {
  @ApiProperty({ enum: CostType, example: 'FUEL' })
  @IsEnum(CostType)
  type!: CostType;

  @ApiProperty({ example: 200.0, description: 'Valor total em R$' })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'Troca de óleo', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ example: '2026-06-15', description: 'Data do gasto' })
  @IsDateString()
  cost_date!: string;

  // ── FuelLog (opcionais — backend usa defaults se ausentes) ──
  @ApiPropertyOptional({ example: 'Posto Ipiranga Centro' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  gas_station?: string;

  @ApiPropertyOptional({ example: 40.5, description: 'Litros abastecidos' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  liters?: number;

  @ApiPropertyOptional({ example: 5.89, description: 'Preço por litro (R$)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price_per_liter?: number;

  @ApiPropertyOptional({ example: 54320, description: 'Odômetro em km' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  odometer_km?: number;

  // ── MaintenanceLog (opcionais — backend usa defaults se ausentes) ──
  @ApiPropertyOptional({ example: 'Troca de óleo', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  service_type?: string;

  @ApiPropertyOptional({ example: 54320 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  current_odometer_km?: number;

  @ApiPropertyOptional({ example: 59320, description: 'Km para próxima revisão' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  next_service_km?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  reminder_enabled?: boolean;
}
