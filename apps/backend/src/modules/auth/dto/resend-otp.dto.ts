import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OtpPurpose } from '@prisma/client';
import { IsBrazilianPhone } from '../../../common/validators/phone.validator';

export class ResendOtpDto {
  @ApiProperty({ example: '+5511999998888' })
  @IsBrazilianPhone()
  phone!: string;

  @ApiProperty({ enum: OtpPurpose, example: OtpPurpose.REGISTRATION })
  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}
