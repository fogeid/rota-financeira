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

export async function loginInfluencer(cpf: string, password: string): Promise<LoginResponse> {
  const cleanCpf = cpf.replace(/\D/g, '');
  const { data } = await api.post<LoginResponse>('/auth/login', { cpf: cleanCpf, password });
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

export async function forgotPassword(phone: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/forgot-password', { phone });
  return data;
}

export async function resetPassword(phone: string, code: string, new_password: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/reset-password', { phone, code, new_password });
  return data;
}

export default api;
