import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReferralService } from '../referral/referral.service';
import { PagarmeService } from './pagarme.service';
import { SubscriptionsService } from './subscriptions.service';
import { SubscribeDto } from './dto/subscribe.dto';

const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  payment: {
    create: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockPagarme = {
  createCustomer: jest.fn(),
  createCardSubscription: jest.fn(),
  createPixCharge: jest.fn(),
  cancelSubscription: jest.fn(),
  validateWebhookSignature: jest.fn(),
};

const mockNotifications = {
  create: jest.fn(),
};

const mockReferral = {
  handlePaymentConversion: jest.fn().mockResolvedValue(undefined),
};

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PagarmeService, useValue: mockPagarme },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: ReferralService, useValue: mockReferral },
        { provide: 'LOGGER', useValue: mockLogger },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    jest.clearAllMocks();
  });

  describe('getPlans', () => {
    it('deve retornar 3 planos (free, mensal, anual)', () => {
      const result = service.getPlans();
      expect(result.plans).toHaveLength(3);
      expect(result.plans.map((p) => p.id)).toEqual(['free', 'premium_monthly', 'premium_yearly']);
    });

    it('plano free deve ter price_cents = 0', () => {
      const result = service.getPlans();
      const free = result.plans.find((p) => p.id === 'free')!;
      expect(free.price_cents).toBe(0);
    });

    it('plano mensal deve ter price_cents = 990 (R$ 9,90)', () => {
      const result = service.getPlans();
      const monthly = result.plans.find((p) => p.id === 'premium_monthly')!;
      expect(monthly.price_cents).toBe(990);
    });

    it('plano anual deve ter price_cents = 8900 (R$ 89)', () => {
      const result = service.getPlans();
      const yearly = result.plans.find((p) => p.id === 'premium_yearly')!;
      expect(yearly.price_cents).toBe(8900);
    });
  });

  describe('handleWebhook — validação de assinatura (docs/05-SECURITY.md seção 7)', () => {
    it('assinatura válida → processa o evento', async () => {
      mockPagarme.validateWebhookSignature.mockReturnValue(true);
      const payload = JSON.stringify({ type: 'unknown.event', data: {} });

      await expect(service.handleWebhook(payload, 'valid-sig')).resolves.not.toThrow();
      expect(mockPagarme.validateWebhookSignature).toHaveBeenCalledWith(payload, 'valid-sig');
    });

    it('assinatura inválida → rejeita com 401', async () => {
      mockPagarme.validateWebhookSignature.mockReturnValue(false);
      const payload = JSON.stringify({ type: 'payment.paid', data: {} });

      await expect(service.handleWebhook(payload, 'invalid-sig'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('handleWebhook — payment.paid', () => {
    it('ativa assinatura e atualiza plano do usuário para PRO', async () => {
      mockPagarme.validateWebhookSignature.mockReturnValue(true);

      const subscription = {
        id: 'sub-id',
        user_id: 'user-id',
        amount_cents: 990,
        billing_cycle: 'MONTHLY',
      };
      mockPrisma.subscription.findFirst.mockResolvedValue(subscription);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);
      mockPrisma.payment.create.mockResolvedValue({});
      mockNotifications.create.mockResolvedValue(undefined);

      const payload = JSON.stringify({
        type: 'payment.paid',
        data: { id: 'charge-id', subscription: { id: 'pagarme-sub-id' } },
      });

      await service.handleWebhook(payload, 'valid-sig');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockNotifications.create).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({ type: 'PAYMENT_APPROVED' }),
      );
    });
  });

  describe('handleWebhook — payment.failed → downgrade após 3 falhas', () => {
    it('1ª falha → status PAST_DUE, sem downgrade', async () => {
      mockPagarme.validateWebhookSignature.mockReturnValue(true);

      const subscription = {
        id: 'sub-id',
        user_id: 'user-id',
        amount_cents: 990,
        billing_cycle: 'MONTHLY',
      };
      mockPrisma.subscription.findFirst.mockResolvedValue(subscription);
      mockPrisma.payment.create.mockResolvedValue({});
      mockPrisma.payment.count.mockResolvedValue(1); // apenas 1 falha
      mockPrisma.subscription.update.mockResolvedValue({});
      mockNotifications.create.mockResolvedValue(undefined);

      const payload = JSON.stringify({
        type: 'payment.failed',
        data: { id: 'charge-id', subscription: { id: 'pagarme-sub-id' } },
      });

      await service.handleWebhook(payload, 'valid-sig');

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: SubscriptionStatus.PAST_DUE } }),
      );
    });

    it('3ª falha → downgrade automático para FREE (docs/06-BUSINESS-RULES.md seção 13)', async () => {
      mockPagarme.validateWebhookSignature.mockReturnValue(true);

      const subscription = {
        id: 'sub-id',
        user_id: 'user-id',
        amount_cents: 990,
        billing_cycle: 'MONTHLY',
      };
      mockPrisma.subscription.findFirst.mockResolvedValue(subscription);
      mockPrisma.payment.create.mockResolvedValue({});
      mockPrisma.payment.count.mockResolvedValue(3); // 3 falhas = máximo
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const payload = JSON.stringify({
        type: 'payment.failed',
        data: { id: 'charge-id', subscription: { id: 'pagarme-sub-id' } },
      });

      await service.handleWebhook(payload, 'valid-sig');

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({}), // subscription update to EXPIRED
          expect.objectContaining({}), // user update to FREE
        ]),
      );
    });
  });

  describe('cancelSubscription', () => {
    it('cancela assinatura ativa e mantém acesso até current_period_end', async () => {
      const periodEnd = new Date('2026-07-15');
      const subscription = {
        id: 'sub-id',
        user_id: 'user-id',
        pagarme_sub_id: 'pagarme-sub-id',
        current_period_end: periodEnd,
      };
      mockPrisma.subscription.findFirst.mockResolvedValue(subscription);
      mockPagarme.cancelSubscription.mockResolvedValue(undefined);
      mockPrisma.subscription.update.mockResolvedValue({});

      const result = await service.cancelSubscription('user-id');

      expect(result.access_until).toEqual(periodEnd);
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: SubscriptionStatus.CANCELED, canceled_at: expect.any(Date) } }),
      );
    });

    it('lança NotFoundException quando não há assinatura ativa', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      await expect(service.cancelSubscription('user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('subscribe', () => {
    it('lança ConflictException se usuário já tem assinatura ativa', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ id: 'existing-sub' });

      const dto: SubscribeDto = {
        plan_id: 'premium_monthly',
        payment_method: 'CREDIT_CARD' as never,
        card_token: 'tok_test',
      };

      await expect(service.subscribe('user-id', dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('expireTrials', () => {
    it('limpa trial_ends_at de usuários FREE com trial expirado', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
      mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });

      await service.expireTrials();

      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-1', 'user-2'] } },
        data: { trial_ends_at: null },
      });
    });

    it('não chama updateMany quando não há trials expirados', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.expireTrials();

      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    });
  });
});
