import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LogoutDto {
  @ApiProperty({ example: 'eyJ...' })
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}
