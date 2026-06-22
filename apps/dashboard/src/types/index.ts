export type InfluencerTier = 'MICRO' | 'MEDIUM' | 'LARGE' | 'EXCLUSIVE';
export type CommissionStatus = 'PENDING' | 'PAID';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  influencer: {
    name: string;
    channel_name: string;
    tier: InfluencerTier;
  };
}

export interface CurrentMonthStats {
  clicks: number;
  registrations: number;
  active_subscribers: number;
  commission: number;
}

export interface CommissionHistory {
  month: string;
  active_subscribers: number;
  commission: number;
  status: CommissionStatus;
  paid_at: string | null;
}

export interface DashboardData {
  channel_name: string;
  link: string;
  tier: InfluencerTier;
  commission_rate: number;
  pix_key: string | null;
  current_month: CurrentMonthStats;
  history: CommissionHistory[];
  total_earned: number;
  next_payment_date: string;
  conversion_rate: number;
  subscriber_retention: number | null;
}
