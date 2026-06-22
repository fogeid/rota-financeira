import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUrl, Min } from 'class-validator';

export class ApplyInfluencerDto {
  @ApiProperty({ example: 'Canal do Carlos' })
  @IsString()
  @IsNotEmpty()
  channel_name!: string;

  @ApiProperty({ example: 'https://youtube.com/@carlosdirigente' })
  @IsUrl()
  channel_url!: string;

  @ApiProperty({ example: 25000 })
  @IsInt()
  @Min(1000, { message: 'Mínimo de 1.000 seguidores para candidatura' })
  followers!: number;

  @ApiProperty({ example: 'finanças pessoais, motoristas de app' })
  @IsString()
  @IsNotEmpty()
  niche!: string;
}
