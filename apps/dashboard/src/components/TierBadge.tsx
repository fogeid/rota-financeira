'use client';

import type { InfluencerTier } from '@/types';

const TIER_CONFIG: Record<InfluencerTier, { label: string; className: string; rate: string }> = {
  MICRO:     { label: 'Micro',              className: 'bg-slate-100 text-slate-600',   rate: 'R$ 3/assinante' },
  MEDIUM:    { label: 'Médio',              className: 'bg-blue-100 text-blue-700',     rate: 'R$ 4/assinante' },
  LARGE:     { label: 'Grande',             className: 'bg-purple-100 text-purple-700', rate: 'R$ 5/assinante' },
  EXCLUSIVE: { label: 'Parceria Exclusiva', className: 'bg-amber-100 text-amber-700',   rate: 'Negociado' },
};

interface TierBadgeProps {
  tier: InfluencerTier;
  showRate?: boolean;
}

export default function TierBadge({ tier, showRate }: TierBadgeProps) {
  const config = TIER_CONFIG[tier];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
      >
        {config.label}
      </span>
      {showRate && (
        <span className="text-xs text-slate-500">{config.rate}</span>
      )}
    </span>
  );
}
