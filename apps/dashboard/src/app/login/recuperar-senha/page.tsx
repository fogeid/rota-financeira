'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { forgotPassword } from '@/lib/api';

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function RecuperarSenhaPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Informe um telefone válido.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const e164 = `+55${digits}`;
      await forgotPassword(e164);
      setSent(true);
    } catch {
      setError('Não foi possível enviar o código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Código enviado por SMS</h2>
          <p className="text-sm text-slate-500 mb-6">
            Um código de 6 dígitos foi enviado para o telefone cadastrado. Use-o para redefinir sua senha.
          </p>
          <button
            onClick={() => router.push('/login/redefinir-senha')}
            className="w-full rounded-lg bg-brand-500 text-white font-semibold py-2.5 px-4 text-sm hover:bg-brand-600 transition shadow-sm"
          >
            Inserir código
          </button>
          <button
            onClick={() => router.push('/login')}
            className="w-full mt-3 text-sm text-slate-500 hover:text-brand-600 transition"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Recuperar senha</h2>
          <p className="text-sm text-slate-500 mb-6">
            Informe o telefone cadastrado no app Rota Financeira. Enviaremos um código por SMS.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="(00) 00000-0000"
                maxLength={15}
                value={phone}
                onChange={handlePhoneChange}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-500 text-white font-semibold py-2.5 px-4 text-sm hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
            >
              {loading ? 'Enviando...' : 'Enviar código por SMS'}
            </button>

            <button
              type="button"
              onClick={() => router.push('/login')}
              className="w-full text-center text-sm text-slate-500 hover:text-brand-600 transition"
            >
              Voltar ao login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
