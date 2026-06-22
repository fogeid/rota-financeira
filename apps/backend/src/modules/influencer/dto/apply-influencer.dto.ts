import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsNotEmpty, IsString, IsUrl, Min } from 'class-validator';

export class ApplyInfluencerDto {
  @ApiProperty({ example: 'Zé Motorista' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'ze@canal.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Canal do Carlos' })
  @IsString()
  @IsNotEmpty()
  channel_name!: string;

  @ApiProperty({ example: 'https://youtube.com/@carlosdirigente' })
  @IsUrl()
  channel_url!: string;

  @ApiProperty({ example: 25000 })
  @IsInt()
  @Min(5000, { message: 'Mínimo de 5.000 seguidores para candidatura' })
  followers!: number;

  @ApiProperty({ example: 'finanças pessoais, motoristas de app' })
  @IsString()
  @IsNotEmpty()
  niche!: string;
}
