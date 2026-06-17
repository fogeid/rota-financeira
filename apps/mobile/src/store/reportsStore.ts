import { create } from 'zustand';
import { reportsService } from '../services/reportsService';
import type { MonthlyReport } from '../types/api';

type ReportTab = 'current' | 'previous' | 'annual';

interface ReportsStore {
  report: MonthlyReport | null;
  tab: ReportTab;
  isLoading: boolean;
  error: string | null;
  setTab: (t: ReportTab) => void;
  load: (month?: string) => Promise<void>;
}

function monthOffset(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7);
}

export const useReportsStore = create<ReportsStore>((set, get) => ({
  report: null,
  tab: 'current',
  isLoading: false,
  error: null,

  setTab: (tab) => {
    set({ tab });
    const month = tab === 'previous' ? monthOffset(-1) : monthOffset(0);
    get().load(month);
  },

  load: async (month) => {
    set({ isLoading: true, error: null });
    try {
      const report = await reportsService.monthly(month);
      set({ report, isLoading: false });
    } catch {
      set({ error: 'Erro ao carregar relatório.', isLoading: false });
    }
  },
}));
