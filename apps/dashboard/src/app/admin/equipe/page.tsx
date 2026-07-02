'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchAdminTeam,
  createAdminMember,
  updateAdminMemberRole,
  deactivateAdminMember,
  reactivateAdminMember,
  type AdminMember,
} from '@/lib/admin-api';
import { getAdminRole, getAdminAuthToken } from '@/lib/admin-auth';
import type { AdminRole } from '@/lib/admin-permissions';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  SUPPORT_DRIVER: 'Suporte Motoristas',
  SUPPORT_INFLUENCER: 'Suporte Influencers',
  SUPPORT_DRIVER_INFLUENCER: 'Suporte Ambos',
};

const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Acesso total ao painel, incluindo financeiro',
  SUPPORT_DRIVER: 'Apenas gestão de motoristas/usuários',
  SUPPORT_INFLUENCER: 'Apenas gestão de influencers',
  SUPPORT_DRIVER_INFLUENCER: 'Gestão de motoristas e influencers',
};

const ROLE_BADGE_CLASSES: Record<AdminRole, string> = {
  SUPER_ADMIN: 'bg-indigo-100 text-indigo-700',
  SUPPORT_DRIVER: 'bg-blue-100 text-blue-700',
  SUPPORT_INFLUENCER: 'bg-emerald-100 text-emerald-700',
  SUPPORT_DRIVER_INFLUENCER: 'bg-cyan-100 text-cyan-700',
};

const ALL_ROLES: AdminRole[] = [
  'SUPER_ADMIN',
  'SUPPORT_DRIVER',
  'SUPPORT_INFLUENCER',
  'SUPPORT_DRIVER_INFLUENCER',
];

function fmtDate(iso: string | null): string {
  if (!iso) return 'Nunca acessou';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Componentes ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: AdminRole }) {
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${ROLE_BADGE_CLASSES[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
      {message}
    </div>
  );
}

// ── Modal criar admin ─────────────────────────────────────────────────────────

function CreateAdminModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('SUPPORT_DRIVER');
  const [tempPassword, setTempPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (tempPassword !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    if (tempPassword.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return; }
    setLoading(true);
    try {
      await createAdminMember({ name, email, role, temporary_password: tempPassword });
      onCreated(name);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setError(apiErr?.response?.data?.message ?? 'Erro ao criar admin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-5">Adicionar membro</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Acesso</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]} — {ROLE_DESCRIPTIONS[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha temporária</label>
            <input
              type="password"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              required
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-slate-800 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-700 disabled:opacity-60"
            >
              {loading ? 'Criando...' : 'Criar admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal editar role ─────────────────────────────────────────────────────────

function EditRoleModal({
  member,
  onClose,
  onSaved,
}: {
  member: AdminMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<AdminRole>(member.role as AdminRole);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await updateAdminMemberRole(member.id, role);
      onSaved();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setError(apiErr?.response?.data?.message ?? 'Erro ao atualizar role.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Editar acesso</h2>
        <p className="text-sm text-slate-400 mb-5">{member.name}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-slate-800 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-700 disabled:opacity-60">
              {loading ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Dropdown de ações ─────────────────────────────────────────────────────────

function ActionsDropdown({
  member,
  isSelf,
  onEditRole,
  onToggleActive,
}: {
  member: AdminMember;
  isSelf: boolean;
  onEditRole: () => void;
  onToggleActive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        title="Ações"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 4a2 2 0 110-4 2 2 0 010 4zm0 4a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-100 rounded-xl shadow-lg z-10 py-1">
          <button
            onClick={() => { setOpen(false); if (!isSelf) onEditRole(); }}
            disabled={isSelf}
            title={isSelf ? 'Você não pode alterar sua própria role.' : undefined}
            className="flex w-full items-center gap-2 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Editar role
          </button>
          <button
            onClick={() => { setOpen(false); if (!isSelf) onToggleActive(); }}
            disabled={isSelf}
            title={isSelf ? 'Você não pode desativar sua própria conta.' : undefined}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed ${member.is_active ? 'text-red-600' : 'text-emerald-600'}`}
          >
            {member.is_active ? 'Desativar' : 'Reativar'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EquipePage() {
  const router = useRouter();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editMember, setEditMember] = useState<AdminMember | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const role = getAdminRole();
    if (role !== 'SUPER_ADMIN') {
      router.replace('/admin');
      return;
    }
    // Extract admin id from JWT token
    const token = getAdminAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentAdminId(payload.sub as string);
      } catch {
        /* ignore */
      }
    }
    loadTeam();
  }, [router]);

  async function loadTeam() {
    setLoading(true);
    try {
      const data = await fetchAdminTeam();
      setMembers(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(member: AdminMember) {
    try {
      if (member.is_active) {
        await deactivateAdminMember(member.id);
        setToast(`${member.name} foi desativado.`);
      } else {
        await reactivateAdminMember(member.id);
        setToast(`${member.name} foi reativado.`);
      }
      await loadTeam();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setToast(apiErr?.response?.data?.message ?? 'Erro ao atualizar status.');
    }
  }

  function handleCreated(name: string) {
    setShowCreateModal(false);
    setToast(`Admin criado. Compartilhe a senha temporária com ${name} — ela precisará ser trocada no primeiro acesso.`);
    void loadTeam();
  }

  function handleRoleSaved() {
    setEditMember(null);
    setToast('Role atualizada com sucesso.');
    void loadTeam();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Equipe Admin</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar membro
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Carregando...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Nenhum admin cadastrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">E-mail</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Último acesso</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {members.map((m) => {
                const isSelf = m.id === currentAdminId;
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {m.name}
                      {isSelf && <span className="ml-1.5 text-xs text-slate-400">(você)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{m.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={m.role as AdminRole} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(m.last_login_at)}</td>
                    <td className="px-4 py-3">
                      {m.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionsDropdown
                        member={m}
                        isSelf={isSelf}
                        onEditRole={() => setEditMember(m)}
                        onToggleActive={() => void handleToggleActive(m)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <CreateAdminModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {editMember && (
        <EditRoleModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSaved={handleRoleSaved}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
