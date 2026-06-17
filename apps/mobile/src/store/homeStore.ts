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

      // Promise.allSettled: uma falha parcial não derruba a Home inteira.
      // Endpoints que retornam 404 (usuário sem dados cadastrados) usam defaults.
      const [
        financingRes, progressRes, todaySummaryRes, weekSummaryRes,
        costsSummaryRes, integrationsRes, taxMonthRes, weekEarningsRes,
      ] = await Promise.allSettled([
        financingService.getData(),
        financingService.getProgress(),
        earningsService.summary('today'),
        earningsService.summary('week'),
        costsService.summary(),
        integrationsService.status(),
        taxesService.monthly(),
        earningsService.list({ month: thisMonth }),
      ]);

      const financing = financingRes.status === 'fulfilled' ? financingRes.value : null;
      const progress = progressRes.status === 'fulfilled' ? progressRes.value : null;
      const todaySummary = todaySummaryRes.status === 'fulfilled' ? todaySummaryRes.value : null;
      const weekSummary = weekSummaryRes.status === 'fulfilled' ? weekSummaryRes.value : null;
      const costsSummary = costsSummaryRes.status === 'fulfilled' ? costsSummaryRes.value : null;
      const integrationsData = integrationsRes.status === 'fulfilled' ? integrationsRes.value : null;
      const taxMonth = taxMonthRes.status === 'fulfilled' ? taxMonthRes.value : null;
      const weekEarnings = weekEarningsRes.status === 'fulfilled' ? weekEarningsRes.value : null;

      const dailyGoal = financing?.calculated_daily_goal ?? 0;
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const grossToday = todaySummary?.gross_total ?? 0;
      const totalCosts = costsSummary?.total ?? 0;
      const daily_net = grossToday - totalCosts / daysInMonth;
      const goal_progress = dailyGoal > 0 ? Math.round((daily_net / dailyGoal) * 100) : 0;

      const alerts: HomeData['alerts'] = [];
      if (dailyGoal > 0 && goal_progress < 60) {
        alerts.push({
          variant: 'amber',
          message: `Você está ${100 - goal_progress}% abaixo da meta de hoje. Ainda dá tempo de recuperar!`,
        });
      }
      if (progress && progress.days_until_due <= 5 && progress.deficit > 0) {
        alerts.push({
          variant: 'red',
          message: `Parcela vence em ${progress.days_until_due} dias. Faltam R$ ${progress.deficit.toFixed(2).replace('.', ',')} para cobri-la.`,
        });
      }

      set({
        data: {
          daily_net,
          daily_goal: dailyGoal,
          goal_progress: Math.max(0, goal_progress),
          week_earnings: weekSummary?.gross_total ?? 0,
          installment: financing?.monthly_installment ?? 0,
          days_until_due: progress?.days_until_due ?? 0,
          estimated_tax: taxMonth?.tax_amount ?? 0,
          cost_per_km: costsSummary?.cost_per_km ?? 0,
          week_data: buildWeekDays(dailyGoal, weekEarnings?.data ?? []),
          alerts: alerts.slice(0, 2),
          integrations: integrationsData?.integrations ?? [],
        },
        isLoading: false,
      });
    } catch {
      set({ error: 'Erro ao carregar dados. Tente novamente.', isLoading: false });
    }
  },
}));
