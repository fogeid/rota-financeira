'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getInfluencerById,
  approveInfluencer,
  rejectInfluencer,
  suspendInfluencer,
  updateInfluencerTier,
  type AdminInfluencerDetail,
  type InfluencerTier,
} from '@/lib/admin-api';
import { getAdminRole } from '@/lib/admin-auth';
import { hasPermission } from '@/lib/admin-permissions';

const TIER_OPTIONS: InfluencerTier[] = ['MICRO', 'MEDIUM', 'LARGE', 'EXCLUSIVE'];

type ConfirmAction = 'approve' | 'reject' | 'suspend';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function InfluencerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const role = getAdminRole();
  const canEditTier = role ? hasPermission(role, 'editInfluencerTier') : false;

  const [influencer, setInfluencer] = useState<AdminInfluencerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [tierLoading, setTierLoading] = useState(false);

  useEffect(() => {
    getInfluencerById(id)
      .then(setInfluencer)
      .catch(() => setError('Influencer não encontrado.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAction() {
    if (!influencer || !confirm) return;
    setActionLoading(true);
    try {
      let res: { message: string };
      if (confirm === 'approve') res = await approveInfluencer(influencer.id);
      else if (confirm === 'reject') res = await rejectInfluencer(influencer.id, reason);
      else res = await suspendInfluencer(influencer.id, reason);

      setSuccessMsg(res.message);
      const updated = await getInfluencerById(id);
      setInfluencer(updated);
    } catch {
      setError('Falha ao executar ação. Tente novamente.');
    } finally {
      setActionLoading(false);
      setConfirm(null);
      setReason('');
    }
  }

  async function handleTierChange(tier: InfluencerTier) {
    if (!influencer) return;
    setTierLoading(true);
    try {
      const res = await updateInfluencerTier(influencer.id, tier);
      setSuccessMsg(res.message);
      setInfluencer({ ...influencer, tier });
    } catch {
      setError('Falha ao atualizar tier.');
    } finally {
      setTierLoading(false);
    }
  }

  if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-xl" />;
  if (error && !influencer) return <p className="text-sm text-red-500">{error}</p>;
  if (!influencer) return null;

  const isPending = influencer.status === 'PENDING';
  const isApproved = influencer.status === 'APPROVED';

  return (
    <div className="max-w-2xl">
      <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1">
        ← Voltar
      </button>

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">{influencer.channel_name}</h1>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          isPending ? 'bg-amber-100 text-amber-700' :
          isApproved ? 'bg-emerald-100 text-emerald-700' :
          influencer.status === 'SUSPENDED' ? 'bg-slate-100 text-slate-500' :
          'bg-red-100 text-red-600'
        }`}>
          {influencer.status}
        </span>
      </div>

      {successMsg && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">{successMsg}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
        {/* Dados do canal */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Usuário</p>
            <p className="text-slate-700">{influencer.user_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Nicho</p>
            <p className="text-slate-700">{influencer.niche}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Seguidores</p>
            <p className="text-slate-700">{influencer.followers.toLocaleString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Comissão</p>
            <p className="text-slate-700">R$ {influencer.commission_rate.toFixed(2)}/assinante</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Canal</p>
            <a href={influencer.channel_url} target="_blank" rel="noopener noreferrer"
              className="text-brand-600 hover:underline text-sm truncate block">
              {influencer.channel_url}
            </a>
          </div>
          {influencer.pix_key && (
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Chave PIX</p>
              <p className="text-slate-700 font-mono text-xs">{influencer.pix_key}</p>
            </div>
          )}
        </div>

        <hr className="border-slate-100" />

        {/* Tier */}
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Tier</p>
          {canEditTier ? (
            <div className="flex gap-2 flex-wrap">
              {TIER_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => handleTierChange(t)}
                  disabled={tierLoading || influencer.tier === t}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                    influencer.tier === t
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  } disabled:opacity-60`}
                >
                  {t}
                </button>
              ))}
              {tierLoading && <span className="text-xs text-slate-400 self-center">Atualizando...</span>}
            </div>
          ) : (
            <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
              {influencer.tier}
            </span>
          )}
        </div>

        <hr className="border-slate-100" />

        {/* Dashboard do mês atual */}
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Dashboard do mês atual</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400">Cliques</p>
              <p className="font-bold text-slate-800">{influencer.dashboard.current_month.clicks}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400">Cadastros</p>
              <p className="font-bold text-slate-800">{influencer.dashboard.current_month.registrations}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400">Ativos</p>
              <p className="font-bold text-slate-800">{influencer.dashboard.current_month.active_subscribers}</p>
            </div>
          </div>
        </div>

        {influencer.dashboard.history.length > 0 && (
          <>
            <hr className="border-slate-100" />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Histórico de comissões</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 text-slate-400 font-medium">Mês</th>
                      <th className="text-right py-2 text-slate-400 font-medium">Assinantes</th>
                      <th className="text-right py-2 text-slate-400 font-medium">Comissão</th>
                      <th className="text-right py-2 text-slate-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {influencer.dashboard.history.map((h) => (
                      <tr key={h.month} className="border-b border-slate-50">
                        <td className="py-2 text-slate-600">{h.month}</td>
                        <td className="py-2 text-right text-slate-600">{h.active_subscribers}</td>
                        <td className="py-2 text-right text-slate-700 font-medium">{fmt(h.commission)}</td>
                        <td className="py-2 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                            h.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <hr className="border-slate-100" />

        {/* Ações */}
        <div className="flex gap-3 flex-wrap">
          {isPending && (
            <>
              <button
                onClick={() => setConfirm('approve')}
                className="rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-700 transition"
              >
                Aprovar
              </button>
              <button
                onClick={() => setConfirm('reject')}
                className="rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-2 hover:bg-red-100 transition"
              >
                Rejeitar
              </button>
            </>
          )}
          {isApproved && (
            <button
              onClick={() => setConfirm('suspend')}
              className="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-4 py-2 hover:bg-amber-100 transition"
            >
              Suspender
            </button>
          )}
        </div>
      </div>

      {/* Modal de confirmação */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h2 className="text-base font-bold text-slate-800 mb-2">
              {confirm === 'approve' ? 'Aprovar influencer?' : confirm === 'reject' ? 'Rejeitar influencer?' : 'Suspender influencer?'}
            </h2>
            {confirm === 'approve' && (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 mb-4">
                Ao aprovar, o código de indicação de motorista deste usuário será desativado automaticamente.
              </p>
            )}
            {(confirm === 'reject' || confirm === 'suspend') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Motivo (opcional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            )}
            <p className="text-sm text-slate-500 mb-5">Esta ação será registrada no log de auditoria.</p>
            <div className="flex gap-3">
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-slate-800 text-white text-sm font-medium py-2.5 hover:bg-slate-700 disabled:opacity-60 transition"
              >
                {actionLoading ? 'Aguarde...' : 'Confirmar'}
              </button>
              <button
                onClick={() => { setConfirm(null); setReason(''); }}
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
