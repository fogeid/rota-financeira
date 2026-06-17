import type { FinancingData, FinancingProgress } from '../../types/api';

export const financingMock = {
  async getData(): Promise<FinancingData> {
    await delay(300);
    return {
      monthly_installment: 1200.00,
      due_day: 25,
      desired_income: 2000.00,
      work_days_per_month: 22,
      total_installments: 60,
      calculated_daily_goal: 280.00,
      monthly_goal: 6160.00,
    };
  },

  async getProgress(): Promise<FinancingProgress> {
    await delay(350);
    return {
      reference_month: new Date().toISOString().slice(0, 7) + '-01',
      installment: 1200.00,
      accumulated: 840.00,
      percentage: 70.0,
      deficit: 360.00,
      days_until_due: 9,
      required_daily: 40.00,
      health_status: 'AMBER',
      recovery_tip: 'Trabalhe 3 dias a mais para cobrir o déficit de R$ 360,00',
    };
  },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
