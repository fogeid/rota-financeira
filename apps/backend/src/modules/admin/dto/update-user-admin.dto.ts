import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsCpf } from '../../../common/validators/cpf.validator';
import { IsBrazilianPhone } from '../../../common/validators/phone.validator';

export class UpdateVehicleAdminDto {
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsInt() @Min(1990) @Max(2027) year?: number;
  @IsOptional() @Matches(/^[A-Z]{3}-?\d{3}[A-Z0-9]$/, { message: 'Placa inválida' }) plate?: string;
  @IsOptional() @IsNumber() @Min(4) @Max(30) fuel_efficiency?: number;
}

export class UpdateUserAdminDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150) name?: string;
  @IsOptional() @IsEmail() @MaxLength(150) email?: string;
  @IsOptional() @IsBrazilianPhone() phone?: string;
  @IsOptional() @IsCpf() cpf?: string;
  @IsOptional() @ValidateNested() @Type(() => UpdateVehicleAdminDto) vehicle?: UpdateVehicleAdminDto;
}
