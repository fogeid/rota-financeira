import { api } from './api';
import type { FinancingData, FinancingProgress } from '../types/api';

export const financingService = {
  async getData(): Promise<FinancingData> {
    const { data } = await api.get<FinancingData>('/financing/me');
    return data;
  },

  async getProgress(): Promise<FinancingProgress> {
    const { data } = await api.get<FinancingProgress>('/financing/progress');
    return data;
  },
};
