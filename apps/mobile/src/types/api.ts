// ─── Shared ─────────────────────────────────────────────────────────────────

export type Platform = 'UBER' | 'NOVENTA_E_NOVE' | 'IFOOD';
export type HealthStatus = 'GREEN' | 'AMBER' | 'RED';
export type TaxStatus = 'PENDING' | 'PAID' | 'OVERDUE';
export type CostType = 'FUEL' | 'MAINTENANCE' | 'CAR_WASH' | 'OTHER';
export type EarningOrigin = 'AUTO_SYNC' | 'MANUAL';

// ─── Financing ───────────────────────────────────────────────────────────────

export interface FinancingData {
  monthly_installment: number;
  due_day: number;
  desired_income: number;
  work_days_per_month: number;
  total_installments: number | null;
  calculated_daily_goal: number;
  monthly_goal: number;
}

export interface FinancingProgress {
  reference_month: string;
  installment: number;
  accumulated: number;
  percentage: number;
  deficit: number;
  days_until_due: number;
  required_daily: number;
  health_status: HealthStatus;
  recovery_tip: string;
}

// ─── Earnings ────────────────────────────────────────────────────────────────

export interface EarningItem {
  id: string;
  platform: Platform;
  amount: number;
  km_driven: number;
  started_at: string;
  earned_at: string;
  origin: EarningOrigin;
}

export interface EarningsSummary {
  period: string;
  gross_total: number;
  by_platform: Partial<Record<Platform, number>>;
  trips_count: number;
  best_hour: string | null;
  days_worked: number;
}

export interface EarningsListResponse {
  data: EarningItem[];
  total: number;
  page: number;
  limit: number;
}

// ─── Costs ───────────────────────────────────────────────────────────────────

export interface FuelLog {
  gas_station: string;
  liters: number;
  price_per_liter: number;
  odometer_km: number;
}

export interface MaintenanceLog {
  service_type: string;
  current_odometer_km: number;
  next_service_km: number;
  reminder_enabled: boolean;
}

export interface CostItem {
  id: string;
  type: CostType;
  amount: number;
  description?: string;
  cost_date: string;
  fuel_log?: FuelLog;
  maintenance_log?: MaintenanceLog;
}

export interface CostByType {
  total: number;
  percentage: number;
}

export interface CostsSummary {
  month: string;
  total: number;
  cost_per_km: number | null;
  km_driven: number;
  by_type: Partial<Record<CostType, CostByType>>;
  alert?: { type: string; message: string };
}

export interface CostsListResponse {
  data: CostItem[];
  total: number;
  page: number;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface MonthlyReport {
  month: string;
  gross_income: number;
  total_costs: number;
  estimated_tax: number;
  installment_covered: number;
  net_income: number;
  cost_per_km: number;
  best_day: { date: string; net: number };
  worst_day: { date: string; net: number };
  vs_previous_month: { gross_income: number; net_income: number };
  next_month_projection: { gross_income: number; net_income: number };
}

// ─── Taxes ───────────────────────────────────────────────────────────────────

export interface TaxMonth {
  month: string;
  gross_income: number;
  deductions: number;
  taxable_income: number;
  tax_amount: number;
  tax_bracket: string;
  reserve_message: string;
  due_date: string;
  status: TaxStatus;
}

export interface TaxAnnual {
  year: number;
  months: TaxMonth[];
  total_gross: number;
  total_deductions: number;
  total_tax: number;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType =
  | 'GOAL_REACHED'
  | 'BELOW_PACE'
  | 'INSTALLMENT_RISK'
  | 'INSTALLMENT_DUE'
  | 'HIGH_COST_PER_KM'
  | 'MAINTENANCE_DUE'
  | 'TAX_DUE'
  | 'SYNC_SUCCESS'
  | 'SYNC_FAILED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_FAILED'
  | 'TRIAL_EXPIRING';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  data: NotificationItem[];
  total: number;
  page: number;
}

// ─── Integrations ────────────────────────────────────────────────────────────

export type SyncStatus = 'SUCCESS' | 'FAILED' | 'IN_PROGRESS' | 'NEVER';

export interface IntegrationStatus {
  platform: Platform;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: SyncStatus | null;
}

export interface IntegrationsResponse {
  integrations: IntegrationStatus[];
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

export type SubscriptionPlan = 'FREE' | 'PRO';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
export type BillingCycle = 'MONTHLY' | 'YEARLY';

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle | null;
  current_period_end: string | null;
  amount_cents: number;
  trial_ends_at: string | null;
}

export interface PixPaymentResponse {
  qr_code: string;
  qr_code_url: string;
  expires_at: string;
  amount_cents: number;
}

// ─── Home (combined) ─────────────────────────────────────────────────────────

export interface WeekDay {
  day: string;
  value: number;
  goal: number;
}

export interface HomeData {
  daily_net: number;
  daily_goal: number;
  goal_progress: number;
  week_earnings: number;
  installment: number;
  days_until_due: number;
  estimated_tax: number;
  cost_per_km: number | null;
  week_data: WeekDay[];
  alerts: Array<{ variant: 'green' | 'amber' | 'red' | 'blue'; message: string }>;
  integrations: IntegrationStatus[];
}
