'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginInfluencer, fetchDashboard } from '@/lib/api';
import { setAuthToken, setInfluencerUser, logout } from '@/lib/auth';

interface LoginForm {
  cpf: string;
  password: string;
}

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cpfValue, setCpfValue] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>();

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = formatCPF(e.target.value);
    setCpfValue(masked);
    setValue('cpf', masked);
  }

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    setError(null);
    try {
      const res = await loginInfluencer(data.cpf, data.password);
      setAuthToken(res.access_token);

      // Verificar se o usuário tem perfil de influencer aprovado
      try {
        const dashboard = await fetchDashboard();
        setInfluencerUser({
          name: res.user.name,
          channel_name: dashboard.channel_name,
          tier: dashboard.tier,
        });
        const redirect = searchParams.get('redirect') ?? '/dashboard';
        router.push(redirect);
      } catch (dashErr: unknown) {
        logout();
        const status = (dashErr as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          setError('Esta conta não tem um perfil de influencer aprovado. Aguarde a aprovação da sua candidatura.');
        } else {
          setError('Não foi possível acessar o dashboard. Tente novamente.');
        }
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (apiErr?.response?.status === 401) {
        setError('CPF ou senha incorretos.');
      } else {
        setError(apiErr?.response?.data?.message ?? 'Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">CPF</label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="username"
          placeholder="000.000.000-00"
          maxLength={14}
          value={cpfValue}
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition ${
            errors.cpf ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
          }`}
          {...register('cpf', {
            required: 'CPF é obrigatório',
            validate: (v) => v.replace(/\D/g, '').length === 11 || 'CPF inválido',
          })}
          onChange={handleCpfChange}
        />
        {errors.cpf && <p className="mt-1 text-xs text-red-500">{errors.cpf.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
        <input
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition ${
            errors.password ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
          }`}
          {...register('password', { required: 'Senha é obrigatória' })}
        />
        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-500 text-white font-semibold py-2.5 px-4 text-sm hover:bg-brand-600 active:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>

      <button
        type="button"
        className="w-full text-center text-sm text-slate-500 hover:text-brand-600 transition"
        onClick={() => router.push('/login/recuperar-senha')}
      >
        Esqueci minha senha
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Rota Financeira</h1>
          <p className="text-slate-500 mt-1 text-sm">Portal do Influencer</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Entrar na sua conta</h2>
          <p className="text-xs text-slate-500 mb-6">Use o mesmo CPF e senha do seu app Rota Financeira</p>
          <Suspense fallback={<div className="h-40 animate-pulse bg-slate-100 rounded-lg" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Acesso exclusivo para influencers aprovados pelo programa Rota Indica.
        </p>
      </div>
    </div>
  );
}
