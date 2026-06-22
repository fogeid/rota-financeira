'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { fetchDashboard, updatePixKey } from '@/lib/api';
import type { DashboardData } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface PixKeyForm {
  pix_key: string;
}

export default function PagamentosPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingPix, setEditingPix] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<PixKeyForm>();

  useEffect(() => {
    fetchDashboard()
      .then((d) => {
        setData(d);
        if (d.pix_key) setValue('pix_key', d.pix_key);
      })
      .catch(() => setError('Não foi possível carregar os dados de pagamento.'));
  }, [setValue]);

  async function onSavePix(form: PixKeyForm) {
    setSaving(true);
    try {
      await updatePixKey(form.pix_key);
      setData((prev) => prev ? { ...prev, pix_key: form.pix_key } : prev);
      setEditingPix(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError('Não foi possível salvar a chave PIX. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (error && !data) {
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

  const nextPaymentDate = format(
    new Date(data.next_payment_date + 'T00:00:00'),
    "dd 'de' MMMM 'de' yyyy",
    { locale: ptBR },
  );

  const paidHistory = data.history.filter((h) => h.status === 'PAID');
  const pendingHistory = data.history.filter((h) => h.status === 'PENDING');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Pagamentos</h1>
        <p className="text-sm text-slate-400 mt-0.5">Histórico de recebimentos e chave PIX</p>
      </div>

      {saveSuccess && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Chave PIX atualizada com sucesso!
        </div>
      )}
      {error && data && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Próximo pagamento */}
        <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-5 text-white shadow-md">
          <p className="text-sm font-medium text-green-100">Próximo pagamento estimado</p>
          <p className="text-3xl font-bold mt-1">{formatBRL(data.current_month.commission)}</p>
          <p className="text-sm text-green-200 mt-1">{nextPaymentDate}</p>
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-xs text-green-200">
              {data.current_month.active_subscribers} assinantes × {formatBRL(data.commission_rate)}/mês
            </p>
            <p className="text-xs text-green-200 mt-0.5">
              Pago após D+30 do ciclo de faturamento
            </p>
          </div>
        </div>

        {/* Chave PIX */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Chave PIX para recebimento</p>
              <p className="text-xs text-slate-400 mt-0.5">Usada para pagamento automático mensal</p>
            </div>
            {!editingPix && (
              <button
                onClick={() => setEditingPix(true)}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 transition"
              >
                {data.pix_key ? 'Alterar' : 'Cadastrar'}
              </button>
            )}
          </div>

          {editingPix ? (
            <form onSubmit={handleSubmit(onSavePix)} className="space-y-3">
              <input
                type="text"
                placeholder="CPF, telefone, e-mail ou chave aleatória"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition ${
                  errors.pix_key ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
                {...register('pix_key', {
                  required: 'Chave PIX é obrigatória',
                  minLength: { value: 3, message: 'Chave muito curta' },
                })}
              />
              {errors.pix_key && (
                <p className="text-xs text-red-500">{errors.pix_key.message}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-brand-500 text-white text-sm font-medium py-2 hover:bg-brand-600 disabled:opacity-60 transition"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPix(false)}
                  className="flex-1 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium py-2 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : data.pix_key ? (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
              <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-mono text-slate-700 truncate">{data.pix_key}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-amber-700">Nenhuma chave PIX cadastrada</span>
            </div>
          )}
        </div>
      </div>

      {/* Pagamentos pendentes */}
      {pendingHistory.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-amber-800 mb-3">Aguardando pagamento</h2>
          <div className="space-y-2">
            {pendingHistory.map((h, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100">
                <p className="text-sm font-medium text-slate-700 capitalize">
                  {format(new Date(h.month + '-01'), 'MMMM yyyy', { locale: ptBR })}
                </p>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-slate-800">{formatBRL(h.commission)}</p>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Pendente</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico de pagamentos recebidos */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Pagamentos recebidos</h2>
        </div>
        {paidHistory.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            Nenhum pagamento recebido ainda.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {paidHistory.map((h, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-700 capitalize">
                    {format(new Date(h.month + '-01'), 'MMMM yyyy', { locale: ptBR })}
                  </p>
                  {h.paid_at && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pago em {format(new Date(h.paid_at), "dd/MM/yyyy")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-slate-800">{formatBRL(h.commission)}</p>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Pago</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
