import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ReferralService } from './referral.service';
import { WithdrawDto } from './dto/withdraw.dto';

@ApiTags('Referral')
@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('validate/:code')
  @Public()
  @ApiOperation({ summary: 'Valida um código de indicação (público)' })
  validateCode(@Param('code') code: string) {
    return this.referralService.validateCode(code.toUpperCase());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna dados de indicação do usuário autenticado' })
  getMyReferral(@CurrentUser() user: AuthenticatedUser) {
    return this.referralService.getMyReferral(user.sub);
  }

  @Get('withdrawals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Histórico de saques' })
  getWithdrawals(@CurrentUser() user: AuthenticatedUser) {
    return this.referralService.getWithdrawals(user.sub);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Solicitar saque do saldo de indicação via PIX' })
  withdraw(@CurrentUser() user: AuthenticatedUser, @Body() dto: WithdrawDto) {
    return this.referralService.withdraw(user.sub, dto);
  }
}
