export type AdminRole =
  | 'SUPER_ADMIN'
  | 'SUPPORT_DRIVER'
  | 'SUPPORT_INFLUENCER'
  | 'SUPPORT_DRIVER_INFLUENCER';

// Espelha EXATAMENTE a tabela de docs/12-ADMIN-PANEL.md seção 7.0
export const PERMISSIONS = {
  viewDashboardOverview: ['SUPER_ADMIN'],
  viewUsers: ['SUPER_ADMIN', 'SUPPORT_DRIVER', 'SUPPORT_DRIVER_INFLUENCER'],
  manageUsers: ['SUPER_ADMIN', 'SUPPORT_DRIVER', 'SUPPORT_DRIVER_INFLUENCER'],
  viewInfluencers: ['SUPER_ADMIN', 'SUPPORT_INFLUENCER', 'SUPPORT_DRIVER_INFLUENCER'],
  manageInfluencers: ['SUPER_ADMIN', 'SUPPORT_INFLUENCER', 'SUPPORT_DRIVER_INFLUENCER'],
  editInfluencerTier: ['SUPER_ADMIN'],
  viewFinance: ['SUPER_ADMIN'],
  manageFinance: ['SUPER_ADMIN'],
  viewAllAuditLogs: ['SUPER_ADMIN'],
} as const;

export function hasPermission(role: AdminRole, permission: keyof typeof PERMISSIONS): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function getDefaultRoute(role: AdminRole): string {
  if (hasPermission(role, 'viewDashboardOverview')) return '/admin';
  if (hasPermission(role, 'viewUsers')) return '/admin/usuarios';
  if (hasPermission(role, 'viewInfluencers')) return '/admin/influencers';
  return '/admin/auditoria';
}
