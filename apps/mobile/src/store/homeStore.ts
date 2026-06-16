import { create } from 'zustand';
import { financingMock } from '../services/mocks/financing.mock';
import { earningsMock } from '../services/mocks/earnings.mock';
import { costsMock } from '../services/mocks/costs.mock';
import { integrationsMock } from '../services/mocks/integrations.mock';
import type { HomeData } from '../types/api';

const DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const TODAY_DOW = new Date().getDay();

function buildWeekDays(goal: number) {
  const MOCK_VALUES = [320, 210, 290, 0, 410, 380, 0];
  return DAYS.map((day, i) => ({
    day,
    value: i <= TODAY_DOW ? MOCK_VALUES[i] : 0,
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
      const [financing, progress, todaySummary, weekSummary, costsSummary, integrationsRes] =
        await Promise.all([
          financingMock.getData(),
          financingMock.getProgress(),
          earningsMock.summary('today'),
          earningsMock.summary('week'),
          costsMock.summary(),
          integrationsMock.status(),
        ]);

      const daily_net = todaySummary.gross_total - 29.60; // proportional cost mock
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
          estimated_tax: 187.22,
          cost_per_km: costsSummary.cost_per_km,
          week_data: buildWeekDays(financing.calculated_daily_goal),
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
