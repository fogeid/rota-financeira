import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { secureStorage } from '../utils/secureStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_URL não configurada — verificar eas.json ou .env');
}

export const SECURE_KEYS = {
  ACCESS_TOKEN: 'rf_access_token',
  REFRESH_TOKEN: 'rf_refresh_token',
} as const;

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function processQueue(newToken: string) {
  refreshQueue.forEach((cb) => cb(newToken));
  refreshQueue = [];
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await secureStorage.getItem(SECURE_KEYS.ACCESS_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve) => {
        refreshQueue.push(resolve);
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await secureStorage.getItem(SECURE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      await secureStorage.setItem(SECURE_KEYS.ACCESS_TOKEN, data.access_token);
      await secureStorage.setItem(SECURE_KEYS.REFRESH_TOKEN, data.refresh_token);

      processQueue(data.access_token);
      original.headers.Authorization = `Bearer ${data.access_token}`;
      return api(original);
    } catch {
      processQueue('');
      await secureStorage.deleteItem(SECURE_KEYS.ACCESS_TOKEN);
      await secureStorage.deleteItem(SECURE_KEYS.REFRESH_TOKEN);
      // Signal logout to the store — imported lazily to avoid circular dep
      const { useAuthStore } = await import('../store/authStore');
      useAuthStore.getState().logout();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);
