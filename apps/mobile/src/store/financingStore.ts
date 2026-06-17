import { create } from 'zustand';
import { financingService } from '../services/financingService';
import type { FinancingData, FinancingProgress } from '../types/api';

interface FinancingStore {
  data: FinancingData | null;
  progress: FinancingProgress | null;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

export const useFinancingStore = create<FinancingStore>((set) => ({
  data: null,
  progress: null,
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const [data, progress] = await Promise.all([
        financingService.getData(),
        financingService.getProgress(),
      ]);
      set({ data, progress, isLoading: false });
    } catch {
      set({ error: 'Erro ao carregar financiamento.', isLoading: false });
    }
  },
}));
