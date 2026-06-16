import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsString, Matches, Max, Min, MinLength } from 'class-validator';

const CURRENT_YEAR = new Date().getFullYear();

export class UpsertVehicleDto {
  @ApiProperty({ example: 'Chevrolet Onix 2024' })
  @IsString()
  @MinLength(2)
  model!: string;

  @ApiProperty({ example: 2024, minimum: 1990, maximum: 2027 })
  @IsInt()
  @Min(1990)
  @Max(CURRENT_YEAR + 1)
  year!: number;

  @ApiProperty({ example: 'ABC-1234', description: 'Formato AAA-0000 ou Mercosul AAA0A00' })
  @IsString()
  @Matches(/^[A-Z]{3}-?\d{3}[A-Z0-9]$/, {
    message: 'plate deve estar no formato ABC-1234 (antigo) ou ABC1D23 (Mercosul)',
  })
  plate!: string;

  @ApiPropertyOptional({ example: 12.4, description: 'Eficiência em km/L (4–30)' })
  @IsNumber()
  @Min(4)
  @Max(30)
  fuel_efficiency!: number;
}
