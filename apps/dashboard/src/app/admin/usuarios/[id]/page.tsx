'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getUserById,
  deactivateUser,
  reactivateUser,
  updateUser,
  grantPremium,
  revokePremium,
  makeInfluencer,
  type AdminUserDetail,
  type UpdateUserAdminPayload,
  type MakeInfluencerPayload,
  type InfluencerTier,
} from '@/lib/admin-api';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type ConfirmAction = 'deactivate' | 'reactivate' | 'grant-premium' | 'revoke-premium';

export default function UsuarioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edição de dados
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<UpdateUserAdminPayload>({});
  const [editLoading, setEditLoading] = useState(false);

  // Transformar em influencer
  const [influencerOpen, setInfluencerOpen] = useState(false);
  const [influencerForm, setInfluencerForm] = useState<MakeInfluencerPayload>({
    channel_name: '',
    channel_url: '',
    followers: 0,
    niche: '',
    tier: 'MICRO',
  });
  const [influencerLoading, setInfluencerLoading] = useState(false);

  useEffect(() => {
    getUserById(id)
      .then((u) => {
        setUser(u);
        setEditForm({ name: u.name });
      })
      .catch(() => setError('Usuário não encontrado.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleConfirmAction() {
    if (!user || !confirm) return;
    setActionLoading(true);
    setError(null);
    try {
      let res: { message: string };
      if (confirm === 'deactivate') {
        res = await deactivateUser(user.id);
        setUser({ ...user, is_active: false });
      } else if (confirm === 'reactivate') {
        res = await reactivateUser(user.id);
        setUser({ ...user, is_active: true });
      } else if (confirm === 'grant-premium') {
        res = await grantPremium(user.id);
        setUser({ ...user, plan: 'PRO', plan_granted_by: 'ADMIN_COURTESY' });
      } else {
        res = await revokePremium(user.id);
        setUser({ ...user, plan: 'FREE', plan_granted_by: null });
      }
      setSuccessMsg(res.message);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Falha ao executar ação. Tente novamente.');
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  async function handleEditSave() {
    if (!user) return;
    setEditLoading(true);
    setError(null);
    try {
      const updated = await updateUser(user.id, editForm);
      setUser(updated);
      setEditOpen(false);
      setSuccessMsg('Dados atualizados com sucesso.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Erro ao salvar alterações.');
    } finally {
      setEditLoading(false);
    }
  }

  async function handleMakeInfluencer() {
    if (!user) return;
    setInfluencerLoading(true);
    setError(null);
    try {
      await makeInfluencer(user.id, influencerForm);
      setInfluencerOpen(false);
      setSuccessMsg('Usuário transformado em influencer com sucesso.');
      const updated = await getUserById(user.id);
      setUser(updated);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Erro ao transformar em influencer.');
    } finally {
      setInfluencerLoading(false);
    }
  }

  if (loading) {
    return <div className="h-40 bg-slate-100 animate-pulse rounded-xl" />;
  }

  if (error && !user) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (!user) return null;

  const isPremiumCourtesy = user.plan === 'PRO' && user.plan_granted_by === 'ADMIN_COURTESY';
  const isPremiumPaid = user.plan === 'PRO' && user.plan_granted_by !== 'ADMIN_COURTESY';
  const hasInfluencerProfile = !!user.influencer_profile_id;

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
              {user.plan === 'PRO'
                ? isPremiumCourtesy ? 'Premium (cortesia)' : 'Premium'
                : 'Gratuito'}
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
            {user.plan === 'PRO' && !['ACTIVE', 'TRIAL'].includes(user.subscription_status ?? '') && !isPremiumCourtesy && (
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

        {/* Ações */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setEditOpen(true)}
            className="rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-100 transition"
          >
            Editar dados
          </button>

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

          {user.plan === 'FREE' && (
            <button
              onClick={() => setConfirm('grant-premium')}
              className="rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-2 hover:bg-green-100 transition"
            >
              Conceder Premium (cortesia)
            </button>
          )}

          {isPremiumCourtesy && (
            <button
              onClick={() => setConfirm('revoke-premium')}
              className="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-4 py-2 hover:bg-amber-100 transition"
            >
              Remover Premium (cortesia)
            </button>
          )}

          {isPremiumPaid && (
            <span className="inline-flex items-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
              Assinatura paga ativa
            </span>
          )}

          {hasInfluencerProfile ? (
            <a
              href={`/admin/influencers/${user.influencer_profile_id}`}
              className="rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-sm font-medium px-4 py-2 hover:bg-purple-100 transition"
            >
              Ver perfil de influencer →
            </a>
          ) : (
            <button
              onClick={() => setInfluencerOpen(true)}
              className="rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-sm font-medium px-4 py-2 hover:bg-purple-100 transition"
            >
              Transformar em influencer
            </button>
          )}
        </div>
      </div>

      {/* Modal: confirmação simples (desativar/reativar/premium) */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h2 className="text-base font-bold text-slate-800 mb-2">
              {confirm === 'deactivate' && 'Desativar conta?'}
              {confirm === 'reactivate' && 'Reativar conta?'}
              {confirm === 'grant-premium' && 'Conceder Premium (cortesia)?'}
              {confirm === 'revoke-premium' && 'Remover Premium (cortesia)?'}
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              Tem certeza? Esta ação será registrada no log de auditoria.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmAction}
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

      {/* Modal: editar dados cadastrais */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-base font-bold text-slate-800 mb-4">Editar dados cadastrais</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Nome</label>
                <input
                  type="text"
                  value={editForm.name ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">E-mail (deixe vazio para não alterar)</label>
                <input
                  type="email"
                  value={editForm.email ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value || undefined })}
                  placeholder={user.email_masked}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Telefone (ex: +5511999998888)</label>
                <input
                  type="text"
                  value={editForm.phone ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value || undefined })}
                  placeholder={user.phone_masked}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">CPF (ex: 111.444.777-35)</label>
                <input
                  type="text"
                  value={editForm.cpf ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value || undefined })}
                  placeholder={user.cpf_masked}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                className="flex-1 rounded-lg bg-slate-800 text-white text-sm font-medium py-2.5 hover:bg-slate-700 disabled:opacity-60 transition"
              >
                {editLoading ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => { setEditOpen(false); setError(null); }}
                className="flex-1 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium py-2.5 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: transformar em influencer */}
      {influencerOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-base font-bold text-slate-800 mb-1">Transformar em influencer</h2>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Ao confirmar, o código de indicação de motorista deste usuário será desativado automaticamente. Ele passará a operar somente como influencer.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Nome do canal</label>
                <input
                  type="text"
                  value={influencerForm.channel_name}
                  onChange={(e) => setInfluencerForm({ ...influencerForm, channel_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Link do canal</label>
                <input
                  type="url"
                  value={influencerForm.channel_url}
                  onChange={(e) => setInfluencerForm({ ...influencerForm, channel_url: e.target.value })}
                  placeholder="https://"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-medium block mb-1">Seguidores</label>
                  <input
                    type="number"
                    value={influencerForm.followers}
                    onChange={(e) => setInfluencerForm({ ...influencerForm, followers: Number(e.target.value) })}
                    min={1}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium block mb-1">Tier</label>
                  <select
                    value={influencerForm.tier}
                    onChange={(e) => setInfluencerForm({ ...influencerForm, tier: e.target.value as InfluencerTier })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="MICRO">Micro</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LARGE">Large</option>
                    <option value="EXCLUSIVE">Exclusive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Nicho</label>
                <input
                  type="text"
                  value={influencerForm.niche}
                  onChange={(e) => setInfluencerForm({ ...influencerForm, niche: e.target.value })}
                  placeholder="ex: finanças pessoais, motoristas de app"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleMakeInfluencer}
                disabled={influencerLoading || !influencerForm.channel_name || !influencerForm.channel_url || !influencerForm.niche}
                className="flex-1 rounded-lg bg-slate-800 text-white text-sm font-medium py-2.5 hover:bg-slate-700 disabled:opacity-60 transition"
              >
                {influencerLoading ? 'Aguarde...' : 'Confirmar'}
              </button>
              <button
                onClick={() => { setInfluencerOpen(false); setError(null); }}
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
