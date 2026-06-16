import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ example: 'eyJ...' })
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}
