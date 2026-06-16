import { ApiProperty } from '@nestjs/swagger';
import { IsBrazilianPhone } from '../../../common/validators/phone.validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: '+5511999998888' })
  @IsBrazilianPhone()
  phone!: string;
}
