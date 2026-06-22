import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePixKeyDto {
  @ApiProperty({ example: '11999998888', description: 'Chave PIX (CPF, telefone, e-mail ou chave aleatória)' })
  @IsString()
  @MinLength(3)
  @MaxLength(77)
  pix_key!: string;
}
