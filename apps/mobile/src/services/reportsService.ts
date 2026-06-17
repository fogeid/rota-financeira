import { api } from './api';
import type { MonthlyReport } from '../types/api';

export const reportsService = {
  async monthly(month?: string): Promise<MonthlyReport> {
    const { data } = await api.get<MonthlyReport>('/reports/monthly', {
      params: month ? { month } : undefined,
    });
    return data;
  },
};
