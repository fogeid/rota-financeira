import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsStrongPassword, Length, MaxLength, Matches } from 'class-validator';
import { IsCpf } from '../../../common/validators/cpf.validator';
import { IsBrazilianPhone } from '../../../common/validators/phone.validator';

export class RegisterDto {
  @ApiProperty({ example: 'Carlos Souza' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: '123.456.789-09' })
  @IsString()
  @IsCpf()
  cpf!: string;

  @ApiProperty({ example: '+5511999998888' })
  @IsBrazilianPhone()
  phone!: string;

  @ApiProperty({ example: 'carlos@email.com' })
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @Length(8, 72)
  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 },
    { message: 'Senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo' },
  )
  password!: string;

  @ApiPropertyOptional({ example: 'CARLOS22' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{8}$/, { message: 'Código de indicação inválido' })
  referral_code?: string;
}
