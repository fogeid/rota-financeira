import { api } from './api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  trial_ends_at: string | null;
  biometry_enabled: boolean;
}

export const usersService = {
  async getMe(): Promise<UserProfile> {
    const { data } = await api.get<UserProfile>('/users/me');
    return data;
  },

  async updateProfile(payload: { name: string; email?: string; current_password: string }): Promise<UserProfile> {
    const { data } = await api.patch<UserProfile>('/users/me', payload);
    return data;
  },

  async changePassword(payload: { current_password: string; new_password: string }): Promise<void> {
    await api.post('/users/me/change-password', payload);
  },

  async deleteAccount(payload: { password: string; confirmation: string }): Promise<void> {
    await api.delete('/users/me', { data: payload });
  },
};
