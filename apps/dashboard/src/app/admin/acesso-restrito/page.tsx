'use client';

import Link from 'next/link';
import { getAdminRole } from '@/lib/admin-auth';
import { getDefaultRoute } from '@/lib/admin-permissions';

export default function AcessoRestrito() {
  const role = getAdminRole();
  const defaultRoute = role ? getDefaultRoute(role) : '/admin/login';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-slate-800 mb-2">Acesso restrito</h1>
      <p className="text-slate-500 text-sm max-w-sm mb-6">
        Esta área não está disponível para a sua role atual. Entre em contato com o administrador se precisar de acesso.
      </p>
      <Link
        href={defaultRoute}
        className="rounded-lg bg-slate-800 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-700 transition"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
