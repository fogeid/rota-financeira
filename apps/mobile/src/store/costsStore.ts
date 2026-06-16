import { create } from 'zustand';
import { costsMock } from '../services/mocks/costs.mock';
import type { CostItem, CostsSummary, CostType } from '../types/api';

interface CostsStore {
  items: CostItem[];
  summary: CostsSummary | null;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  addCost: (data: Omit<CostItem, 'id'>) => Promise<void>;
  removeCost: (id: string) => Promise<void>;
}

export const useCostsStore = create<CostsStore>((set, get) => ({
  items: [],
  summary: null,
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const [listRes, summaryRes] = await Promise.all([
        costsMock.list(),
        costsMock.summary(),
      ]);
      set({ items: listRes.data, summary: summaryRes, isLoading: false });
    } catch {
      set({ error: 'Erro ao carregar custos.', isLoading: false });
    }
  },

  addCost: async (data) => {
    const newItem = await costsMock.create(data);
    set((s) => ({ items: [newItem, ...s.items] }));
    get().load();
  },

  removeCost: async (id) => {
    await costsMock.remove(id);
    set((s) => ({ items: s.items.filter((c) => c.id !== id) }));
  },
}));
