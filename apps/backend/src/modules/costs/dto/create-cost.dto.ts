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
  ValidateIf,
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

  // ── FuelLog (obrigatório quando type === FUEL) ──
  @ApiPropertyOptional({ example: 'Posto Ipiranga Centro' })
  @ValidateIf((o: CreateCostDto) => o.type === CostType.FUEL)
  @IsString()
  @MaxLength(120)
  gas_station?: string;

  @ApiPropertyOptional({ example: 40.5, description: 'Litros abastecidos' })
  @ValidateIf((o: CreateCostDto) => o.type === CostType.FUEL)
  @IsNumber()
  @IsPositive()
  liters?: number;

  @ApiPropertyOptional({ example: 5.89, description: 'Preço por litro (R$)' })
  @ValidateIf((o: CreateCostDto) => o.type === CostType.FUEL)
  @IsNumber()
  @IsPositive()
  price_per_liter?: number;

  @ApiPropertyOptional({ example: 54320, description: 'Odômetro em km' })
  @ValidateIf((o: CreateCostDto) => o.type === CostType.FUEL)
  @IsNumber()
  @Min(0)
  odometer_km?: number;

  // ── MaintenanceLog (obrigatório quando type === MAINTENANCE) ──
  @ApiPropertyOptional({ example: 'Troca de óleo', maxLength: 100 })
  @ValidateIf((o: CreateCostDto) => o.type === CostType.MAINTENANCE)
  @IsString()
  @MaxLength(100)
  service_type?: string;

  @ApiPropertyOptional({ example: 54320 })
  @ValidateIf((o: CreateCostDto) => o.type === CostType.MAINTENANCE)
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
