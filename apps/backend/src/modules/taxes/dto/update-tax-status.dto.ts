import { ApiProperty } from '@nestjs/swagger';
import { TaxStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateTaxStatusDto {
  @ApiProperty({ enum: TaxStatus, example: 'PAID' })
  @IsEnum(TaxStatus)
  status!: TaxStatus;
}
