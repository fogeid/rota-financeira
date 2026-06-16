import type { MonthlyReport } from '../../types/api';

export const reportsMock = {
  async monthly(month?: string): Promise<MonthlyReport> {
    await delay(500);
    const m = month ?? new Date().toISOString().slice(0, 7);
    return {
      month: m,
      gross_income: 4218.50,
      total_costs: 980.00,
      estimated_tax: 187.22,
      installment_covered: 1200.00,
      net_income: 1851.28,
      cost_per_km: 0.42,
      best_day: { date: `${m}-12`, net: 412.00 },
      worst_day: { date: `${m}-03`, net: 85.00 },
      vs_previous_month: { gross_income: 318.00, net_income: 234.00 },
      next_month_projection: { gross_income: 4500.00, net_income: 1950.00 },
    };
  },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
