export const REFERRAL_CASHBACK_QUEUE = 'referral-cashback';
export const JOB_PROCESS_D30 = 'process-d30';
export const MIN_WITHDRAWAL_AMOUNT = 20;

export function calculateCashback(conversions: number): number {
  if (conversions >= 30) return 7;
  if (conversions >= 15) return 6;
  return 5;
}

export function getReferralLevel(conversions: number): 'INICIANTE' | 'PARCEIRO' | 'EMBAIXADOR' {
  if (conversions >= 30) return 'EMBAIXADOR';
  if (conversions >= 15) return 'PARCEIRO';
  return 'INICIANTE';
}

export function getNextLevelAt(conversions: number): number | null {
  if (conversions < 15) return 15;
  if (conversions < 30) return 30;
  return null;
}
