import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Motorista Rico — Portal do Influencer',
  description: 'Acompanhe suas comissões e métricas do programa Rota Indica',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
