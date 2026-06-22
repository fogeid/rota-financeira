import { InfluencerTier } from '@prisma/client';

export const INFLUENCER_COMMISSION_QUEUE = 'influencer-commission';
export const JOB_MONTHLY_COMMISSION = 'monthly-commission';

/** Tier derivado pelo número de seguidores (avaliação interna). */
export function getTierByFollowers(followers: number): InfluencerTier {
  if (followers >= 500_000) return InfluencerTier.EXCLUSIVE;
  if (followers >= 100_000) return InfluencerTier.LARGE;
  if (followers >= 10_000) return InfluencerTier.MEDIUM;
  return InfluencerTier.MICRO;
}

/** Taxa de comissão padrão por tier (R$ por assinante ativo/mês). */
export function getDefaultCommissionRate(tier: InfluencerTier): number {
  switch (tier) {
    case InfluencerTier.EXCLUSIVE: return 4.0;
    case InfluencerTier.LARGE: return 3.0;
    case InfluencerTier.MEDIUM: return 2.0;
    case InfluencerTier.MICRO: return 1.5;
  }
}
