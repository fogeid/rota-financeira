'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserById, deactivateUser, reactivateUser, type AdminUserDetail } from '@/lib/admin-api';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function UsuarioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'deactivate' | 'reactivate' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    getUserById(id)
      .then(setUser)
      .catch(() => setError('Usuário não encontrado.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAction() {
    if (!user || !confirm) return;
    setActionLoading(true);
    try {
      const fn = confirm === 'deactivate' ? deactivateUser : reactivateUser;
      const res = await fn(user.id);
      setSuccessMsg(res.message);
      setUser({ ...user, is_active: confirm === 'reactivate' });
    } catch {
      setError('Falha ao executar ação. Tente novamente.');
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  if (loading) {
    return <div className="h-40 bg-slate-100 animate-pulse rounded-xl" />;
  }

  if (error && !user) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => router.back()}
        className="text-sm text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1"
      >
        ← Voltar
      </button>

      <h1 className="text-xl font-bold text-slate-800 mb-6">{user.name}</h1>

      {successMsg && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">CPF</p>
            <p className="font-mono text-slate-700">{user.cpf_masked}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Telefone</p>
            <p className="text-slate-700">{user.phone_masked}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">E-mail</p>
            <p className="text-slate-700">{user.email_masked}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Plano</p>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
              user.plan === 'PRO' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {user.plan === 'PRO' ? 'Premium' : 'Gratuito'}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Assinatura</p>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
              user.subscription_status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
              user.subscription_status === 'TRIAL' ? 'bg-blue-50 text-blue-700' :
              user.subscription_status ? 'bg-amber-50 text-amber-700' :
              'bg-slate-100 text-slate-400'
            }`}>
              {user.subscription_status ?? 'Sem assinatura'}
            </span>
            {user.plan === 'PRO' && !['ACTIVE', 'TRIAL'].includes(user.subscription_status ?? '') && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠ Plano Premium no banco mas sem assinatura ativa — app exibe Gratuito
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Status</p>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
              user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              {user.is_active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Cadastro</p>
            <p className="text-slate-700">{new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
          {user.plan_expires_at && (
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Plano expira</p>
              <p className="text-slate-700">{new Date(user.plan_expires_at).toLocaleDateString('pt-BR')}</p>
            </div>
          )}
        </div>

        <hr className="border-slate-100" />

        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Resumo financeiro — mês atual</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400">Ganhos</p>
              <p className="font-semibold text-slate-800">{fmt(user.current_month_summary.earnings)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400">Custos</p>
              <p className="font-semibold text-slate-800">{fmt(user.current_month_summary.costs)}</p>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        <div className="flex gap-3">
          {user.is_active ? (
            <button
              onClick={() => setConfirm('deactivate')}
              className="rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-2 hover:bg-red-100 transition"
            >
              Desativar conta
            </button>
          ) : (
            <button
              onClick={() => setConfirm('reactivate')}
              className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium px-4 py-2 hover:bg-emerald-100 transition"
            >
              Reativar conta
            </button>
          )}
        </div>
      </div>

      {/* Modal de confirmação */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h2 className="text-base font-bold text-slate-800 mb-2">
              {confirm === 'deactivate' ? 'Desativar conta?' : 'Reativar conta?'}
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              Tem certeza? Esta ação será registrada no log de auditoria.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-slate-800 text-white text-sm font-medium py-2.5 hover:bg-slate-700 disabled:opacity-60 transition"
              >
                {actionLoading ? 'Aguarde...' : 'Confirmar'}
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium py-2.5 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
