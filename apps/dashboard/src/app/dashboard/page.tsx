'use client';

import { useEffect, useState } from 'react';
import { fetchDashboard } from '@/lib/api';
import type { DashboardData } from '@/types';
import StatCard from '@/components/StatCard';
import TierBadge from '@/components/TierBadge';
import SubscriberChart from '@/components/SubscriberChart';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(1)}%`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(() => setError('Não foi possível carregar os dados. Tente novamente.'));
  }, []);

  function copyLink() {
    if (!data) return;
    navigator.clipboard.writeText(data.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 font-medium">{error}</p>
          <button
            className="mt-3 text-sm text-brand-600 hover:underline"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </button>
        </div>
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

  const currentMonthLabel = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
  const nextPaymentLabel = format(new Date(data.next_payment_date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-800">{data.channel_name}</h1>
              <TierBadge tier={data.tier} showRate />
            </div>
            <p className="text-sm text-slate-400 mt-0.5">Dashboard de Comissões — Rota Indica</p>
          </div>

          {/* Link exclusivo */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
            <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-sm text-slate-600 font-mono max-w-[180px] truncate">{data.link}</span>
            <button
              onClick={copyLink}
              className="ml-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>

      {/* Cards do mês atual */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {currentMonthLabel}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Cliques no link" value={data.current_month.clicks.toLocaleString('pt-BR')} />
          <StatCard label="Cadastros" value={data.current_month.registrations.toLocaleString('pt-BR')} />
          <StatCard
            label="Taxa de conversão"
            value={formatPercent(data.conversion_rate)}
            subtitle="cadastros / cliques"
          />
          <StatCard
            label="Assinantes ativos"
            value={data.current_month.active_subscribers.toLocaleString('pt-BR')}
          />
          <StatCard
            label="Comissão do mês"
            value={formatBRL(data.current_month.commission)}
            subtitle="estimativa"
            highlight
          />
          <StatCard
            label="Retenção"
            value={formatPercent(data.subscriber_retention)}
            subtitle="vs mês anterior"
          />
        </div>
      </div>

      {/* Próximo pagamento */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-5 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-green-100">Próximo pagamento</p>
            <p className="text-2xl font-bold mt-0.5">{formatBRL(data.current_month.commission)}</p>
            <p className="text-sm text-green-100 mt-0.5">Estimativa para {nextPaymentLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-green-100">Total acumulado</p>
            <p className="text-xl font-bold">{formatBRL(data.total_earned)}</p>
          </div>
        </div>
        <p className="text-xs text-green-200 mt-4">
          * Comissão paga após D+30 do pagamento. Assinantes ativos: {data.current_month.active_subscribers} × {formatBRL(data.commission_rate)}/mês
        </p>
      </div>

      {/* Gráfico de assinantes */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Assinantes ativos por mês</h2>
        <p className="text-xs text-slate-400 mb-4">Últimos 6 meses</p>
        <SubscriberChart history={data.history} />
      </div>
    </div>
  );
}
