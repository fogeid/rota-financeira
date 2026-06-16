import { create } from 'zustand';
import { SECURE_KEYS } from '../services/api';
import { secureStorage } from '../utils/secureStorage';

interface User {
  id: string;
  name: string;
  plan: string;
  trial_ends_at: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometryEnabled: boolean;

  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setUser: (user: User) => void;
  setBiometryEnabled: (enabled: boolean) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  biometryEnabled: false,

  setTokens: async (accessToken, refreshToken) => {
    await secureStorage.setItem(SECURE_KEYS.ACCESS_TOKEN, accessToken);
    await secureStorage.setItem(SECURE_KEYS.REFRESH_TOKEN, refreshToken);
    set({ isAuthenticated: true });
  },

  setUser: (user) => set({ user }),

  setBiometryEnabled: async (enabled) => {
    await secureStorage.setItem('rf_biometry_enabled', enabled ? '1' : '0');
    set({ biometryEnabled: enabled });
  },

  logout: async () => {
    await secureStorage.deleteItem(SECURE_KEYS.ACCESS_TOKEN);
    await secureStorage.deleteItem(SECURE_KEYS.REFRESH_TOKEN);
    await secureStorage.deleteItem('rf_biometry_enabled');
    set({ user: null, isAuthenticated: false, biometryEnabled: false });
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      const token = await secureStorage.getItem(SECURE_KEYS.ACCESS_TOKEN);
      const biometry = await secureStorage.getItem('rf_biometry_enabled');
      set({
        isAuthenticated: !!token,
        biometryEnabled: biometry === '1',
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
