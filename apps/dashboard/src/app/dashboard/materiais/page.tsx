'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchDashboard } from '@/lib/api';
import type { DashboardData } from '@/types';
import QRCode from 'qrcode';

const POSTS_SUGERIDOS = [
  {
    plataforma: 'YouTube (descrição)',
    texto: `🚗 Motorista de app? Controla suas finanças com o Motorista Rico!
Acompanhe seus ganhos, custos e meta diária em um só lugar.
Experimente 14 dias Premium grátis pelo meu link: {link}`,
  },
  {
    plataforma: 'Instagram / TikTok',
    texto: `Descobri um app que todo motorista de Uber e 99 precisa ter 📊
Se você quer saber quanto precisa ganhar por dia para pagar o carro, esse app calcula tudo.
Link na bio: {link}`,
  },
  {
    plataforma: 'WhatsApp / Telegram',
    texto: `Galera, to usando o Motorista Rico pra controlar minha renda de motorista.
Ele calcula meta diária, registra corridas e acompanha os gastos do carro.
Entra pelo meu link e ganha 14 dias Premium grátis: {link}`,
  },
];

const INSTRUCOES = [
  {
    numero: '01',
    titulo: 'Use sempre o seu link exclusivo',
    descricao: 'Coloque o link na descrição dos seus vídeos, no perfil do Instagram, grupos de WhatsApp e onde mais alcançar motoristas.',
  },
  {
    numero: '02',
    titulo: 'Seja autêntico',
    descricao: 'Conte sua experiência real com o app. Vídeos e posts com uso real convertem muito mais do que propaganda direta.',
  },
  {
    numero: '03',
    titulo: 'Destaque os 14 dias grátis',
    descricao: 'Usuários que entram pelo seu link ganham 14 dias Premium gratuitos. Esse é o principal diferencial para conversão.',
  },
  {
    numero: '04',
    titulo: 'Monitore no dashboard',
    descricao: 'Acompanhe cliques, cadastros e conversões no seu dashboard. Ajuste sua estratégia conforme os dados.',
  },
  {
    numero: '05',
    titulo: 'Evite spam',
    descricao: 'Links com taxa de conversão abaixo de 1% em 30 dias são automaticamente suspensos. Foque em audiência qualificada.',
  },
];

export default function MateriaisPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchDashboard()
      .then((d) => {
        setData(d);
        return QRCode.toDataURL(d.link, {
          width: 300,
          margin: 2,
          color: { dark: '#1e293b', light: '#ffffff' },
        });
      })
      .then(setQrDataUrl)
      .catch(console.error);
  }, []);

  function downloadQR() {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'qrcode-motorista-rico.png';
    a.click();
  }

  function copyPost(index: number, text: string) {
    const resolved = data ? text.replace('{link}', data.link) : text;
    navigator.clipboard.writeText(resolved).then(() => {
      setCopied(index);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const renderText = (template: string) =>
    data ? template.replace('{link}', data.link) : template;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Materiais de Divulgação</h1>
        <p className="text-sm text-slate-400 mt-0.5">QR Code, textos sugeridos e instruções de divulgação</p>
      </div>

      {/* QR Code */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">QR Code do seu link exclusivo</h2>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-shrink-0">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code do link exclusivo"
                className="w-40 h-40 rounded-xl border border-slate-100"
              />
            ) : (
              <div className="w-40 h-40 rounded-xl bg-slate-100 animate-pulse" />
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Seu link</p>
              <p className="text-sm font-mono text-slate-700 bg-slate-50 rounded-lg px-3 py-2 break-all">
                {data?.link ?? '...'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadQR}
                disabled={!qrDataUrl}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-60 transition shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Baixar QR Code (PNG)
              </button>
              <button
                onClick={() => data && navigator.clipboard.writeText(data.link)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar link
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Textos sugeridos */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Textos sugeridos para posts</h2>
        {POSTS_SUGERIDOS.map((post, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {post.plataforma}
              </span>
              <button
                onClick={() => copyPost(i, post.texto)}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition"
              >
                {copied === i ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copiado!
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copiar texto
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50 rounded-xl px-4 py-3">
              {renderText(post.texto)}
            </p>
          </div>
        ))}
      </div>

      {/* Instruções */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-5">Como divulgar corretamente</h2>
        <div className="space-y-4">
          {INSTRUCOES.map((inst, i) => (
            <div key={i} className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-50 text-brand-600 text-xs font-bold flex items-center justify-center">
                {inst.numero}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-700">{inst.titulo}</p>
                <p className="text-sm text-slate-500 mt-0.5">{inst.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Banner placeholder */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-6 text-white">
        <h2 className="text-sm font-semibold text-green-100 mb-1">Banners de divulgação</h2>
        <p className="text-sm text-green-200">
          Banners personalizados com seu link serão disponibilizados pela equipe Motorista Rico. Entre em contato via e-mail para solicitar artes personalizadas.
        </p>
        <a
          href="mailto:parceiros@motoristarico.app"
          className="inline-block mt-3 text-sm font-medium text-white underline hover:text-green-200 transition"
        >
          parceiros@motoristarico.app
        </a>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
