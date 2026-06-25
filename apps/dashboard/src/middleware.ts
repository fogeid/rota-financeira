import { NextRequest, NextResponse } from 'next/server';
import type { AdminRole } from './lib/admin-permissions';
import { PERMISSIONS } from './lib/admin-permissions';

// Rotas que exigem uma permissão específica além de estar autenticado
const ROUTE_PERMISSIONS: Record<string, keyof typeof PERMISSIONS> = {
  '/admin': 'viewDashboardOverview',
  '/admin/financeiro/saques': 'viewFinance',
  '/admin/financeiro/comissoes': 'viewFinance',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Influencer dashboard ──────────────────────────────────────────────────
  const influencerToken = request.cookies.get('influencer_token')?.value;
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isInfluencerLoginRoute = pathname === '/login';

  if (isDashboardRoute && !influencerToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isInfluencerLoginRoute && influencerToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ── Admin panel ───────────────────────────────────────────────────────────
  const adminToken = request.cookies.get('admin_token')?.value;
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminLoginRoute = pathname === '/admin/login';
  const isAdminAccessRestricted = pathname === '/admin/acesso-restrito';

  if (isAdminLoginRoute && adminToken) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (isAdminRoute && !isAdminAccessRestricted && !adminToken) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Verificar permissão de rota para admins autenticados
  if (isAdminRoute && !isAdminAccessRestricted && adminToken) {
    const requiredPermission = ROUTE_PERMISSIONS[pathname];
    if (requiredPermission) {
      // Ler role do header injetado pelo próprio middleware (não disponível aqui),
      // então lemos do cookie admin_role que o cliente seta após login
      const role = request.cookies.get('admin_role')?.value as AdminRole | undefined;
      if (role) {
        const allowed = (PERMISSIONS[requiredPermission] as readonly string[]).includes(role);
        if (!allowed) {
          return NextResponse.redirect(new URL('/admin/acesso-restrito', request.url));
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/admin/:path*', '/admin'],
};
