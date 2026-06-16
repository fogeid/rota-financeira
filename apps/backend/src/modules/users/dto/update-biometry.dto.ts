import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateBiometryDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled!: boolean;
}
