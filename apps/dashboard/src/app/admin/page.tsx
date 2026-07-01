'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchCompleteOverview, type CompleteOverview } from '@/lib/admin-api';
import { getAdminRole } from '@/lib/admin-auth';
import { hasPermission, getDefaultRoute } from '@/lib/admin-permissions';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Components ────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
      {children}
    </h2>
  );
}

function Card({
  label,
  value,
  sub,
  accent,
  large,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'green' | 'red' | 'amber' | 'blue';
  large?: boolean;
}) {
  const accentClass =
    accent === 'green' ? 'text-emerald-600' :
    accent === 'red' ? 'text-red-500' :
    accent === 'amber' ? 'text-amber-500' :
    accent === 'blue' ? 'text-blue-600' :
    'text-slate-800';

  return (
    <div className={`bg-white rounded-xl border border-slate-100 p-5 shadow-sm ${large ? 'col-span-2' : ''}`}>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`${large ? 'text-3xl' : 'text-2xl'} font-bold mt-1 ${accentClass}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function AlertBanner({
  type,
  children,
  href,
}: {
  type: 'error' | 'warning' | 'info';
  children: React.ReactNode;
  href?: string;
}) {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  }[type];

  const content = (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium ${styles}`}>
      {children}
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }
  return content;
}

function Skeleton() {
  return (
    <div className="space-y-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <div className="h-4 w-32 bg-slate-100 rounded animate-pulse mb-3" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const PIE_COLORS = ['#64748b', '#3b82f6', '#8b5cf6'];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<CompleteOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const role = getAdminRole();
    if (!role || !hasPermission(role, 'viewDashboardOverview')) {
      router.replace(role ? getDefaultRoute(role) : '/admin/login');
      return;
    }
    fetchCompleteOverview()
      .then(setData)
      .catch(() => setError('Não foi possível carregar os dados do dashboard.'));
  }, [router]);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!data) return <Skeleton />;

  const { users, finance, referral, engagement, alerts } = data;
  const hasAlerts =
    alerts.stale_withdrawals > 0 || alerts.overdue_influencers > 0 || alerts.trials_expiring_soon > 0;

  const acquisitionData = [
    { name: 'Orgânico', value: referral.acquisition.organic },
    { name: 'Por motorista', value: referral.acquisition.by_driver },
    { name: 'Por influencer', value: referral.acquisition.by_influencer },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-slate-800">Visão Geral</h1>

      {/* ── Alertas ─────────────────────────────────────────────────────── */}
      {hasAlerts && (
        <div className="space-y-2">
          <SectionTitle>Alertas</SectionTitle>
          {alerts.stale_withdrawals > 0 && (
            <AlertBanner type="error" href="/admin/financeiro/saques">
              {alerts.stale_withdrawals} saque(s) pendente(s) há mais de 48h — clique para ver
            </AlertBanner>
          )}
          {alerts.overdue_influencers > 0 && (
            <AlertBanner type="warning" href="/admin/influencers?status=PENDING">
              {alerts.overdue_influencers} influencer(s) aguardando aprovação há mais de 72h
            </AlertBanner>
          )}
          {alerts.trials_expiring_soon > 0 && (
            <AlertBanner type="info">
              {alerts.trials_expiring_soon} trial(s) expirando nos próximos 7 dias
            </AlertBanner>
          )}
        </div>
      )}

      {/* ── Usuários ────────────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Usuários</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card label="Total de usuários" value={users.total} sub={`+${users.new_this_month} este mês`} />
          <Card label="Free" value={users.free} accent="blue" />
          <Card label="Premium" value={users.premium} accent="green" />
          <Card label="Em trial" value={users.trial} accent="amber" />
          <Card label="Novos esta semana" value={users.new_this_week} />
          <Card label="Novos este mês" value={users.new_this_month} />
          <Card
            label="Conversão trial → Premium"
            value={`${users.trial_conversion_rate}%`}
            sub="histórico geral"
          />
          <Card
            label="Churn este mês"
            value={users.churn_this_month}
            accent={users.churn_this_month > 0 ? 'red' : undefined}
          />
        </div>
      </div>

      {/* ── Financeiro ──────────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Financeiro</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">MRR</p>
            <div className="flex items-end gap-3 mt-1">
              <p className="text-3xl font-bold text-slate-800">{fmtBRL(finance.mrr)}</p>
              <span
                className={`text-sm font-semibold pb-0.5 ${finance.mrr_growth_pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
              >
                {finance.mrr_growth_pct >= 0 ? '↑' : '↓'} {Math.abs(finance.mrr_growth_pct)}% vs mês anterior
              </span>
            </div>
          </div>
          <Card label="Receita do mês" value={fmtBRL(finance.revenue_this_month)} />
          <Card label="Receita no ano (YTD)" value={fmtBRL(finance.revenue_this_year)} />
          <Card label="Assinantes mensais" value={finance.monthly_subscribers} />
          <Card label="Assinantes anuais" value={finance.annual_subscribers} />
        </div>
      </div>

      {/* ── Indicação ───────────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Programa de Indicação</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Adoção — códigos ativos
            </p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{referral.adoption_rate}%</p>
            <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(referral.adoption_rate, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {referral.active_codes} de {referral.total_codes} códigos ativos
            </p>
          </div>

          <Card label="Conversões pendentes" value={referral.pending_conversions} accent="amber" />
          <Card label="Total convertidos" value={referral.total_converted} accent="green" />
          <Card
            label="Cashback pago este mês"
            value={fmtBRL(referral.cashback_paid_this_month)}
          />

          {acquisitionData.length > 0 && (
            <div className="col-span-2 lg:col-span-3 bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                Canal de aquisição
              </p>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={acquisitionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      dataKey="value"
                    >
                      {acquisitionData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR')} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {acquisitionData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-slate-600">{d.name}</span>
                      <span className="font-semibold text-slate-800 ml-auto pl-4">
                        {d.value.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Engajamento ─────────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Engajamento</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card label="DAU (últimas 24h)" value={engagement.dau} sub="usuários ativos hoje" />
          <Card label="MAU (este mês)" value={engagement.mau} sub="usuários ativos no mês" />
          <Card
            label="Ratio DAU/MAU"
            value={`${engagement.dau_mau_ratio}%`}
            sub="quanto do MAU é ativo diariamente"
          />
          <Card
            label="Motoristas ativos (7 dias)"
            value={engagement.active_drivers_this_week}
          />
          <Card
            label="Premium em risco de churn"
            value={engagement.premium_at_risk}
            sub="sem atividade há +15 dias"
            accent={engagement.premium_at_risk > 0 ? 'amber' : undefined}
          />
        </div>
      </div>
    </div>
  );
}
