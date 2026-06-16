import { NotificationType } from '@prisma/client';
import { AlertsService } from './alerts.service';

// Minimal Prisma mock
const makeEarningsAgg = (amount: number) => ({ _sum: { amount } });
const makeCostsAgg = (amount: number) => ({ _sum: { amount } });

const mockPrisma = {
  financing: { findUnique: jest.fn() },
  goal: { findUnique: jest.fn() },
  earning: {
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  cost: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  alertPreference: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  notification: { create: jest.fn() },
  user: { findMany: jest.fn() },
};

const mockNotifications = { create: jest.fn() };

const mockRedis = {
  exists: jest.fn(),
  set: jest.fn(),
};

const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

const USER_ID = 'user-uuid-1';

describe('AlertsService', () => {
  let service: AlertsService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: alert enabled (no pref row = enabled)
    mockPrisma.alertPreference.findUnique.mockResolvedValue(null);
    // Default: no cooldown
    mockRedis.exists.mockResolvedValue(0);

    service = new AlertsService(
      mockPrisma as never,
      mockNotifications as never,
      mockRedis as never,
      mockLogger as never,
    );
  });

  // ─── F65 — Meta batida ────────────────────────────────────────────────────

  describe('checkGoalReached (F65)', () => {
    const DAILY_GOAL = 272.73;

    beforeEach(() => {
      mockPrisma.financing.findUnique.mockResolvedValue({ monthly_installment: 2500 });
      mockPrisma.goal.findUnique.mockResolvedValue({ daily_goal: DAILY_GOAL });
      mockPrisma.earning.aggregate.mockResolvedValue(makeEarningsAgg(350));
      mockPrisma.cost.aggregate.mockResolvedValue(makeCostsAgg(50)); // net = 300
    });

    it('sends GOAL_REACHED when daily net >= daily goal', async () => {
      // Force hour to be within 10-22 BRT window by mocking Date
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('06/16/2026, 15:00:00');

      await service.checkGoalReached(USER_ID);

      expect(mockNotifications.create).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ type: NotificationType.GOAL_REACHED }),
      );
      // Cooldown must be set
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining(`alert:f65:${USER_ID}`),
        '1',
        'EX',
        86_400,
      );

      jest.restoreAllMocks();
    });

    it('does NOT send when daily net < daily goal', async () => {
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('06/16/2026, 15:00:00');
      mockPrisma.earning.aggregate.mockResolvedValue(makeEarningsAgg(200));
      mockPrisma.cost.aggregate.mockResolvedValue(makeCostsAgg(50)); // net = 150 < 272.73

      await service.checkGoalReached(USER_ID);
      expect(mockNotifications.create).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('respects cooldown — does NOT send twice on same day', async () => {
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('06/16/2026, 15:00:00');
      mockRedis.exists.mockResolvedValue(1); // cooldown active

      await service.checkGoalReached(USER_ID);
      expect(mockNotifications.create).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('respects user preference — does NOT send when disabled', async () => {
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('06/16/2026, 15:00:00');
      mockPrisma.alertPreference.findUnique.mockResolvedValue({
        type: NotificationType.GOAL_REACHED,
        enabled: false,
      });

      await service.checkGoalReached(USER_ID);
      expect(mockNotifications.create).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('skips when hour is outside 10h-22h window', async () => {
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('06/16/2026, 23:00:00');

      await service.checkGoalReached(USER_ID);
      expect(mockNotifications.create).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  // ─── F66 — Abaixo do ritmo ────────────────────────────────────────────────

  describe('checkBelowPace (F66)', () => {
    beforeEach(() => {
      mockPrisma.financing.findUnique.mockResolvedValue({ monthly_installment: 2500 });
      mockPrisma.earning.aggregate.mockResolvedValue(makeEarningsAgg(800));
      mockPrisma.cost.aggregate.mockResolvedValue(makeCostsAgg(100)); // net = 700
      // 15 days worked, projection will be low
      mockPrisma.earning.groupBy.mockResolvedValue(new Array(15).fill({ earned_at: new Date() }));
    });

    it('sends BELOW_PACE when projection < installment', async () => {
      // Simulate mid-month: enough days remaining (>5), projection insufficient
      // net=700 in 15 days → avg/day=46.67 → projection = 46.67*15 + 700 = 1400 < 2500
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('06/16/2026, 23:00:00');

      await service.checkBelowPace(USER_ID);

      expect(mockNotifications.create).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ type: NotificationType.BELOW_PACE }),
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining(`alert:f66:${USER_ID}`),
        '1',
        'EX',
        3 * 86_400,
      );

      jest.restoreAllMocks();
    });

    it('respects 3-day cooldown', async () => {
      mockRedis.exists.mockResolvedValue(1);
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('06/16/2026, 23:00:00');

      await service.checkBelowPace(USER_ID);
      expect(mockNotifications.create).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  // ─── F67 — Parcela em risco ───────────────────────────────────────────────

  describe('checkInstallmentAtRisk (F67)', () => {
    beforeEach(() => {
      mockPrisma.financing.findUnique.mockResolvedValue({ monthly_installment: 2500 });
      mockPrisma.earning.aggregate.mockResolvedValue(makeEarningsAgg(1000));
      mockPrisma.cost.aggregate.mockResolvedValue(makeCostsAgg(200)); // net = 800
      // 800 < 2500 → deficit = 1700
    });

    it('sends INSTALLMENT_AT_RISK when deficit > 0 and days_remaining <= 5', async () => {
      // Simulate day 26 of a 30-day month → 4 days remaining
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('06/26/2026, 11:00:00');

      await service.checkInstallmentAtRisk(USER_ID);

      expect(mockNotifications.create).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ type: NotificationType.INSTALLMENT_AT_RISK }),
      );

      jest.restoreAllMocks();
    });

    it('does NOT send when days_remaining > 5', async () => {
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('06/10/2026, 11:00:00');

      await service.checkInstallmentAtRisk(USER_ID);
      expect(mockNotifications.create).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('does NOT send when no deficit (net income >= installment)', async () => {
      mockPrisma.earning.aggregate.mockResolvedValue(makeEarningsAgg(3000));
      mockPrisma.cost.aggregate.mockResolvedValue(makeCostsAgg(100)); // net = 2900 >= 2500

      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('06/26/2026, 11:00:00');

      await service.checkInstallmentAtRisk(USER_ID);
      expect(mockNotifications.create).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  // ─── F69 — Custo/km alto ──────────────────────────────────────────────────

  describe('checkHighCostPerKm (F69)', () => {
    const buildFuelCosts = (amount: number, firstOdo: number, lastOdo: number) => [
      { amount, fuel_log: { odometer_km: firstOdo } },
      { amount: 0, fuel_log: { odometer_km: lastOdo } },
    ];

    it('sends HIGH_COST_PER_KM when current > avg_3m * 1.10', async () => {
      // Current month: R$900 fuel / 1000km = R$0.90/km
      // 3-month avg: R$600 fuel / 1000km = R$0.60/km → 0.90 > 0.60*1.10=0.66 ✓
      mockPrisma.cost.findMany
        .mockResolvedValueOnce(buildFuelCosts(900, 1000, 2000)) // current
        .mockResolvedValueOnce(buildFuelCosts(600, 2000, 3000)) // month -1
        .mockResolvedValueOnce(buildFuelCosts(600, 3000, 4000)) // month -2
        .mockResolvedValueOnce(buildFuelCosts(600, 4000, 5000)); // month -3

      await service.checkHighCostPerKm(USER_ID);

      expect(mockNotifications.create).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ type: NotificationType.HIGH_COST_PER_KM }),
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining(`alert:f69:${USER_ID}`),
        '1',
        'EX',
        7 * 86_400,
      );
    });

    it('does NOT send when current <= avg_3m * 1.10', async () => {
      // Current: R$600/1000km = 0.60/km; avg: R$600/1000km = 0.60/km → 0.60 <= 0.66
      mockPrisma.cost.findMany
        .mockResolvedValueOnce(buildFuelCosts(600, 1000, 2000))
        .mockResolvedValueOnce(buildFuelCosts(600, 2000, 3000))
        .mockResolvedValueOnce(buildFuelCosts(600, 3000, 4000))
        .mockResolvedValueOnce(buildFuelCosts(600, 4000, 5000));

      await service.checkHighCostPerKm(USER_ID);
      expect(mockNotifications.create).not.toHaveBeenCalled();
    });

    it('respects 7-day cooldown', async () => {
      mockRedis.exists.mockResolvedValue(1);
      await service.checkHighCostPerKm(USER_ID);
      expect(mockPrisma.cost.findMany).not.toHaveBeenCalled();
      expect(mockNotifications.create).not.toHaveBeenCalled();
    });
  });

  // ─── Alert preferences ────────────────────────────────────────────────────

  describe('updatePreferences', () => {
    it('upserts each preference', async () => {
      mockPrisma.alertPreference.upsert.mockResolvedValue({});
      mockPrisma.alertPreference.findMany.mockResolvedValue([]);

      await service.updatePreferences(USER_ID, [
        { type: NotificationType.GOAL_REACHED, enabled: false },
        { type: NotificationType.BELOW_PACE, enabled: true },
      ]);

      expect(mockPrisma.alertPreference.upsert).toHaveBeenCalledTimes(2);
    });
  });
});
