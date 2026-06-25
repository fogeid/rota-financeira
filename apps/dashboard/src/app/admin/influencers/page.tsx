'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listInfluencers, type AdminInfluencer, type InfluencerStatus } from '@/lib/admin-api';

const STATUS_LABELS: Record<InfluencerStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  SUSPENDED: 'Suspenso',
};

const STATUS_STYLES: Record<InfluencerStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-600',
  SUSPENDED: 'bg-slate-100 text-slate-500',
};

const FILTERS: { label: string; value: InfluencerStatus | '' }[] = [
  { label: 'Todos', value: '' },
  { label: 'Pendentes', value: 'PENDING' },
  { label: 'Aprovados', value: 'APPROVED' },
  { label: 'Rejeitados', value: 'REJECTED' },
  { label: 'Suspensos', value: 'SUSPENDED' },
];

export default function InfluencersPage() {
  const [influencers, setInfluencers] = useState<AdminInfluencer[]>([]);
  const [status, setStatus] = useState<InfluencerStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listInfluencers(status || undefined)
      .then((res) => setInfluencers(res.data))
      .catch(() => setError('Não foi possível carregar os influencers.'))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-5">Influencers</h1>

      <div className="flex gap-2 flex-wrap mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
              status === f.value
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Canal</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Usuário</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Tier</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Seguidores</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : influencers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                  Nenhum influencer encontrado.
                </td>
              </tr>
            ) : (
              influencers.map((inf) => (
                <tr
                  key={inf.id}
                  className={`border-b border-slate-50 hover:bg-slate-50 transition ${
                    inf.status === 'PENDING' ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-slate-700">{inf.channel_name}</td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{inf.user_name}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {inf.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                    {inf.followers.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${STATUS_STYLES[inf.status]}`}>
                      {STATUS_LABELS[inf.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/influencers/${inf.id}`}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Ver →
                    </Link>
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
