import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePlan } from '../../common/decorators/require-plan.decorator';
import { PlanGuard } from '../../common/guards/plan.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { SubscribeDto } from './dto/subscribe.dto';
import { SubscribePixDto } from './dto/subscribe-pix.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Lista planos disponíveis' })
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('me')
  @ApiOperation({ summary: 'Retorna assinatura atual do usuário' })
  getMySubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getMySubscription(user.sub);
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assina plano com cartão tokenizado pelo Pagar.me' })
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubscribeDto) {
    return this.subscriptionsService.subscribe(user.sub, dto);
  }

  @Post('subscribe-pix')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assina plano anual via PIX' })
  subscribePix(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubscribePixDto) {
    return this.subscriptionsService.subscribePix(user.sub, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancela assinatura — acesso mantido até fim do período' })
  cancelSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.cancelSubscription(user.sub);
  }

  /**
   * Webhook do Pagar.me — validado por HMAC-SHA256.
   * REGRA ABSOLUTA: validar assinatura antes de qualquer processamento.
   * docs/05-SECURITY.md seção 7.
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recebe eventos do Pagar.me [HMAC validado]' })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-pagarme-signature') signature: string,
  ) {
    const rawPayload = req.rawBody?.toString('utf-8') ?? JSON.stringify(req.body);
    await this.subscriptionsService.handleWebhook(rawPayload, signature ?? '');
    return { received: true };
  }

  /** Endpoint de demonstração do PlanGuard — bloqueia FREE em rotas PRO */
  @Get('pro-feature')
  @UseGuards(PlanGuard)
  @RequirePlan('PRO')
  @ApiOperation({ summary: 'Exemplo de endpoint restrito a PRO' })
  proFeature(@CurrentUser() user: AuthenticatedUser) {
    return { userId: user.sub, message: 'Acesso exclusivo Premium' };
  }
}
