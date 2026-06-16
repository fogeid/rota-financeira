import type { NotificationItem, NotificationsResponse } from '../../types/api';

let MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1', type: 'GOAL_REACHED', is_read: false,
    title: 'Meta batida! 🎉',
    body: 'Você atingiu sua meta diária de R$ 280,00. Continue assim!',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'n2', type: 'BELOW_PACE', is_read: false,
    title: 'Abaixo do ritmo',
    body: 'No ritmo atual, você vai cobrir apenas 85% da parcela este mês. Tente trabalhar mais 2 dias.',
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'n3', type: 'TAX_DUE', is_read: false,
    title: 'Carnê-leão vence em 5 dias',
    body: 'Reserve R$ 187,22 para pagar o IR deste mês até 30/06.',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'n4', type: 'HIGH_COST_PER_KM', is_read: true,
    title: 'Custo/km elevado',
    body: 'Seu custo por km subiu 8% em relação à média. Verifique o consumo de combustível.',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'n5', type: 'SYNC_SUCCESS', is_read: true,
    title: 'Sync concluído',
    body: 'Suas corridas da Uber foram sincronizadas com sucesso.',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'n6', type: 'TRIAL_EXPIRING', is_read: true,
    title: 'Trial expira em 3 dias',
    body: 'Seu período gratuito Pro expira em 19/06. Assine para não perder acesso.',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

export const notificationsMock = {
  async list(unreadOnly = false): Promise<NotificationsResponse> {
    await delay(350);
    const data = unreadOnly ? MOCK_NOTIFICATIONS.filter((n) => !n.is_read) : MOCK_NOTIFICATIONS;
    return { data, total: data.length, page: 1 };
  },

  async markRead(id: string): Promise<void> {
    await delay(200);
    const item = MOCK_NOTIFICATIONS.find((n) => n.id === id);
    if (item) item.is_read = true;
  },

  async markAllRead(): Promise<void> {
    await delay(300);
    MOCK_NOTIFICATIONS = MOCK_NOTIFICATIONS.map((n) => ({ ...n, is_read: true }));
  },

  unreadCount(): number {
    return MOCK_NOTIFICATIONS.filter((n) => !n.is_read).length;
  },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
