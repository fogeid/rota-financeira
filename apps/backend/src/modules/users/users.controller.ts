import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePhoneDto } from './dto/change-phone.dto';
import { ChangePhoneVerifyDto } from './dto/change-phone-verify.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateBiometryDto } from './dto/update-biometry.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users/me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Retorna os dados do usuário autenticado' })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.sub);
  }

  @Patch()
  @ApiOperation({ summary: 'Atualiza nome e/ou e-mail do usuário' })
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Altera a senha do usuário' })
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.sub, dto);
  }

  @Post('change-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicia troca de telefone enviando OTP para o novo número' })
  changePhone(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePhoneDto) {
    return this.usersService.changePhone(user.sub, dto);
  }

  @Post('change-phone/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirma a troca de telefone com OTP' })
  changePhoneVerify(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePhoneVerifyDto) {
    return this.usersService.changePhoneVerify(user.sub, dto);
  }

  @Patch('biometry')
  @ApiOperation({ summary: 'Ativa ou desativa biometria' })
  updateBiometry(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateBiometryDto) {
    return this.usersService.updateBiometry(user.sub, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicia exclusão da conta (soft delete)' })
  deleteAccount(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeleteAccountDto) {
    return this.usersService.deleteAccount(user.sub, dto);
  }
}
