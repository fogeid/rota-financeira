import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class WithdrawDto {
  @ApiProperty({ example: '11999998888' })
  @IsString()
  @IsNotEmpty()
  pix_key!: string;

  @ApiProperty({ example: 20.00 })
  @IsNumber()
  @Min(20, { message: 'Valor mínimo para saque é R$ 20,00' })
  amount!: number;
}
