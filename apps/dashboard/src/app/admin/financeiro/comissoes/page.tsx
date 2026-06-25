'use client';

import { useEffect, useState } from 'react';
import { listCommissions, type AdminCommission } from '@/lib/admin-api';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function ComissoesPage() {
  const [commissions, setCommissions] = useState<AdminCommission[]>([]);
  const [month, setMonth] = useState(currentMonthValue());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listCommissions(month || undefined)
      .then((res) => setCommissions(res.data))
      .catch(() => setError('Não foi possível carregar as comissões.'))
      .finally(() => setLoading(false));
  }, [month]);

  const total = commissions.reduce((sum, c) => sum + c.commission_amount, 0);
  const pending = commissions.filter((c) => c.status === 'PENDING');
  const totalPending = pending.reduce((sum, c) => sum + c.commission_amount, 0);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-5">Comissões de Influencer</h1>

      <div className="flex items-center gap-4 mb-5">
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide block mb-1">Mês</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        {commissions.length > 0 && (
          <div className="flex gap-4 mt-4">
            <div className="bg-white rounded-lg border border-slate-100 px-4 py-3 shadow-sm">
              <p className="text-xs text-slate-400">Total do mês</p>
              <p className="font-bold text-slate-800">{fmt(total)}</p>
            </div>
            <div className="bg-amber-50 rounded-lg border border-amber-100 px-4 py-3">
              <p className="text-xs text-amber-600">A pagar</p>
              <p className="font-bold text-amber-800">{fmt(totalPending)}</p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Influencer</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Assinantes</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Comissão</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Pago em</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : commissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                  Nenhuma comissão para o período selecionado.
                </td>
              </tr>
            ) : (
              commissions.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-medium text-slate-700">{c.influencer_name}</td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{c.active_subscribers}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{fmt(c.commission_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                      c.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                    {c.paid_at ? new Date(c.paid_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
