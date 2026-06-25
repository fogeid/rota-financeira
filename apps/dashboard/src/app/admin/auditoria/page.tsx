'use client';

import { useEffect, useState, useCallback } from 'react';
import { listAuditLogs, type AuditLog } from '@/lib/admin-api';
import { getAdminRole } from '@/lib/admin-auth';
import { hasPermission } from '@/lib/admin-permissions';

const ACTION_OPTIONS = [
  'approve_influencer',
  'reject_influencer',
  'suspend_influencer',
  'update_influencer_tier',
  'deactivate_user',
  'reactivate_user',
  'mark_withdrawal_paid',
];

export default function AuditoriaPage() {
  const role = getAdminRole();
  const isSuperAdmin = role ? hasPermission(role, 'viewAllAuditLogs') : false;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [adminId, setAdminId] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAuditLogs(
        adminId || undefined,
        action || undefined,
        page,
      );
      setLogs(res.data);
      setTotal(res.total);
    } catch {
      setError('Não foi possível carregar os logs.');
    } finally {
      setLoading(false);
    }
  }, [adminId, action, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-5">
        {isSuperAdmin ? 'Log de Auditoria' : 'Meu Histórico de Ações'}
      </h1>

      <div className="flex gap-3 flex-wrap mb-5">
        {isSuperAdmin && (
          <input
            type="text"
            placeholder="Filtrar por admin ID..."
            value={adminId}
            onChange={(e) => { setAdminId(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 w-60"
          />
        )}
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Todas as ações</option>
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        {(adminId || action) && (
          <button
            onClick={() => { setAdminId(''); setAction(''); setPage(1); }}
            className="rounded-lg border border-slate-200 text-slate-500 text-sm px-3 py-2 hover:bg-slate-50 transition"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
              {isSuperAdmin && (
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Admin</th>
              )}
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ação</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Entidade</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{log.admin_name}</td>
                    )}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                      {log.target_type} · <span className="font-mono">{log.target_id.slice(0, 8)}…</span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">
                      {log.details ? (expanded === log.id ? '▲' : '▼') : ''}
                    </td>
                  </tr>
                  {expanded === log.id && log.details && (
                    <tr key={`${log.id}-detail`} className="border-b border-slate-50 bg-slate-50">
                      <td colSpan={isSuperAdmin ? 5 : 4} className="px-4 py-3">
                        <pre className="text-xs text-slate-600 font-mono whitespace-pre-wrap break-all">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <span>{total} registros no total</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Anterior
            </button>
            <span className="px-3 py-1.5 text-xs">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
