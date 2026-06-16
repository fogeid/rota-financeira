import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsStrongPassword, Length } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @IsNotEmpty()
  current_password!: string;

  @ApiProperty({ example: 'NovaSenha@456' })
  @IsString()
  @Length(8, 72)
  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 },
    { message: 'Senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo' },
  )
  new_password!: string;
}
