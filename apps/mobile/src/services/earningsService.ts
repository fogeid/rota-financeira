import { api } from './api';
import type { EarningItem, EarningsSummary, EarningsListResponse } from '../types/api';

export const earningsService = {
  async list(params?: { date?: string; month?: string; platform?: string; page?: number }): Promise<EarningsListResponse> {
    const { data } = await api.get<EarningsListResponse>('/earnings', { params });
    return data;
  },

  async summary(period: 'today' | 'week' | 'month' = 'today'): Promise<EarningsSummary> {
    const { data } = await api.get<EarningsSummary>('/earnings/summary', { params: { period } });
    return data;
  },

  async create(payload: { platform: string; amount: number; km_driven: number; started_at: string; earned_at: string }): Promise<EarningItem> {
    const { data } = await api.post<EarningItem>('/earnings', payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/earnings/${id}`);
  },
};
