'use client';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  highlight?: boolean;
}

export default function StatCard({ label, value, subtitle, highlight }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-5 bg-white shadow-sm transition-shadow hover:shadow-md ${
        highlight ? 'border-brand-500 ring-1 ring-brand-200' : 'border-slate-100'
      }`}
    >
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tracking-tight ${
          highlight ? 'text-brand-600' : 'text-slate-800'
        }`}
      >
        {value}
      </p>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
