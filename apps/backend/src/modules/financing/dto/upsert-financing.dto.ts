import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpsertFinancingDto {
  @ApiProperty({ example: 1200.0, description: 'Parcela mensal em R$' })
  @IsNumber()
  @Min(1)
  monthly_installment!: number;

  @ApiProperty({ example: 10, description: 'Dia do vencimento (1–28)' })
  @IsInt()
  @Min(1)
  @Max(28)
  due_day!: number;

  @ApiProperty({ example: 3000.0, description: 'Renda líquida desejada por mês em R$' })
  @IsNumber()
  @Min(0)
  desired_income!: number;

  @ApiProperty({ example: 22, description: 'Dias de trabalho por mês (1–30)' })
  @IsInt()
  @Min(1)
  @Max(30)
  work_days_per_month!: number;

  @ApiPropertyOptional({ example: 60, description: 'Total de parcelas do financiamento' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  total_installments?: number;
}
