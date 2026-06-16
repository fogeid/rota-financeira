import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, Length } from 'class-validator';
import { OtpPurpose } from '@prisma/client';
import { IsBrazilianPhone } from '../../../common/validators/phone.validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '+5511999998888' })
  @IsBrazilianPhone()
  phone!: string;

  @ApiProperty({ example: '123456' })
  @Length(6, 6)
  code!: string;

  @ApiProperty({ enum: OtpPurpose, example: OtpPurpose.REGISTRATION })
  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}
