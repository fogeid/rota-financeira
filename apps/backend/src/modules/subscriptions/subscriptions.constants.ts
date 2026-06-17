export const SUBSCRIPTION_QUEUE = 'subscription-queue';
export const JOB_CHECK_TRIAL_EXPIRY = 'check-trial-expiry';
export const JOB_CHECK_EXPIRED_SUBSCRIPTIONS = 'check-expired-subscriptions';

export const PLANS = {
  free: {
    id: 'free',
    name: 'Gratuito',
    price_cents: 0,
    billing_cycle: null as null,
    features: [
      'Controle manual de corridas e custos',
      'Meta diária e lucro diário',
      'Histórico completo',
      'Cadastro de veículo e financiamento',
    ],
  },
  premium_monthly: {
    id: 'premium_monthly',
    name: 'Premium Mensal',
    price_cents: 990,
    billing_cycle: 'MONTHLY' as const,
    features: [
      'Tudo do Gratuito',
      'Sync automático Uber e 99',
      'Relatórios em PDF',
      'Imposto de renda automático',
      'Alertas inteligentes',
      'Projeções do próximo mês',
      'Custo/km automático',
    ],
  },
  premium_yearly: {
    id: 'premium_yearly',
    name: 'Premium Anual',
    price_cents: 8900,
    billing_cycle: 'YEARLY' as const,
    features: [
      'Tudo do Premium Mensal',
      'Economia de ~25% em relação ao plano mensal',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

/** Trial de 14 dias conforme docs/06-BUSINESS-RULES.md seção 13 */
export const TRIAL_DAYS = 14;

/** Downgrade após 3 falhas de pagamento — docs/06-BUSINESS-RULES.md seção 13 */
export const MAX_PAYMENT_FAILURES = 3;
