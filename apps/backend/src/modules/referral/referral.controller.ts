import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReferralService } from './referral.service';
import { WithdrawDto } from './dto/withdraw.dto';

@ApiTags('Referral')
@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('validate/:code')
  @ApiOperation({ summary: 'Valida um código de indicação (público)' })
  validateCode(@Param('code') code: string) {
    return this.referralService.validateCode(code.toUpperCase());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna dados de indicação do usuário autenticado' })
  getMyReferral(@CurrentUser('id') userId: string) {
    return this.referralService.getMyReferral(userId);
  }

  @Get('withdrawals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Histórico de saques' })
  getWithdrawals(@CurrentUser('id') userId: string) {
    return this.referralService.getWithdrawals(userId);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Solicitar saque do saldo de indicação via PIX' })
  withdraw(@CurrentUser('id') userId: string, @Body() dto: WithdrawDto) {
    return this.referralService.withdraw(userId, dto);
  }
}
