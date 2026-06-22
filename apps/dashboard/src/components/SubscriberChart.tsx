'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { CommissionHistory } from '@/types';

interface SubscriberChartProps {
  history: CommissionHistory[];
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${monthNames[parseInt(m, 10) - 1]}/${year?.slice(2)}`;
}

export default function SubscriberChart({ history }: SubscriberChartProps) {
  const data = [...history]
    .reverse()
    .slice(-6)
    .map((h) => ({
      month: formatMonth(h.month),
      assinantes: h.active_subscribers,
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-slate-400 text-sm">
        Nenhum histórico disponível ainda.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
          formatter={(val: number) => [`${val} assinantes`, 'Ativos']}
        />
        <Line
          type="monotone"
          dataKey="assinantes"
          stroke="#2ECC8A"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#2ECC8A', strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
