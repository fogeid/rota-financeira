'use client';

const TOKEN_COOKIE = 'influencer_token';
const USER_KEY = 'influencer_user';

export function setAuthToken(token: string): void {
  const maxAge = 7 * 24 * 60 * 60; // 7 dias
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${maxAge}; SameSite=Strict`;
}

export function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function removeAuthToken(): void {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
}

export function setInfluencerUser(data: { name: string; channel_name: string; tier: string }): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(data));
  }
}

export function getInfluencerUser(): { name: string; channel_name: string; tier: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { name: string; channel_name: string; tier: string };
  } catch {
    return null;
  }
}

export function logout(): void {
  removeAuthToken();
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_KEY);
    window.location.href = '/login';
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken());
}
