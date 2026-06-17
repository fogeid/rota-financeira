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
    // Backend expects flat fields, not nested fuel_log/maintenance_log objects
    const { fuel_log, maintenance_log, ...base } = payload;
    const body = {
      ...base,
      ...(fuel_log ?? {}),
      ...(maintenance_log
        ? {
            service_type: maintenance_log.service_type,
            current_odometer_km: maintenance_log.current_odometer_km,
            next_service_km: maintenance_log.next_service_km,
            reminder_enabled: maintenance_log.reminder_enabled,
          }
        : {}),
    };
    const { data } = await api.post<CostItem>('/costs', body);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/costs/${id}`);
  },
};
