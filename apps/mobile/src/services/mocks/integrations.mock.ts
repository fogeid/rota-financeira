import type { IntegrationStatus, IntegrationsResponse } from '../../types/api';

export const integrationsMock = {
  async status(): Promise<IntegrationsResponse> {
    await delay(300);
    return {
      integrations: [
        {
          platform: 'UBER',
          is_active: true,
          last_sync_at: new Date(Date.now() - 6 * 3600000).toISOString(),
          last_sync_status: 'SUCCESS',
        },
        {
          platform: 'NOVENTA_E_NOVE',
          is_active: true,
          last_sync_at: new Date(Date.now() - 6 * 3600000).toISOString(),
          last_sync_status: 'SUCCESS',
        },
      ],
    };
  },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
