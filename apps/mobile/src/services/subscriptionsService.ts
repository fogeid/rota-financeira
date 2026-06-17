import { api } from './api';
import type { SubscriptionInfo, PixPaymentResponse } from '../types/api';

export const subscriptionsService = {
  async get(): Promise<SubscriptionInfo> {
    const { data } = await api.get<SubscriptionInfo>('/subscriptions/me');
    return data;
  },

  async subscribe(planId: 'premium_monthly' | 'premium_yearly', cardToken: string): Promise<SubscriptionInfo> {
    const { data } = await api.post<{ message: string; subscription: SubscriptionInfo }>('/subscriptions/subscribe', {
      plan_id: planId,
      payment_method: 'CREDIT_CARD',
      card_token: cardToken,
    });
    return data.subscription;
  },

  async subscribePix(planId: 'premium_yearly'): Promise<PixPaymentResponse> {
    const { data } = await api.post<PixPaymentResponse>('/subscriptions/subscribe-pix', {
      plan_id: planId,
    });
    return data;
  },

  // PIX payment confirmation arrives via webhook — no polling endpoint available
  async checkPixStatus(): Promise<'PENDING' | 'PAID'> {
    return 'PENDING';
  },

  async cancel(): Promise<{ access_until: string }> {
    const { data } = await api.delete<{ message: string; access_until: string }>('/subscriptions/me');
    return { access_until: data.access_until };
  },

  // Card tokenization must use the Pagar.me frontend SDK on-device before calling subscribe()
  tokenizeCard(_card: { number: string; holder_name: string; expiry: string; cvv: string }): string {
    throw new Error('Use the Pagar.me SDK to tokenize the card before calling subscribe()');
  },
};
