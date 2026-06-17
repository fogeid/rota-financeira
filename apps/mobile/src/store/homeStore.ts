import { create } from 'zustand';
import { financingService } from '../services/financingService';
import { earningsService } from '../services/earningsService';
import { costsService } from '../services/costsService';
import { integrationsService } from '../services/integrationsService';
import { taxesService } from '../services/taxesService';
import type { HomeData, EarningItem } from '../types/api';

const DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

function buildWeekDays(goal: number, earnings: EarningItem[]) {
  const today = new Date();
  const todayDow = today.getDay();
  const dayTotals: Record<number, number> = {};

  for (const e of earnings) {
    const d = new Date(e.earned_at);
    const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff < 7) {
      const dow = d.getDay();
      dayTotals[dow] = (dayTotals[dow] ?? 0) + e.amount;
    }
  }

  return DAYS.map((day, i) => ({
    day,
    value: i <= todayDow ? (dayTotals[i] ?? 0) : 0,
    goal,
  }));
}

interface HomeStore {
  data: HomeData | null;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

export const useHomeStore = create<HomeStore>((set) => ({
  data: null,
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const thisMonth = new Date().toISOString().slice(0, 7);

      const [financing, progress, todaySummary, weekSummary, costsSummary, integrationsRes, taxMonth, weekEarnings] =
        await Promise.all([
          financingService.getData(),
          financingService.getProgress(),
          earningsService.summary('today'),
          earningsService.summary('week'),
          costsService.summary(),
          integrationsService.status(),
          taxesService.monthly(),
          earningsService.list({ month: thisMonth }),
        ]);

      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const daily_net = todaySummary.gross_total - costsSummary.total / daysInMonth;
      const goal_progress = Math.round((daily_net / financing.calculated_daily_goal) * 100);

      const alerts: HomeData['alerts'] = [];
      if (goal_progress < 60) {
        alerts.push({
          variant: 'amber',
          message: `Você está ${100 - goal_progress}% abaixo da meta de hoje. Ainda dá tempo de recuperar!`,
        });
      }
      if (progress.days_until_due <= 5 && progress.deficit > 0) {
        alerts.push({
          variant: 'red',
          message: `Parcela vence em ${progress.days_until_due} dias. Faltam R$ ${progress.deficit.toFixed(2).replace('.', ',')} para cobri-la.`,
        });
      }

      set({
        data: {
          daily_net,
          daily_goal: financing.calculated_daily_goal,
          goal_progress: Math.max(0, goal_progress),
          week_earnings: weekSummary.gross_total,
          installment: financing.monthly_installment,
          days_until_due: progress.days_until_due,
          estimated_tax: taxMonth.tax_amount,
          cost_per_km: costsSummary.cost_per_km,
          week_data: buildWeekDays(financing.calculated_daily_goal, weekEarnings.data),
          alerts: alerts.slice(0, 2),
          integrations: integrationsRes.integrations,
        },
        isLoading: false,
      });
    } catch {
      set({ error: 'Erro ao carregar dados. Tente novamente.', isLoading: false });
    }
  },
}));
