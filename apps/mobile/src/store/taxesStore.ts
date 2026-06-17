import { create } from 'zustand';
import { taxesService } from '../services/taxesService';
import type { TaxMonth } from '../types/api';

interface TaxesStore {
  current: TaxMonth | null;
  history: TaxMonth[];
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  markPaid: (month: string) => Promise<void>;
}

export const useTaxesStore = create<TaxesStore>((set, get) => ({
  current: null,
  history: [],
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const [current, history] = await Promise.all([
        taxesService.monthly(),
        taxesService.history(),
      ]);
      set({ current, history, isLoading: false });
    } catch {
      set({ error: 'Erro ao carregar impostos.', isLoading: false });
    }
  },

  markPaid: async (month) => {
    const updated = await taxesService.markPaid(month);
    set((s) => ({
      history: s.history.map((t) => (t.month === month ? updated : t)),
      current: s.current?.month === month ? updated : s.current,
    }));
  },
}));
