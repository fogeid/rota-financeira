import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import Redis from 'ioredis';
import { calculateCostPerKm, firstDayOfMonth, lastDayOfMonth } from '../../common/utils/financial-calculations';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { NotificationsService } from '../notifications/notifications.service';

const BRASILIA_TZ = 'America/Sao_Paulo';

function nowInBrasilia(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: BRASILIA_TZ }));
}

function todayKey(): string {
  const d = nowInBrasilia();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject('LOGGER') private readonly logger: LoggerService,
  ) {}

  // ─── Preferences ────────────────────────────────────────────────────────────

  async getPreferences(userId: string) {
    const prefs = await this.prisma.alertPreference.findMany({ where: { user_id: userId } });
    return { preferences: prefs.map((p) => ({ type: p.type, enabled: p.enabled })) };
  }

  async updatePreferences(userId: string, items: Array<{ type: NotificationType; enabled: boolean }>) {
    await Promise.all(
      items.map((item) =>
        this.prisma.alertPreference.upsert({
          where: { user_id_type: { user_id: userId, type: item.type } },
          create: { user_id: userId, type: item.type, enabled: item.enabled },
          update: { enabled: item.enabled },
        }),
      ),
    );
    return this.getPreferences(userId);
  }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  private async isAlertEnabled(userId: string, type: NotificationType): Promise<boolean> {
    const pref = await this.prisma.alertPreference.findUnique({
      where: { user_id_type: { user_id: userId, type } },
    });
    // Default: enabled when no preference row exists
    return pref?.enabled !== false;
  }

  private async hasCooldown(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  /** Atomically sets the cooldown key (SET NX EX). Returns true if acquired (no prior cooldown). */
  private async acquireCooldown(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  // ─── F65 — Meta batida ───────────────────────────────────────────────────────

  /**
   * Verifica F65 para um usuário: lucro_líquido_dia >= meta_diária.
   * Envia 1x por dia entre 10h–22h (horário de Brasília).
   */
  async checkGoalReached(userId: string): Promise<void> {
    const brasiliaHour = nowInBrasilia().getHours();
    if (brasiliaHour < 10 || brasiliaHour > 22) return;

    const cooldownKey = `alert:f65:${userId}:${todayKey()}`;
    if (await this.hasCooldown(cooldownKey)) return;
    if (!(await this.isAlertEnabled(userId, NotificationType.GOAL_REACHED))) return;

    const financing = await this.prisma.financing.findUnique({ where: { user_id: userId } });
    if (!financing) return;

    const now = nowInBrasilia();
    const goal = await this.prisma.goal.findUnique({
      where: { user_id_reference_month: { user_id: userId, reference_month: firstDayOfMonth(now) } },
    });
    if (!goal) return;

    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [earningsAgg, costsAgg] = await Promise.all([
      this.prisma.earning.aggregate({
        where: { user_id: userId, earned_at: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.cost.aggregate({
        where: { user_id: userId, cost_date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

    const dailyNet =
      Number((earningsAgg._sum.amount as Decimal | null) ?? 0) -
      Number((costsAgg._sum.amount as Decimal | null) ?? 0);
    const dailyGoal = Number(goal.daily_goal as Decimal);

    if (dailyNet >= dailyGoal) {
      if (!(await this.acquireCooldown(cooldownKey, 86_400))) return;
      await this.notifications.create(userId, {
        type: NotificationType.GOAL_REACHED,
        title: 'Meta diária atingida! 🎯',
        body: `Você lucrou R$ ${dailyNet.toFixed(2)} hoje. Meta: R$ ${dailyGoal.toFixed(2)}`,
        data: { daily_net: dailyNet, daily_goal: dailyGoal },
      });
    }
  }

  async checkGoalReachedForAllUsers(): Promise<void> {
    const brasiliaHour = nowInBrasilia().getHours();
    if (brasiliaHour < 10 || brasiliaHour > 22) return;

    const users = await this.prisma.user.findMany({
      where: { is_active: true, deleted_at: null, financing: { isNot: null } },
      select: { id: true },
    });
    for (const user of users) {
      try {
        await this.checkGoalReached(user.id);
      } catch (err) {
        this.logger.warn(`F65 check error for user=${user.id}: ${String(err)}`);
      }
    }
  }

  // ─── F66 — Abaixo do ritmo ───────────────────────────────────────────────────

  async checkBelowPaceForAllUsers(): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { is_active: true, deleted_at: null, financing: { isNot: null } },
      select: { id: true },
    });
    for (const user of users) {
      try {
        await this.checkBelowPace(user.id);
      } catch (err) {
        this.logger.warn(`F66 check error for user=${user.id}: ${String(err)}`);
      }
    }
  }

  async checkBelowPace(userId: string): Promise<void> {
    const cooldownKey = `alert:f66:${userId}`;
    if (await this.hasCooldown(cooldownKey)) return;
    if (!(await this.isAlertEnabled(userId, NotificationType.BELOW_PACE))) return;

    const financing = await this.prisma.financing.findUnique({ where: { user_id: userId } });
    if (!financing) return;

    const now = nowInBrasilia();
    const start = firstDayOfMonth(now);
    const end = lastDayOfMonth(now);
    const daysInMonth = end.getDate();
    const today = now.getDate();
    const daysRemaining = daysInMonth - today;

    if (daysRemaining <= 5) return; // F67 handles this case

    const earningsAgg = await this.prisma.earning.aggregate({
      where: { user_id: userId, earned_at: { gte: start, lte: now } },
      _sum: { amount: true },
    });
    const costsAgg = await this.prisma.cost.aggregate({
      where: { user_id: userId, cost_date: { gte: start, lte: now } },
      _sum: { amount: true },
    });

    const accumulated =
      Number((earningsAgg._sum.amount as Decimal | null) ?? 0) -
      Number((costsAgg._sum.amount as Decimal | null) ?? 0);

    const daysWorked = await this.prisma.earning.groupBy({
      by: ['earned_at'],
      where: { user_id: userId, earned_at: { gte: start, lte: now } },
    });
    const workedCount = daysWorked.length;
    if (workedCount === 0) return;

    const projection = (accumulated / workedCount) * daysRemaining + accumulated;
    const installment = Number(financing.monthly_installment as Decimal);

    if (projection < installment) {
      if (!(await this.acquireCooldown(cooldownKey, 3 * 86_400))) return;
      await this.notifications.create(userId, {
        type: NotificationType.BELOW_PACE,
        title: 'Você está abaixo do ritmo',
        body: `Projeção: R$ ${projection.toFixed(2)} / Parcela: R$ ${installment.toFixed(2)}`,
        data: { projection, installment, days_remaining: daysRemaining },
      });
    }
  }

  // ─── F67 — Parcela em risco ──────────────────────────────────────────────────

  async checkInstallmentAtRiskForAllUsers(): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { is_active: true, deleted_at: null, financing: { isNot: null } },
      select: { id: true },
    });
    for (const user of users) {
      try {
        await this.checkInstallmentAtRisk(user.id);
      } catch (err) {
        this.logger.warn(`F67 check error for user=${user.id}: ${String(err)}`);
      }
    }
  }

  async checkInstallmentAtRisk(userId: string): Promise<void> {
    const cooldownKey = `alert:f67:${userId}:${todayKey()}`;
    if (await this.hasCooldown(cooldownKey)) return;
    if (!(await this.isAlertEnabled(userId, NotificationType.INSTALLMENT_AT_RISK))) return;

    const financing = await this.prisma.financing.findUnique({ where: { user_id: userId } });
    if (!financing) return;

    const now = nowInBrasilia();
    const start = firstDayOfMonth(now);
    const daysInMonth = lastDayOfMonth(now).getDate();
    const daysRemaining = daysInMonth - now.getDate();

    if (daysRemaining > 5) return;

    const [earningsAgg, costsAgg] = await Promise.all([
      this.prisma.earning.aggregate({
        where: { user_id: userId, earned_at: { gte: start, lte: now } },
        _sum: { amount: true },
      }),
      this.prisma.cost.aggregate({
        where: { user_id: userId, cost_date: { gte: start, lte: now } },
        _sum: { amount: true },
      }),
    ]);

    const accumulated =
      Number((earningsAgg._sum.amount as Decimal | null) ?? 0) -
      Number((costsAgg._sum.amount as Decimal | null) ?? 0);
    const installment = Number(financing.monthly_installment as Decimal);
    const deficit = installment - accumulated;

    if (deficit > 0) {
      if (!(await this.acquireCooldown(cooldownKey, 86_400))) return;
      await this.notifications.create(userId, {
        type: NotificationType.INSTALLMENT_AT_RISK,
        title: 'Parcela em risco!',
        body: `Faltam R$ ${deficit.toFixed(2)} em ${daysRemaining} dias para o vencimento`,
        data: { deficit, days_remaining: daysRemaining },
      });
    }
  }

  // ─── F69 — Custo/km alto ────────────────────────────────────────────────────

  async checkHighCostPerKm(userId: string): Promise<void> {
    const cooldownKey = `alert:f69:${userId}`;
    if (await this.hasCooldown(cooldownKey)) return;
    if (!(await this.isAlertEnabled(userId, NotificationType.HIGH_COST_PER_KM))) return;

    const now = nowInBrasilia();
    const currentStart = firstDayOfMonth(now);
    const currentEnd = lastDayOfMonth(now);

    const currentCostPerKm = await this.calcCostPerKm(userId, currentStart, currentEnd);
    if (currentCostPerKm === null) return;

    // Average of last 3 months
    const monthlyKmCosts: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const refDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cost = await this.calcCostPerKm(userId, firstDayOfMonth(refDate), lastDayOfMonth(refDate));
      if (cost !== null) monthlyKmCosts.push(cost);
    }
    if (monthlyKmCosts.length === 0) return;

    const avg3m = monthlyKmCosts.reduce((s, v) => s + v, 0) / monthlyKmCosts.length;

    if (currentCostPerKm > avg3m * 1.10) {
      if (!(await this.acquireCooldown(cooldownKey, 7 * 86_400))) return;
      await this.notifications.create(userId, {
        type: NotificationType.HIGH_COST_PER_KM,
        title: 'Custo/km alto',
        body: `Seu custo atual é R$ ${currentCostPerKm.toFixed(2)}/km (média: R$ ${avg3m.toFixed(2)}/km)`,
        data: { current: currentCostPerKm, avg_3m: avg3m },
      });
    }
  }

  private async calcCostPerKm(userId: string, start: Date, end: Date): Promise<number | null> {
    const fuelCosts = await this.prisma.cost.findMany({
      where: { user_id: userId, cost_date: { gte: start, lte: end }, type: 'FUEL' },
      include: { fuel_log: true },
    });
    const totalFuel = fuelCosts.reduce((s, c) => s + Number(c.amount as Decimal), 0);
    const odometers = fuelCosts
      .filter((c) => c.fuel_log != null)
      .map((c) => Number(c.fuel_log!.odometer_km as Decimal))
      .sort((a, b) => a - b);

    return calculateCostPerKm(
      totalFuel,
      odometers.length > 0 ? odometers[0] : null,
      odometers.length > 0 ? odometers[odometers.length - 1] : null,
    );
  }

  // ─── F72/F73 — Sync status notifications (called from sync processor) ───────

  async notifySyncSuccess(userId: string): Promise<void> {
    if (!(await this.isAlertEnabled(userId, NotificationType.SYNC_SUCCESS))) return;
    await this.notifications.create(userId, {
      type: NotificationType.SYNC_SUCCESS,
      title: 'Sync concluído',
      body: 'Suas corridas foram atualizadas com sucesso.',
    });
  }

  async notifySyncFailed(userId: string, platform: string): Promise<void> {
    await this.notifications.create(userId, {
      type: NotificationType.SYNC_FAILED,
      title: 'Sincronização falhou',
      body: `Não conseguimos sincronizar suas corridas de ${platform}. Toque para tentar novamente.`,
      data: { platform },
    });
  }
}
