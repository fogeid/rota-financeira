'use client';

import { useEffect, useState } from 'react';
import { fetchDashboardOverview, type DashboardOverview } from '@/lib/admin-api';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardOverview()
      .then(setData)
      .catch(() => setError('Não foi possível carregar os dados.'));
  }, []);

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (!data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-6">Visão Geral</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Usuários cadastrados" value={data.total_users} sub={`+${data.new_users_this_month} este mês`} />
        <StatCard label="Assinantes Premium" value={data.active_premium} sub={`${data.conversion_rate}% de conversão`} />
        <StatCard label="Receita do mês" value={fmt(data.revenue_this_month)} />
        <StatCard label="Indicações convertidas" value={data.referral_conversions_this_month} sub="este mês" />
        <StatCard label="Influencers aprovados" value={data.active_influencers} />
        <StatCard label="Comissões influencer" value={fmt(data.influencer_commissions_this_month)} sub="este mês" />
        <StatCard
          label="Saques pendentes"
          value={data.pending_withdrawals.count}
          sub={`Total: ${fmt(data.pending_withdrawals.total_amount)}`}
        />
      </div>
    </div>
  );
}
