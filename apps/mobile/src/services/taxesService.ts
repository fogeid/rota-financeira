import { api } from './api';
import type { TaxMonth, TaxAnnual } from '../types/api';

export const taxesService = {
  async monthly(month?: string): Promise<TaxMonth> {
    const m = month ?? new Date().toISOString().slice(0, 7);
    const { data } = await api.get<TaxMonth>(`/taxes/monthly/${m}`);
    return data;
  },

  async history(): Promise<TaxMonth[]> {
    const year = new Date().getFullYear();
    const { data } = await api.get<TaxAnnual>(`/taxes/annual/${year}`);
    return data.months;
  },

  async markPaid(month: string): Promise<TaxMonth> {
    const paid_at = new Date().toISOString().slice(0, 10);
    const { data } = await api.patch<TaxMonth>(`/taxes/${month}/status`, {
      status: 'PAID',
      paid_at,
    });
    return data;
  },
};
