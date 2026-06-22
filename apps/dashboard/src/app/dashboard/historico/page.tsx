'use client';

import { useEffect, useState } from 'react';
import { fetchDashboard } from '@/lib/api';
import type { DashboardData, CommissionHistory } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  return format(new Date(Number(year), Number(m) - 1, 1), 'MMMM yyyy', { locale: ptBR });
}

function StatusBadge({ status }: { status: CommissionHistory['status'] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        status === 'PAID'
          ? 'bg-green-100 text-green-700'
          : 'bg-amber-100 text-amber-700'
      }`}
    >
      {status === 'PAID' ? 'Pago' : 'Pendente'}
    </span>
  );
}

function exportCSV(history: CommissionHistory[], total: number) {
  const rows = [
    ['Mês', 'Assinantes Ativos', 'Comissão (R$)', 'Status', 'Data Pagamento'],
    ...history.map((h) => [
      formatMonth(h.month),
      h.active_subscribers,
      h.commission.toFixed(2),
      h.status === 'PAID' ? 'Pago' : 'Pendente',
      h.paid_at ? format(new Date(h.paid_at), 'dd/MM/yyyy') : '—',
    ]),
    ['TOTAL', '', total.toFixed(2), '', ''],
  ];

  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historico-comissoes-${new Date().toISOString().slice(0, 7)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HistoricoPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(() => setError('Não foi possível carregar o histórico.'));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-slate-400 text-sm">Carregando...</div>
      </div>
    );
  }

  const totalEarned = data.total_earned;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Histórico de Comissões</h1>
          <p className="text-sm text-slate-400 mt-0.5">Histórico completo mensal do programa Rota Indica</p>
        </div>
        {data.history.length > 0 && (
          <button
            onClick={() => exportCSV(data.history, totalEarned)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar CSV
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {data.history.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            Nenhum histórico disponível ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Mês</th>
                  <th className="text-right px-6 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Assinantes</th>
                  <th className="text-right px-6 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Comissão</th>
                  <th className="text-center px-6 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-right px-6 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide hidden md:table-cell">Pago em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.history.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700 capitalize">{formatMonth(h.month)}</td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {h.active_subscribers.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-800">
                      {formatBRL(h.commission)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={h.status} />
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 hidden md:table-cell">
                      {h.paid_at ? format(new Date(h.paid_at), 'dd/MM/yyyy') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-700">Total acumulado</td>
                  <td className="px-6 py-4" />
                  <td className="px-6 py-4 text-right font-bold text-brand-600 text-base">
                    {formatBRL(totalEarned)}
                  </td>
                  <td className="px-6 py-4" />
                  <td className="px-6 py-4 hidden md:table-cell" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
