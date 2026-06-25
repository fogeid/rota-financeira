'use client';

import { useEffect, useState } from 'react';
import { listWithdrawals, markWithdrawalPaid, type AdminWithdrawal, type WithdrawalStatus } from '@/lib/admin-api';

const STATUS_FILTERS: { label: string; value: WithdrawalStatus | '' }[] = [
  { label: 'Todos', value: '' },
  { label: 'Pendentes', value: 'PENDING' },
  { label: 'Revisão', value: 'REVIEW' },
  { label: 'Pagos', value: 'PAID' },
];

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function SaquesPage() {
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [status, setStatus] = useState<WithdrawalStatus | ''>('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listWithdrawals(status || undefined)
      .then((res) => setWithdrawals(res.data))
      .catch(() => setError('Não foi possível carregar os saques.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleMarkPaid() {
    if (!confirm) return;
    setActionLoading(true);
    try {
      const res = await markWithdrawalPaid(confirm);
      setSuccessMsg(res.message);
      load();
    } catch {
      setError('Falha ao marcar saque como pago.');
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-5">Saques</h1>

      <div className="flex gap-2 flex-wrap mb-5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
              status === f.value ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {successMsg && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">{successMsg}</div>
      )}
      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuário</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Chave PIX</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Data</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : withdrawals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                  Nenhum saque encontrado.
                </td>
              </tr>
            ) : (
              withdrawals.map((w) => (
                <tr key={w.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-medium text-slate-700">{w.user_name}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{fmt(w.amount)}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs hidden md:table-cell">{w.pix_key}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                      w.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                      w.status === 'REVIEW' ? 'bg-amber-50 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                    {new Date(w.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {w.status === 'PENDING' && (
                      <button
                        onClick={() => setConfirm(w.id)}
                        className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                      >
                        Marcar pago
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h2 className="text-base font-bold text-slate-800 mb-2">Marcar saque como pago?</h2>
            <p className="text-sm text-slate-500 mb-5">
              Use apenas se o PIX já foi processado manualmente. Esta ação será registrada no log de auditoria.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleMarkPaid}
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
