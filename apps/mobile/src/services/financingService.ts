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

  async update(payload: {
    monthly_installment: number;
    due_day: number;
    desired_income: number;
    work_days_per_month: number;
  }): Promise<FinancingData> {
    try {
      const { data } = await api.put<FinancingData>('/financing/me', payload);
      return data;
    } catch (err: unknown) {
      // 404 → financing doesn't exist yet, create it
      if ((err as { response?: { status?: number } })?.response?.status === 404) {
        const { data } = await api.post<FinancingData>('/financing/me', payload);
        return data;
      }
      throw err;
    }
  },
};
