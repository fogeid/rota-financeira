import { create } from 'zustand';
import { earningsMock } from '../services/mocks/earnings.mock';
import type { EarningItem, EarningsSummary } from '../types/api';

type Period = 'today' | 'week' | 'month';

interface EarningsStore {
  items: EarningItem[];
  summary: EarningsSummary | null;
  period: Period;
  isLoading: boolean;
  error: string | null;
  setPeriod: (p: Period) => void;
  load: (period?: Period) => Promise<void>;
  addEarning: (data: { platform: string; amount: number; km_driven: number; started_at: string; earned_at: string }) => Promise<void>;
  removeEarning: (id: string) => Promise<void>;
}

const periodToDate = (period: Period) => {
  const now = new Date();
  if (period === 'today') return { date: now.toISOString().slice(0, 10) };
  if (period === 'week') return { month: now.toISOString().slice(0, 7) };
  return { month: now.toISOString().slice(0, 7) };
};

export const useEarningsStore = create<EarningsStore>((set, get) => ({
  items: [],
  summary: null,
  period: 'today',
  isLoading: false,
  error: null,

  setPeriod: (period) => {
    set({ period });
    get().load(period);
  },

  load: async (period) => {
    const p = period ?? get().period;
    set({ isLoading: true, error: null });
    try {
      const [listRes, summaryRes] = await Promise.all([
        earningsMock.list(periodToDate(p)),
        earningsMock.summary(p),
      ]);
      set({ items: listRes.data, summary: summaryRes, isLoading: false });
    } catch {
      set({ error: 'Erro ao carregar ganhos.', isLoading: false });
    }
  },

  addEarning: async (data) => {
    const newItem = await earningsMock.create(data);
    set((s) => ({ items: [newItem, ...s.items] }));
    get().load();
  },

  removeEarning: async (id) => {
    await earningsMock.remove(id);
    set((s) => ({ items: s.items.filter((e) => e.id !== id) }));
  },
}));
