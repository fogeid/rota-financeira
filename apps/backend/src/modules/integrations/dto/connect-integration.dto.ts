import { Platform } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

class PlatformCredentialsDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class ConnectIntegrationDto {
  @IsEnum([Platform.UBER, Platform.NOVENTA_E_NOVE, Platform.IFOOD], {
    message: 'platform deve ser UBER, NOVENTA_E_NOVE ou IFOOD',
  })
  platform!: Platform;

  @ValidateNested()
  @Type(() => PlatformCredentialsDto)
  credentials!: PlatformCredentialsDto;
}
