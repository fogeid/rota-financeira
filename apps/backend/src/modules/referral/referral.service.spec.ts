import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReferralStatus, ReferralType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReferralService } from './referral.service';
import { calculateCashback, getReferralLevel, getNextLevelAt } from './referral.constants';

// ─── pure-function unit tests (no DB) ────────────────────────────────────────

describe('referral.constants', () => {
  describe('calculateCashback', () => {
    it('retorna 5 para 1 conversão', () => expect(calculateCashback(1)).toBe(5));
    it('retorna 5 para 14 conversões', () => expect(calculateCashback(14)).toBe(5));
    it('retorna 6 para 15 conversões', () => expect(calculateCashback(15)).toBe(6));
    it('retorna 6 para 29 conversões', () => expect(calculateCashback(29)).toBe(6));
    it('retorna 7 para 30 conversões', () => expect(calculateCashback(30)).toBe(7));
    it('retorna 7 para 100 conversões', () => expect(calculateCashback(100)).toBe(7));
  });

  describe('getReferralLevel', () => {
    it('INICIANTE para 0 conversões', () => expect(getReferralLevel(0)).toBe('INICIANTE'));
    it('INICIANTE para 14 conversões', () => expect(getReferralLevel(14)).toBe('INICIANTE'));
    it('PARCEIRO para 15 conversões', () => expect(getReferralLevel(15)).toBe('PARCEIRO'));
    it('EMBAIXADOR para 30 conversões', () => expect(getReferralLevel(30)).toBe('EMBAIXADOR'));
  });

  describe('getNextLevelAt', () => {
    it('próximo nível é 15 para INICIANTE', () => expect(getNextLevelAt(0)).toBe(15));
    it('próximo nível é 30 para PARCEIRO', () => expect(getNextLevelAt(15)).toBe(30));
    it('retorna null para EMBAIXADOR', () => expect(getNextLevelAt(30)).toBeNull());
  });
});

// ─── service integration tests (mocked Prisma) ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma: any = {
  user: {
    findUnique: jest.fn(),
  },
  referralCode: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  referralBalance: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  referral: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  referralWithdrawal: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $transaction: jest.fn(async (ops: any) => {
    if (Array.isArray(ops)) return Promise.all(ops);
    if (typeof ops === 'function') return ops(mockPrisma);
    return ops;
  }),
};

const mockNotifications = { create: jest.fn() };
const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
const mockCache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

describe('ReferralService', () => {
  let service: ReferralService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: 'LOGGER', useValue: mockLogger },
      ],
    }).compile();

    service = module.get(ReferralService);
  });

  // ── generateUniqueCode ──────────────────────────────────────────────────────

  describe('generateUniqueCode', () => {
    it('gera código com prefixo do nome e 2 dígitos', async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue(null);
      const code = await service.generateUniqueCode('Carlos');
      expect(code).toMatch(/^CARLOS\d{2}$/);
    });

    it('tenta novamente quando código já existe', async () => {
      mockPrisma.referralCode.findUnique
        .mockResolvedValueOnce({ code: 'CARLOS22' })
        .mockResolvedValueOnce(null);
      const code = await service.generateUniqueCode('Carlos');
      expect(mockPrisma.referralCode.findUnique).toHaveBeenCalledTimes(2);
      expect(code).toMatch(/^CARLOS\d{2}$/);
    });

    it('preenche nome curto com X até 6 chars', async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue(null);
      const code = await service.generateUniqueCode('Jo');
      expect(code).toMatch(/^JOXXXX\d{2}$/);
    });
  });

  // ── processReferralOnRegister ───────────────────────────────────────────────

  describe('processReferralOnRegister', () => {
    it('retorna null para código inexistente', async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue(null);
      const result = await service.processReferralOnRegister('user-2', 'INVALID1');
      expect(result).toBeNull();
    });

    it('retorna null para auto-indicação', async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({ id: '1', user_id: 'user-1', type: ReferralType.USER });
      const result = await service.processReferralOnRegister('user-1', 'CARLOS22');
      expect(result).toBeNull();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('retorna 7 dias de trial para código USER', async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({ id: '1', user_id: 'user-1', type: ReferralType.USER });
      mockPrisma.$transaction.mockResolvedValue([]);
      const result = await service.processReferralOnRegister('user-2', 'CARLOS22');
      expect(result).toEqual({ trialDays: 7 });
    });

    it('retorna 14 dias de trial para código INFLUENCER', async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({ id: '2', user_id: 'user-1', type: ReferralType.INFLUENCER });
      mockPrisma.$transaction.mockResolvedValue([]);
      const result = await service.processReferralOnRegister('user-2', 'INFLUEX11');
      expect(result).toEqual({ trialDays: 14 });
    });
  });

  // ── handlePaymentConversion ─────────────────────────────────────────────────

  describe('handlePaymentConversion', () => {
    it('não faz nada se usuário não tem referral', async () => {
      mockPrisma.referral.findUnique.mockResolvedValue(null);
      await service.handlePaymentConversion('user-1');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('não reprocessa referral já convertido', async () => {
      mockPrisma.referral.findUnique.mockResolvedValue({
        id: 'r1', status: ReferralStatus.CONVERTED, referral_code: { type: ReferralType.USER, user_id: 'u1' },
      });
      await service.handlePaymentConversion('user-2');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('credita R$5 para primeira conversão (USER)', async () => {
      mockPrisma.referral.findUnique.mockResolvedValue({
        id: 'r1', status: ReferralStatus.TRIAL,
        referral_code: { id: 'rc1', type: ReferralType.USER, user_id: 'referrer-1' },
      });
      mockPrisma.referralBalance.findUnique.mockResolvedValue({ user_id: 'referrer-1', conversions: 0 });
      mockPrisma.$transaction.mockResolvedValue([]);
      mockNotifications.create.mockResolvedValue(undefined);

      await service.handlePaymentConversion('user-2');

      const txOps = mockPrisma.$transaction.mock.calls[0][0];
      expect(txOps).toHaveLength(2);
      expect(mockNotifications.create).toHaveBeenCalledWith('referrer-1', expect.objectContaining({
        title: 'Cashback disponível!',
        type: 'CASHBACK_AVAILABLE',
      }));
    });

    it('credita cashback direto em available após conversão (sem espera)', async () => {
      mockPrisma.referral.findUnique.mockResolvedValue({
        id: 'r1', status: ReferralStatus.TRIAL,
        referral_code: { id: 'rc1', type: ReferralType.USER, user_id: 'referrer-1' },
      });
      mockPrisma.referralBalance.findUnique.mockResolvedValue({ user_id: 'referrer-1', conversions: 0 });
      mockPrisma.$transaction.mockResolvedValue([]);
      mockNotifications.create.mockResolvedValue(undefined);

      await service.handlePaymentConversion('user-2');

      expect(mockPrisma.referralBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ available: { increment: 5 } }) }),
      );
    });

    it('apenas atualiza status para INFLUENCER (sem cashback imediato)', async () => {
      mockPrisma.referral.findUnique.mockResolvedValue({
        id: 'r2', status: ReferralStatus.TRIAL,
        referral_code: { type: ReferralType.INFLUENCER, user_id: 'inf-1' },
      });
      mockPrisma.referral.update.mockResolvedValue({});
      await service.handlePaymentConversion('user-3');
      expect(mockPrisma.referral.update).toHaveBeenCalled();
      expect(mockPrisma.referralBalance.findUnique).not.toHaveBeenCalled();
    });
  });

  // ── getMyReferral ───────────────────────────────────────────────────────────

  describe('getMyReferral', () => {
    it('retorna dados do cache quando disponível', async () => {
      const cached = { code: 'CACHED1', conversions: 0 };
      mockCache.get.mockResolvedValueOnce(cached);
      const result = await service.getMyReferral('user-1');
      expect(result).toEqual(cached);
      expect(mockPrisma.referralCode.findUnique).not.toHaveBeenCalled();
    });

    it('auto-cria código para usuário legado sem código (self-healing)', async () => {
      mockCache.get.mockResolvedValueOnce(null);
      // Chamadas a referralCode.findUnique:
      //   1) busca inicial (Promise.all) → null (sem código)
      //   2) dentro de generateUniqueCode (verificar unicidade) → null (código livre)
      //   3) re-fetch pós-criação → código criado
      mockPrisma.referralCode.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ user_id: 'user-1', code: 'LEGADO22' });
      mockPrisma.referralBalance.findUnique
        .mockResolvedValueOnce(null) // busca inicial
        .mockResolvedValueOnce({ user_id: 'user-1', conversions: 0, available: 0, pending: 0, total_earned: 0, total_withdrawn: 0 }); // pós-criação
      mockPrisma.referral.findMany.mockResolvedValueOnce([]);
      mockPrisma.user.findUnique.mockResolvedValueOnce({ name: 'Legado Silva' });
      mockPrisma.$transaction.mockResolvedValueOnce([]);

      const result = await service.getMyReferral('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' }, select: { name: true } });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect((result as Record<string, unknown>).code).toBe('LEGADO22');
    });

    it('retorna dados completos quando código existe', async () => {
      mockCache.get.mockResolvedValueOnce(null);
      mockPrisma.referralCode.findUnique.mockResolvedValueOnce({ user_id: 'user-1', code: 'CARLO33' });
      mockPrisma.referralBalance.findUnique.mockResolvedValueOnce({
        user_id: 'user-1', conversions: 0, available: 10, pending: 0, total_earned: 10, total_withdrawn: 0,
      });
      mockPrisma.referral.findMany.mockResolvedValueOnce([]);

      const result = await service.getMyReferral('user-1') as Record<string, unknown>;

      expect(result.code).toBe('CARLO33');
      expect(result.level).toBe('INICIANTE');
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  // ── withdraw ────────────────────────────────────────────────────────────────

  describe('withdraw', () => {
    it('bloqueia saque com saldo e conversões insuficientes', async () => {
      mockPrisma.referralBalance.findUnique.mockResolvedValue({ user_id: 'u1', available: 5, conversions: 2 });
      await expect(service.withdraw('u1', { pix_key: '11999', amount: 5 }))
        .rejects.toThrow('Saque liberado a partir de');
    });

    it('permite saque com 4 conversões mesmo se saldo < R$ 20', async () => {
      mockPrisma.referralBalance.findUnique.mockResolvedValue({ user_id: 'u1', available: 18, conversions: 4 });
      mockPrisma.referralWithdrawal.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
        mockPrisma.referralWithdrawal.create.mockResolvedValue({ id: 'w2' });
        return fn(mockPrisma);
      });

      const result = await service.withdraw('u1', { pix_key: '11999', amount: 18 });
      expect(result.withdrawal_id).toBe('w2');
    });

    it('lança BadRequest se saldo insuficiente (sem conversões suficientes)', async () => {
      mockPrisma.referralBalance.findUnique.mockResolvedValue({ user_id: 'u1', available: 5, conversions: 0 });
      await expect(service.withdraw('u1', { pix_key: '11999', amount: 20 })).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequest se valor maior que saldo', async () => {
      mockPrisma.referralBalance.findUnique.mockResolvedValue({ user_id: 'u1', available: 25, conversions: 0 });
      await expect(service.withdraw('u1', { pix_key: '11999', amount: 30 })).rejects.toThrow(BadRequestException);
    });

    it('cria saque e decrementa saldo', async () => {
      mockPrisma.referralBalance.findUnique.mockResolvedValue({ user_id: 'u1', available: 50 });
      mockPrisma.referralWithdrawal.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
        mockPrisma.referralWithdrawal.create.mockResolvedValue({ id: 'w1' });
        return fn(mockPrisma);
      });

      const result = await service.withdraw('u1', { pix_key: '11999', amount: 20 });
      expect(result.withdrawal_id).toBe('w1');
    });
  });
});
