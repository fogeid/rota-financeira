'use client';

import type { AdminRole } from './admin-permissions';

const TOKEN_COOKIE = 'admin_token';
const ROLE_COOKIE = 'admin_role';
const ROLE_KEY = 'admin_role';

function setCookie(name: string, value: string, maxAge: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Strict`;
}

function removeCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0`;
}

export function setAdminAuthToken(token: string): void {
  setCookie(TOKEN_COOKIE, token, 15 * 60); // 15 min — igual ao access_token
}

export function getAdminAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function removeAdminAuthToken(): void {
  removeCookie(TOKEN_COOKIE);
}

export function setAdminRole(role: AdminRole): void {
  // Cookie: lido pelo middleware para verificar permissões de rota
  setCookie(ROLE_COOKIE, role, 15 * 60);
  // localStorage: lido pelos componentes client-side
  if (typeof window !== 'undefined') {
    localStorage.setItem(ROLE_KEY, role);
  }
}

export function getAdminRole(): AdminRole | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(ROLE_KEY);
  if (!raw) return null;
  return raw as AdminRole;
}

export function removeAdminRole(): void {
  removeCookie(ROLE_COOKIE);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ROLE_KEY);
  }
}

export function adminLogout(): void {
  removeAdminAuthToken();
  removeAdminRole();
  if (typeof window !== 'undefined') {
    window.location.href = '/admin/login';
  }
}

export function isAdminAuthenticated(): boolean {
  return Boolean(getAdminAuthToken());
}
