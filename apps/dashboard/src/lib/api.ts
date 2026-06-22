import axios from 'axios';
import { getAuthToken, logout } from './auth';
import type { DashboardData, LoginResponse } from '@/types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      logout();
    }
    return Promise.reject(err);
  },
);

export async function loginInfluencer(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/influencer/auth/login', { email, password });
  return data;
}

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/influencer/dashboard');
  return data;
}

export async function updatePixKey(pix_key: string): Promise<{ message: string; pix_key: string }> {
  const { data } = await api.patch<{ message: string; pix_key: string }>('/influencer/pix-key', { pix_key });
  return data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/forgot-password', { phone: email });
  return data;
}

export default api;
