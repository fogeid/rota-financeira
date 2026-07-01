import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Motorista Rico — Gestão Financeira para Motoristas de App",
  description:
    "Saiba exatamente quanto você ganha, quanto gasta e quanto precisa rodar por dia. O app financeiro feito para motoristas de Uber e 99.",
  keywords: "motorista uber, 99, gestão financeira, ganhos, custos, meta diária",
  openGraph: {
    title: "Motorista Rico",
    description: "Saiba exatamente quanto você ganha por dia.",
    url: "https://motoristarico.app",
    siteName: "Motorista Rico",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
