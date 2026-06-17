import { api } from './api';
import type { CostItem, CostsSummary, CostsListResponse } from '../types/api';

export const costsService = {
  async list(params?: { month?: string; type?: string; page?: number }): Promise<CostsListResponse> {
    const { data } = await api.get<CostsListResponse>('/costs', { params });
    return data;
  },

  async summary(month?: string): Promise<CostsSummary> {
    const { data } = await api.get<CostsSummary>('/costs/summary', {
      params: month ? { month } : undefined,
    });
    return data;
  },

  async create(payload: Omit<CostItem, 'id'>): Promise<CostItem> {
    const { data } = await api.post<CostItem>('/costs', payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/costs/${id}`);
  },
};
