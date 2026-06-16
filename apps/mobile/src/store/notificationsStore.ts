import { create } from 'zustand';
import { notificationsMock } from '../services/mocks/notifications.mock';
import type { NotificationItem } from '../types/api';

interface NotificationsStore {
  items: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  items: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await notificationsMock.list();
      set({
        items: res.data,
        unreadCount: notificationsMock.unreadCount(),
        isLoading: false,
      });
    } catch {
      set({ error: 'Erro ao carregar notificações.', isLoading: false });
    }
  },

  markRead: async (id) => {
    await notificationsMock.markRead(id);
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await notificationsMock.markAllRead();
    set((s) => ({
      items: s.items.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },
}));
