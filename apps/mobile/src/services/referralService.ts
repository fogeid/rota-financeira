import { api } from './api';

export interface ReferralBalance {
  available: number;
  pending: number;
  total_earned: number;
  total_withdrawn: number;
}

export interface ReferralIndicado {
  name: string;
  status: 'REGISTERED' | 'CONVERTED' | 'INACTIVE';
  converted_at: string | null;
}

export interface ReferralWithdrawal {
  id: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED';
  pix_key: string;
  created_at: string;
  processed_at: string | null;
}

export interface MyReferralResponse {
  code: string;
  is_active: boolean;
  link: string;
  level: 'INICIANTE' | 'PARCEIRO' | 'EMBAIXADOR';
  conversions: number;
  next_level_at: number | null;
  balance: ReferralBalance;
  referrals: ReferralIndicado[];
}

export interface ValidateCodeResponse {
  valid: boolean;
  referrer_name?: string;
}

export const referralService = {
  getMyReferral: (): Promise<MyReferralResponse> =>
    api.get<MyReferralResponse>('/referral/me').then((r) => r.data),

  validateCode: (code: string): Promise<ValidateCodeResponse> =>
    api.get<ValidateCodeResponse>(`/referral/validate/${code}`).then((r) => r.data),

  withdraw: (pix_key: string, amount: number): Promise<{ message: string; withdrawal_id: string }> =>
    api.post('/referral/withdraw', { pix_key, amount }).then((r) => r.data),

  getWithdrawals: (): Promise<{ withdrawals: ReferralWithdrawal[] }> =>
    api.get('/referral/withdrawals').then((r) => r.data),
};
