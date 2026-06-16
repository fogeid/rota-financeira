import { ApiProperty } from '@nestjs/swagger';
import { Length } from 'class-validator';
import { IsBrazilianPhone } from '../../../common/validators/phone.validator';

export class ChangePhoneVerifyDto {
  @ApiProperty({ example: '+5511988887777' })
  @IsBrazilianPhone()
  new_phone!: string;

  @ApiProperty({ example: '654321' })
  @Length(6, 6)
  code!: string;
}
