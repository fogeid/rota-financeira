import { Platform } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class PlatformCredentialsDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

export class ConnectIntegrationDto {
  @IsEnum([Platform.UBER, Platform.NOVENTA_E_NOVE, Platform.IFOOD], {
    message: 'platform deve ser UBER, NOVENTA_E_NOVE ou IFOOD',
  })
  platform!: Platform;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PlatformCredentialsDto)
  credentials?: PlatformCredentialsDto;
}
