import { api } from './api';

export interface LoginPayload {
  cpf: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    name: string;
    plan: string;
    trial_ends_at: string | null;
  };
}

export const authService = {
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', payload).then((r) => r.data),

  register: (payload: RegisterPayload) =>
    api.post<{ message: string; otp_expires_in: number }>('/auth/register', payload).then((r) => r.data),

  verifyOtp: (phone: string, code: string, purpose: 'REGISTRATION' | 'PASSWORD_RESET') =>
    api.post<AuthResponse>('/auth/verify-otp', { phone, code, purpose }).then((r) => r.data),

  resendOtp: (phone: string, purpose: 'REGISTRATION' | 'PASSWORD_RESET') =>
    api.post<{ message: string; retry_after: number }>('/auth/resend-otp', { phone, purpose }).then((r) => r.data),

  forgotPassword: (phone: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { phone }).then((r) => r.data),

  resetPassword: (phone: string, code: string, new_password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { phone, code, new_password }).then((r) => r.data),

  logout: (refresh_token: string) =>
    api.post<{ message: string }>('/auth/logout', { refresh_token }).then((r) => r.data),
};
