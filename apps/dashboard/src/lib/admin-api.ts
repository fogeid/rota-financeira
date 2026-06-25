import axios from 'axios';
import { getAdminAuthToken, adminLogout } from './admin-auth';
import type { AdminRole } from './admin-permissions';

const adminApi = axios.create({
  baseURL: '/api/admin',
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = getAdminAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      adminLogout();
    }
    return Promise.reject(err);
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AdminLoginResponse {
  access_token: string;
  refresh_token: string;
  admin: { id: string; name: string; email: string; role: AdminRole };
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const { data } = await adminApi.post<AdminLoginResponse>('/auth/login', { email, password });
  return data;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardOverview {
  total_users: number;
  new_users_this_month: number;
  active_premium: number;
  conversion_rate: number;
  revenue_this_month: number;
  referral_conversions_this_month: number;
  active_influencers: number;
  influencer_commissions_this_month: number;
  pending_withdrawals: { count: number; total_amount: number };
}

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const { data } = await adminApi.get<DashboardOverview>('/dashboard/overview');
  return data;
}

// ── Usuários ──────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name: string;
  cpf_masked: string;
  phone_masked: string;
  email_masked: string;
  plan: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminUserDetail extends AdminUser {
  trial_ends_at: string | null;
  plan_expires_at: string | null;
  subscription_status: string | null;
  current_month_summary: { earnings: number; costs: number };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
}

export async function listUsers(
  search?: string,
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<AdminUser>> {
  const { data } = await adminApi.get<PaginatedResponse<AdminUser>>('/users', {
    params: { search, page, limit },
  });
  return data;
}

export async function getUserById(id: string): Promise<AdminUserDetail> {
  const { data } = await adminApi.get<AdminUserDetail>(`/users/${id}`);
  return data;
}

export async function deactivateUser(id: string): Promise<{ message: string }> {
  const { data } = await adminApi.patch<{ message: string }>(`/users/${id}/deactivate`);
  return data;
}

export async function reactivateUser(id: string): Promise<{ message: string }> {
  const { data } = await adminApi.patch<{ message: string }>(`/users/${id}/reactivate`);
  return data;
}

// ── Influencers ───────────────────────────────────────────────────────────────

export type InfluencerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type InfluencerTier = 'MICRO' | 'MEDIUM' | 'LARGE' | 'EXCLUSIVE';

export interface AdminInfluencer {
  id: string;
  user_name: string;
  channel_name: string;
  channel_url: string;
  followers: number;
  niche: string;
  tier: InfluencerTier;
  status: InfluencerStatus;
  created_at: string;
}

export interface AdminInfluencerDetail extends AdminInfluencer {
  user_id: string;
  commission_rate: number;
  pix_key: string | null;
  approved_at: string | null;
  dashboard: {
    current_month: { clicks: number; registrations: number; active_subscribers: number };
    history: { month: string; active_subscribers: number; commission: number; status: string }[];
  };
}

export async function listInfluencers(status?: InfluencerStatus): Promise<{ data: AdminInfluencer[] }> {
  const { data } = await adminApi.get<{ data: AdminInfluencer[] }>('/influencers', {
    params: status ? { status } : {},
  });
  return data;
}

export async function getInfluencerById(id: string): Promise<AdminInfluencerDetail> {
  const { data } = await adminApi.get<AdminInfluencerDetail>(`/influencers/${id}`);
  return data;
}

export async function approveInfluencer(id: string): Promise<{ message: string }> {
  const { data } = await adminApi.patch<{ message: string }>(`/influencers/${id}/approve`);
  return data;
}

export async function rejectInfluencer(id: string, reason: string): Promise<{ message: string }> {
  const { data } = await adminApi.patch<{ message: string }>(`/influencers/${id}/reject`, { reason });
  return data;
}

export async function suspendInfluencer(id: string, reason: string): Promise<{ message: string }> {
  const { data } = await adminApi.patch<{ message: string }>(`/influencers/${id}/suspend`, { reason });
  return data;
}

export async function updateInfluencerTier(id: string, tier: InfluencerTier): Promise<{ message: string }> {
  const { data } = await adminApi.patch<{ message: string }>(`/influencers/${id}/tier`, { tier });
  return data;
}

// ── Financeiro ────────────────────────────────────────────────────────────────

export type WithdrawalStatus = 'PENDING' | 'PAID' | 'REVIEW';

export interface AdminWithdrawal {
  id: string;
  user_name: string;
  amount: number;
  pix_key: string;
  status: WithdrawalStatus;
  created_at: string;
}

export async function listWithdrawals(status?: WithdrawalStatus): Promise<{ data: AdminWithdrawal[] }> {
  const { data } = await adminApi.get<{ data: AdminWithdrawal[] }>('/withdrawals', {
    params: status ? { status } : {},
  });
  return data;
}

export async function markWithdrawalPaid(id: string): Promise<{ message: string }> {
  const { data } = await adminApi.patch<{ message: string }>(`/withdrawals/${id}/mark-paid`);
  return data;
}

export interface AdminCommission {
  id: string;
  influencer_name: string;
  reference_month: string;
  active_subscribers: number;
  commission_amount: number;
  status: string;
  paid_at: string | null;
}

export async function listCommissions(month?: string): Promise<{ data: AdminCommission[] }> {
  const { data } = await adminApi.get<{ data: AdminCommission[] }>('/commissions', {
    params: month ? { month } : {},
  });
  return data;
}

// ── Auditoria ─────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export async function listAuditLogs(
  admin_id?: string,
  action?: string,
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<AuditLog>> {
  const { data } = await adminApi.get<PaginatedResponse<AuditLog>>('/audit-logs', {
    params: { admin_id, action, page, limit },
  });
  return data;
}

export default adminApi;
