import { create } from 'zustand';
import { toNumber } from '../utils/numbers';
import { referralService } from '../services/referralService';
import type { MyReferralResponse, ReferralWithdrawal } from '../services/referralService';

interface ReferralStore {
  data: MyReferralResponse | null;
  withdrawals: ReferralWithdrawal[];
  isLoading: boolean;
  isWithdrawing: boolean;
  error: string | null;

  fetchReferral: () => Promise<void>;
  fetchWithdrawals: () => Promise<void>;
  withdraw: (pix_key: string, amount: number) => Promise<void>;
}

export const useReferralStore = create<ReferralStore>((set) => ({
  data: null,
  withdrawals: [],
  isLoading: false,
  isWithdrawing: false,
  error: null,

  fetchReferral: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await referralService.getMyReferral();
      // Garantir que campos Decimal (serializados como string pelo Prisma) sejam números
      set({
        data: {
          ...data,
          balance: {
            available: toNumber(data.balance.available),
            pending: toNumber(data.balance.pending),
            total_earned: toNumber(data.balance.total_earned),
            total_withdrawn: toNumber(data.balance.total_withdrawn),
          },
        },
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, error: 'Não foi possível carregar dados de indicação.' });
    }
  },

  fetchWithdrawals: async () => {
    try {
      const res = await referralService.getWithdrawals();
      set({
        withdrawals: res.withdrawals.map((w) => ({ ...w, amount: toNumber(w.amount) })),
      });
    } catch {
      // silencioso — não bloqueia a tela principal
    }
  },

  withdraw: async (pix_key, amount) => {
    set({ isWithdrawing: true });
    try {
      await referralService.withdraw(pix_key, amount);
      set({ isWithdrawing: false });
    } catch (err: unknown) {
      set({ isWithdrawing: false });
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      throw new Error(msg ?? 'Erro ao solicitar saque. Tente novamente.');
    }
  },
}));
