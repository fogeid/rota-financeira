import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsBrazilianPhone } from '../../../common/validators/phone.validator';

export class ChangePhoneDto {
  @ApiProperty({ example: '+5511988887777' })
  @IsBrazilianPhone()
  new_phone!: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @IsNotEmpty()
  current_password!: string;
}
