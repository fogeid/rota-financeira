'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginInfluencer } from '@/lib/api';
import { setAuthToken, setInfluencerUser } from '@/lib/auth';

interface LoginForm {
  email: string;
  password: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<LoginForm>();

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    setError(null);
    try {
      const res = await loginInfluencer(data.email, data.password);
      setAuthToken(res.access_token);
      setInfluencerUser(res.influencer);
      const redirect = searchParams.get('redirect') ?? '/dashboard';
      router.push(redirect);
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (apiErr?.response?.status === 403) {
        setError('Acesso restrito a influencers aprovados. Aguarde a aprovação da sua candidatura.');
      } else {
        setError(apiErr?.response?.data?.message ?? 'E-mail ou senha incorretos.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    const email = getValues('email');
    if (!email) {
      setError('Informe seu e-mail para recuperar a senha.');
      return;
    }
    setForgotSent(true);
  }

  if (forgotSent) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
        Se esse e-mail estiver cadastrado, você receberá instruções de recuperação em breve.
        <button
          className="block mt-3 text-brand-600 font-medium hover:underline"
          onClick={() => setForgotSent(false)}
        >
          Voltar ao login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
        <input
          type="email"
          autoComplete="email"
          placeholder="ze@seucanal.com"
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition ${
            errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
          }`}
          {...register('email', {
            required: 'E-mail é obrigatório',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'E-mail inválido' },
          })}
        />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
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
        onClick={handleForgotPassword}
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
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Entrar na sua conta</h2>
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
