import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import {
  averageOf,
  calculateDailyGoal,
  calculateMonthlyGoal,
  firstDayOfMonth,
} from '../../common/utils/financial-calculations';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recalcula e persiste a meta do mês atual quando o financiamento é criado/atualizado.
   * docs/06-BUSINESS-RULES.md seção 1: usa média dos últimos ≤3 meses de custos, ou 0.
   */
  async recalculate(
    userId: string,
    monthlyInstallment: number,
    desiredIncome: number,
    workDaysPerMonth: number,
  ): Promise<void> {
    const estimatedCosts = await this.estimateMonthlyCosts(userId);

    const daily = calculateDailyGoal(
      monthlyInstallment,
      estimatedCosts,
      desiredIncome,
      workDaysPerMonth,
    );
    const monthly = calculateMonthlyGoal(monthlyInstallment, estimatedCosts, desiredIncome);
    const referenceMonth = firstDayOfMonth(new Date());

    await this.prisma.goal.upsert({
      where: { user_id_reference_month: { user_id: userId, reference_month: referenceMonth } },
      create: {
        user_id: userId,
        reference_month: referenceMonth,
        daily_goal: daily,
        monthly_goal: monthly,
      },
      update: {
        daily_goal: daily,
        monthly_goal: monthly,
        calculated_at: new Date(),
      },
    });
  }

  /** Média dos custos mensais totais dos últimos ≤3 meses fechados. Retorna 0 se sem histórico. */
  private async estimateMonthlyCosts(userId: string): Promise<number> {
    const now = new Date();
    const startOfCurrentMonth = firstDayOfMonth(now);

    // Busca os 3 meses anteriores
    const threeMonthsAgo = new Date(startOfCurrentMonth);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const costsPerMonth = await this.prisma.cost.groupBy({
      by: ['cost_date'],
      where: {
        user_id: userId,
        cost_date: { gte: threeMonthsAgo, lt: startOfCurrentMonth },
      },
      _sum: { amount: true },
    });

    if (costsPerMonth.length === 0) return 0;

    // Agrupa por mês (YYYY-MM) para calcular total por mês
    const monthlyTotals = new Map<string, number>();
    for (const row of costsPerMonth) {
      const d = new Date(row.cost_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const amount = Number((row._sum.amount as Decimal | null) ?? 0);
      monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + amount);
    }

    return averageOf(Array.from(monthlyTotals.values()));
  }
}
