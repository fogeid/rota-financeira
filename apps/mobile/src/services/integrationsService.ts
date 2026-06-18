import { api } from './api';
import type { IntegrationsResponse } from '../types/api';

export const integrationsService = {
  async status(): Promise<IntegrationsResponse> {
    const { data } = await api.get<IntegrationsResponse>('/integrations/status', {
      headers: { 'Cache-Control': 'no-cache' },
      params: { _t: Date.now() },
    });
    return data;
  },

  async connect(platform: string, credentials?: Record<string, string>): Promise<void> {
    await api.post('/integrations/connect', { platform, credentials });
  },

  async triggerSync(platform: string): Promise<void> {
    await api.post(`/integrations/${platform}/sync`);
  },

  async disconnect(platform: string): Promise<void> {
    await api.delete(`/integrations/${platform}`);
  },
};
