import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsNotEmpty, IsString } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ example: 'EXCLUIR MINHA CONTA' })
  @IsString()
  @Equals('EXCLUIR MINHA CONTA', { message: 'Confirmação deve ser exatamente "EXCLUIR MINHA CONTA"' })
  confirmation!: string;
}
