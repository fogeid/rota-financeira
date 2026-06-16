import { create } from 'zustand';
import { subscriptionsMock, type SubscriptionInfo } from '../services/mocks/subscriptions.mock';

interface SubscriptionStore {
  info: SubscriptionInfo | null;
  isLoading: boolean;
  load: () => Promise<void>;
  isPro: () => boolean;
  isTrialing: () => boolean;
  trialDaysLeft: () => number;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  info: null,
  isLoading: false,

  load: async () => {
    set({ isLoading: true });
    try {
      const info = await subscriptionsMock.get();
      set({ info, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  isPro: () => {
    const { info } = get();
    if (!info) return false;
    if (info.plan === 'PRO' && (info.status === 'ACTIVE' || info.status === 'TRIALING')) return true;
    return false;
  },

  isTrialing: () => {
    const { info } = get();
    return info?.status === 'TRIALING' === true;
  },

  trialDaysLeft: () => {
    const { info } = get();
    if (!info?.trial_ends_at) return 0;
    return Math.max(0, Math.ceil((new Date(info.trial_ends_at).getTime() - Date.now()) / 86400000));
  },
}));
