import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  LoggerService,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BillingCycle, NotificationType, PaymentMethod, PaymentStatus, Plan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReferralService } from '../referral/referral.service';
import { PLANS, MAX_PAYMENT_FAILURES, PlanId } from './subscriptions.constants';
import { PagarmeService } from './pagarme.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { SubscribePixDto } from './dto/subscribe-pix.dto';

export interface WebhookPayload {
  type: string;
  data: {
    id?: string;
    subscription?: { id: string };
    status?: string;
  };
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagarme: PagarmeService,
    private readonly notifications: NotificationsService,
    private readonly referralService: ReferralService,
    @Inject('LOGGER') private readonly logger: LoggerService,
  ) {}

  getPlans() {
    return {
      plans: Object.values(PLANS).map((p) => ({
        id: p.id,
        name: p.name,
        price_cents: p.price_cents,
        billing_cycle: p.billing_cycle,
        features: [...p.features],
      })),
    };
  }

  async getMySubscription(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { trial_ends_at: true, plan: true },
    });

    const subscription = await this.prisma.subscription.findFirst({
      where: { user_id: userId, status: { not: SubscriptionStatus.EXPIRED } },
      orderBy: { created_at: 'desc' },
    });

    if (!subscription) {
      return {
        plan: 'FREE',
        status: 'TRIAL',
        billing_cycle: null,
        current_period_end: user?.trial_ends_at ?? null,
        amount_cents: 0,
        trial_ends_at: user?.trial_ends_at ?? null,
      };
    }

    return {
      plan: subscription.plan,
      status: subscription.status,
      billing_cycle: subscription.billing_cycle,
      current_period_end: subscription.current_period_end,
      amount_cents: subscription.amount_cents,
      trial_ends_at: user?.trial_ends_at ?? null,
    };
  }

  async subscribe(userId: string, dto: SubscribeDto) {
    await this.assertNoActiveSubscription(userId);

    const plan = PLANS[dto.plan_id as PlanId];
    if (!plan || plan.price_cents === 0) {
      throw new BadRequestException('Plano inválido');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    // Descriptografar email para enviar ao Pagar.me
    // O email já está no banco como criptografado, mas para fins de integração
    // usamos apenas o userId como referência no Pagar.me
    const customer = await this.pagarme.createCustomer({
      name: user.name,
      email: `user-${userId}@motoristarico.internal`,
      externalId: userId,
    });

    const intervalType = plan.billing_cycle === 'YEARLY' ? 'year' : 'month';

    const pagarmeSub = await this.pagarme.createCardSubscription({
      customerId: customer.id,
      planId: dto.plan_id,
      cardToken: dto.card_token,
      amountCents: plan.price_cents,
      intervalType,
    }).catch(() => {
      throw new BadRequestException('Cartão recusado ou dados inválidos');
    });

    const now = new Date();
    const periodEnd = plan.billing_cycle === 'YEARLY'
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.create({
        data: {
          user_id: userId,
          plan: Plan.PRO,
          billing_cycle: plan.billing_cycle as BillingCycle,
          status: SubscriptionStatus.ACTIVE,
          pagarme_sub_id: pagarmeSub.id,
          pagarme_customer_id: customer.id,
          amount_cents: plan.price_cents,
          current_period_start: now,
          current_period_end: periodEnd,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { plan: Plan.PRO, plan_expires_at: periodEnd },
      }),
    ]);

    await this.prisma.payment.create({
      data: {
        subscription_id: subscription.id,
        amount_cents: plan.price_cents,
        status: PaymentStatus.PAID,
        payment_method: PaymentMethod.CREDIT_CARD,
        paid_at: now,
      },
    });

    this.logger.log({ message: 'Assinatura ativada', userId, planId: dto.plan_id });

    return {
      message: 'Assinatura ativada com sucesso',
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        billing_cycle: subscription.billing_cycle,
        amount_cents: subscription.amount_cents,
        current_period_end: subscription.current_period_end,
      },
    };
  }

  async subscribePix(userId: string, dto: SubscribePixDto) {
    await this.assertNoActiveSubscription(userId);

    const plan = PLANS[dto.plan_id as PlanId];

    const customer = await this.pagarme.createCustomer({
      name: `Motorista ${userId.slice(0, 8)}`,
      email: `user-${userId}@motoristarico.internal`,
      externalId: userId,
    });

    const charge = await this.pagarme.createPixCharge({
      customerId: customer.id,
      amountCents: plan.price_cents,
    });

    // Subscription record criado apenas quando webhook payment.paid chegar
    // Armazenamos o customer_id para reuso
    this.logger.log({ message: 'PIX gerado', userId, planId: dto.plan_id });

    return {
      qr_code: charge.last_transaction.qr_code,
      qr_code_url: charge.last_transaction.qr_code_url,
      expires_at: charge.last_transaction.expires_at,
      amount_cents: plan.price_cents,
    };
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('Nenhuma assinatura ativa encontrada');
    }

    if (subscription.pagarme_sub_id) {
      await this.pagarme.cancelSubscription(subscription.pagarme_sub_id).catch(() => {
        // Não bloquear cancelamento local se Pagar.me falhar
        this.logger.error({ message: 'Falha ao cancelar no Pagar.me', subscriptionId: subscription.id });
      });
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.CANCELED, canceled_at: new Date() },
    });

    return {
      message: `Assinatura cancelada. Acesso Premium mantido até ${subscription.current_period_end.toISOString()}.`,
      access_until: subscription.current_period_end,
    };
  }

  /**
   * Processa webhooks do Pagar.me.
   * REGRA ABSOLUTA: validar assinatura HMAC-SHA256 antes de qualquer processamento
   * docs/05-SECURITY.md seção 7.
   */
  async handleWebhook(rawPayload: string, signature: string): Promise<void> {
    if (!this.pagarme.validateWebhookSignature(rawPayload, signature)) {
      throw new UnauthorizedException('Assinatura do webhook inválida');
    }

    const event = JSON.parse(rawPayload) as WebhookPayload;

    switch (event.type) {
      case 'payment.paid':
        await this.onPaymentPaid(event.data);
        break;
      case 'payment.failed':
        await this.onPaymentFailed(event.data);
        break;
      case 'subscription.canceled':
        await this.onSubscriptionCanceled(event.data);
        break;
      case 'charge.refunded':
        await this.onChargeRefunded(event.data);
        break;
      default:
        this.logger.log({ message: 'Webhook ignorado', type: event.type });
    }
  }

  private async onPaymentPaid(data: WebhookPayload['data']): Promise<void> {
    const pagarmeSubId = data.subscription?.id;
    if (!pagarmeSubId) return;

    const subscription = await this.prisma.subscription.findFirst({
      where: { pagarme_sub_id: pagarmeSubId },
    });
    if (!subscription) return;

    const now = new Date();
    const periodEnd = subscription.billing_cycle === BillingCycle.YEARLY
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          current_period_start: now,
          current_period_end: periodEnd,
        },
      }),
      this.prisma.user.update({
        where: { id: subscription.user_id },
        data: { plan: Plan.PRO, plan_expires_at: periodEnd },
      }),
      this.prisma.payment.create({
        data: {
          subscription_id: subscription.id,
          pagarme_charge_id: data.id,
          amount_cents: subscription.amount_cents,
          status: PaymentStatus.PAID,
          payment_method: PaymentMethod.CREDIT_CARD,
          paid_at: now,
        },
      }),
    ]);

    await this.notifications.create(subscription.user_id, {
      type: NotificationType.PAYMENT_APPROVED,
      title: 'Pagamento aprovado',
      body: 'Sua assinatura Premium foi renovada com sucesso!',
    });

    // Dispara cashback para quem indicou este assinante (fire-and-forget — falha não afeta pagamento)
    this.referralService.handlePaymentConversion(subscription.user_id).catch(() => undefined);
  }

  private async onPaymentFailed(data: WebhookPayload['data']): Promise<void> {
    const pagarmeSubId = data.subscription?.id;
    if (!pagarmeSubId) return;

    const subscription = await this.prisma.subscription.findFirst({
      where: { pagarme_sub_id: pagarmeSubId },
    });
    if (!subscription) return;

    const now = new Date();
    await this.prisma.payment.create({
      data: {
        subscription_id: subscription.id,
        pagarme_charge_id: data.id,
        amount_cents: subscription.amount_cents,
        status: PaymentStatus.FAILED,
        payment_method: PaymentMethod.CREDIT_CARD,
        failed_at: now,
        failure_reason: 'Pagamento recusado pelo Pagar.me',
      },
    });

    const failureCount = await this.prisma.payment.count({
      where: { subscription_id: subscription.id, status: PaymentStatus.FAILED },
    });

    if (failureCount >= MAX_PAYMENT_FAILURES) {
      // D+5: downgrade após 3 falhas — docs/06-BUSINESS-RULES.md seção 13
      await this.downgradeToFree(subscription.id, subscription.user_id);
    } else {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.PAST_DUE },
      });

      await this.notifications.create(subscription.user_id, {
        type: NotificationType.PAYMENT_FAILED,
        title: 'Falha no pagamento',
        body: 'Não conseguimos processar seu pagamento. Verifique seu cartão.',
      });
    }
  }

  private async onSubscriptionCanceled(data: WebhookPayload['data']): Promise<void> {
    const pagarmeSubId = data.id;
    if (!pagarmeSubId) return;

    const subscription = await this.prisma.subscription.findFirst({
      where: { pagarme_sub_id: pagarmeSubId },
    });
    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.CANCELED, canceled_at: new Date() },
    });
  }

  private async onChargeRefunded(data: WebhookPayload['data']): Promise<void> {
    if (!data.id) return;

    await this.prisma.payment.updateMany({
      where: { pagarme_charge_id: data.id },
      data: { status: PaymentStatus.REFUNDED },
    });
  }

  /** Downgrade para FREE após falhas de pagamento — docs/06-BUSINESS-RULES.md seção 13 */
  async downgradeToFree(subscriptionId: string, userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: SubscriptionStatus.EXPIRED, canceled_at: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { plan: Plan.FREE, plan_expires_at: null },
      }),
    ]);

    this.logger.warn({ message: 'Assinatura revertida para FREE por falhas de pagamento', userId });
  }

  /** Expira trials e subscriptions cujo period_end já passou */
  async expireTrials(): Promise<void> {
    const now = new Date();

    const expiredTrialUsers = await this.prisma.user.findMany({
      where: {
        plan: Plan.FREE,
        trial_ends_at: { lt: now, not: null },
      },
      select: { id: true },
    });

    if (expiredTrialUsers.length === 0) return;

    await this.prisma.user.updateMany({
      where: { id: { in: expiredTrialUsers.map((u) => u.id) } },
      data: { trial_ends_at: null },
    });

    this.logger.log({ message: 'Trials expirados limpos', count: expiredTrialUsers.length });
  }

  async expireCanceledSubscriptions(): Promise<void> {
    const now = new Date();

    const expired = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.CANCELED,
        current_period_end: { lt: now },
      },
      select: { id: true, user_id: true },
    });

    for (const sub of expired) {
      await this.prisma.$transaction([
        this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: SubscriptionStatus.EXPIRED },
        }),
        this.prisma.user.update({
          where: { id: sub.user_id },
          data: { plan: Plan.FREE, plan_expires_at: null },
        }),
      ]);
    }

    if (expired.length > 0) {
      this.logger.log({ message: 'Subscriptions canceladas expiradas', count: expired.length });
    }
  }

  private async assertNoActiveSubscription(userId: string): Promise<void> {
    const existing = await this.prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
      },
    });
    if (existing) {
      throw new ConflictException('Usuário já possui assinatura ativa');
    }
  }
}
