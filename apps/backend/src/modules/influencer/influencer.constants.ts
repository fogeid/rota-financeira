import { InfluencerTier } from '@prisma/client';

export const INFLUENCER_COMMISSION_QUEUE = 'influencer-commission';
export const JOB_MONTHLY_COMMISSION = 'monthly-commission';

/** Tier derivado pelo número de seguidores — docs/09-REFERRAL-PROGRAM.md seção 3.2 */
export function getTierByFollowers(followers: number): InfluencerTier {
  if (followers >= 500_000) return InfluencerTier.EXCLUSIVE;
  if (followers >= 150_000) return InfluencerTier.LARGE;
  if (followers >= 30_000) return InfluencerTier.MEDIUM;
  return InfluencerTier.MICRO;
}

/** Taxa de comissão padrão por tier (R$ por assinante ativo/mês) — docs/06-BUSINESS-RULES.md seção 16.5 */
export function getDefaultCommissionRate(tier: InfluencerTier): number {
  switch (tier) {
    case InfluencerTier.EXCLUSIVE: return 5.0;
    case InfluencerTier.LARGE: return 5.0;
    case InfluencerTier.MEDIUM: return 4.0;
    case InfluencerTier.MICRO: return 3.0;
  }
}
