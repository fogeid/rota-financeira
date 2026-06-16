export interface SubscriptionInfo {
  plan: 'FREE' | 'PRO';
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING';
  billing_cycle: 'MONTHLY' | 'ANNUAL' | null;
  current_period_end: string | null;
  amount_cents: number;
  trial_ends_at: string | null;
}

const MOCK_SUB: SubscriptionInfo = {
  plan: 'PRO',
  status: 'TRIALING',
  billing_cycle: null,
  current_period_end: null,
  amount_cents: 0,
  trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
};

export const subscriptionsMock = {
  async get(): Promise<SubscriptionInfo> {
    await delay(300);
    return { ...MOCK_SUB };
  },

  async subscribe(planId: 'premium_monthly' | 'premium_annual', cardToken: string): Promise<SubscriptionInfo> {
    await delay(800);
    MOCK_SUB.plan = 'PRO';
    MOCK_SUB.status = 'ACTIVE';
    MOCK_SUB.billing_cycle = planId === 'premium_monthly' ? 'MONTHLY' : 'ANNUAL';
    MOCK_SUB.amount_cents = planId === 'premium_monthly' ? 990 : 8900;
    MOCK_SUB.trial_ends_at = null;
    MOCK_SUB.current_period_end = new Date(Date.now() + 30 * 86400000).toISOString();
    return { ...MOCK_SUB };
  },

  async subscribePix(planId: 'premium_annual'): Promise<{ qr_code: string; qr_code_url: string; expires_at: string; amount_cents: number }> {
    await delay(600);
    return {
      qr_code: '00020126580014br.gov.bcb.pix0136fake-pix-key-rota-financeira5204000053039865406890.005802BR5925Rota Financeira LTDA6009SAO PAULO62070503***6304ABCD',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=pix-mock',
      expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
      amount_cents: 8900,
    };
  },

  async checkPixStatus(): Promise<'PENDING' | 'PAID'> {
    await delay(300);
    return 'PENDING';
  },

  async cancel(): Promise<{ access_until: string }> {
    await delay(500);
    return { access_until: MOCK_SUB.current_period_end ?? new Date().toISOString() };
  },

  tokenizeCard(_card: { number: string; holder_name: string; expiry: string; cvv: string }): string {
    return `tok_mock_${Math.random().toString(36).slice(2, 10)}`;
  },
};

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
