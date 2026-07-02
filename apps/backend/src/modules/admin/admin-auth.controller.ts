import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { CurrentAdmin, CurrentAdminUser } from './decorators/current-admin.decorator';

class AdminLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class ChangePasswordDto {
  @IsString()
  current_password!: string;

  @IsString()
  @MinLength(8)
  new_password!: string;
}

@Public()
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: AdminLoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtGuard)
  changePassword(@Body() dto: ChangePasswordDto, @CurrentAdmin() admin: CurrentAdminUser) {
    return this.authService.changePassword(admin.id, dto.current_password, dto.new_password);
  }
}
