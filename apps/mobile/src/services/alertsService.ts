import { api } from './api';

export interface AlertPreference {
  type: string;
  enabled: boolean;
}

export interface AlertPreferencesResponse {
  preferences: AlertPreference[];
}

export const alertsService = {
  async getPreferences(): Promise<AlertPreferencesResponse> {
    const { data } = await api.get<AlertPreferencesResponse>('/alerts/preferences');
    return data;
  },

  async updatePreference(type: string, enabled: boolean): Promise<void> {
    await api.patch('/alerts/preferences', { preferences: [{ type, enabled }] });
  },
};
