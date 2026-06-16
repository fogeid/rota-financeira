import type { EarningItem, EarningsSummary, EarningsListResponse } from '../../types/api';

const TODAY = new Date().toISOString().slice(0, 10);
const THIS_MONTH = new Date().toISOString().slice(0, 7);

const MOCK_EARNINGS: EarningItem[] = [
  { id: '1', platform: 'UBER', amount: 52.30, km_driven: 12.1, started_at: `${TODAY}T09:12:00Z`, earned_at: TODAY, origin: 'AUTO_SYNC' },
  { id: '2', platform: 'NOVENTA_E_NOVE', amount: 38.90, km_driven: 9.4, started_at: `${TODAY}T11:05:00Z`, earned_at: TODAY, origin: 'AUTO_SYNC' },
  { id: '3', platform: 'UBER', amount: 67.40, km_driven: 15.2, started_at: `${TODAY}T14:30:00Z`, earned_at: TODAY, origin: 'MANUAL' },
  { id: '4', platform: 'UBER', amount: 28.80, km_driven: 7.0, started_at: `${TODAY}T08:20:00Z`, earned_at: TODAY, origin: 'AUTO_SYNC' },
];

const YESTERDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const MOCK_WEEK_EARNINGS: EarningItem[] = [
  { id: '5', platform: 'UBER', amount: 320, km_driven: 75, started_at: `${YESTERDAY}T10:00:00Z`, earned_at: YESTERDAY, origin: 'AUTO_SYNC' },
  { id: '6', platform: 'NOVENTA_E_NOVE', amount: 210, km_driven: 50, started_at: `${YESTERDAY}T14:00:00Z`, earned_at: YESTERDAY, origin: 'AUTO_SYNC' },
];

export const earningsMock = {
  async list(params?: { date?: string; month?: string; platform?: string }): Promise<EarningsListResponse> {
    await delay(400);
    let data = [...MOCK_EARNINGS, ...MOCK_WEEK_EARNINGS];
    if (params?.date) data = data.filter((e) => e.earned_at === params.date);
    if (params?.month) data = data.filter((e) => e.earned_at.startsWith(params.month!));
    if (params?.platform) data = data.filter((e) => e.platform === params.platform);
    return { data, total: data.length, page: 1, limit: 20 };
  },

  async summary(period: 'today' | 'week' | 'month' = 'today'): Promise<EarningsSummary> {
    await delay(300);
    if (period === 'today') {
      const todayTotal = MOCK_EARNINGS.reduce((s, e) => s + e.amount, 0);
      return {
        period: 'today',
        gross_total: todayTotal,
        by_platform: { UBER: 148.50, NOVENTA_E_NOVE: 38.90 },
        trips_count: MOCK_EARNINGS.length,
        best_hour: '14:00',
        days_worked: 1,
      };
    }
    if (period === 'week') {
      return {
        period: 'week',
        gross_total: 1610,
        by_platform: { UBER: 960, NOVENTA_E_NOVE: 650 },
        trips_count: 52,
        best_hour: '18:00',
        days_worked: 5,
      };
    }
    return {
      period: 'month',
      gross_total: 4218.50,
      by_platform: { UBER: 2960, NOVENTA_E_NOVE: 1258.50 },
      trips_count: 156,
      best_hour: '18:00',
      days_worked: 15,
    };
  },

  async create(data: { platform: string; amount: number; km_driven: number; started_at: string; earned_at: string }): Promise<EarningItem> {
    await delay(600);
    return {
      id: String(Date.now()),
      platform: data.platform as EarningItem['platform'],
      amount: data.amount,
      km_driven: data.km_driven,
      started_at: data.started_at,
      earned_at: data.earned_at,
      origin: 'MANUAL',
    };
  },

  async remove(id: string): Promise<void> {
    await delay(400);
  },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
