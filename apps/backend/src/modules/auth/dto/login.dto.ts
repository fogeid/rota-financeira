import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { IsCpf } from '../../../common/validators/cpf.validator';

export class LoginDto {
  @ApiProperty({ example: '123.456.789-09' })
  @IsString()
  @IsCpf()
  cpf!: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @MinLength(1)
  password!: string;
}
