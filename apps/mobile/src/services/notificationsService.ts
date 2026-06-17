import { api } from './api';
import type { NotificationsResponse } from '../types/api';

export const notificationsService = {
  async list(unreadOnly = false): Promise<NotificationsResponse> {
    const { data } = await api.get<NotificationsResponse>('/notifications', {
      params: unreadOnly ? { unread: true } : undefined,
    });
    return data;
  },

  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await api.patch('/notifications/read-all');
  },
};
