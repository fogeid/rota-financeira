import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsStrongPassword } from 'class-validator';
import { IsBrazilianPhone } from '../../../common/validators/phone.validator';

export class ResetPasswordDto {
  @ApiProperty({ example: '+5511999998888' })
  @IsBrazilianPhone()
  phone!: string;

  @ApiProperty({ example: '123456' })
  @Length(6, 6)
  code!: string;

  @ApiProperty({ example: 'NovaSenha@456' })
  @IsString()
  @Length(8, 72)
  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 },
    { message: 'Senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo' },
  )
  new_password!: string;
}
