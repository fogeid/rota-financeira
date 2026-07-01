"use client";
import { motion } from "framer-motion";
import Badge from "@/components/ui/Badge";
import { Smartphone } from "lucide-react";

const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL || "#";
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || "#";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay },
});

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center pt-16"
      style={{
        background:
          "linear-gradient(135deg, #0A0A0A 0%, #081408 50%, #0A0A0A 100%)",
      }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(0,200,83,0.06) 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div>
            <motion.div {...fadeUp(0.05)} className="mb-6 flex justify-center lg:justify-start">
              <Badge>🚗 Para motoristas de Uber e 99</Badge>
            </motion.div>

            <motion.h1
              {...fadeUp(0.15)}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 text-center lg:text-left"
            >
              Descubra quanto você{" "}
              <span className="text-accent">realmente ganha</span> por dia
            </motion.h1>

            <motion.p
              {...fadeUp(0.25)}
              className="text-[#A0A0A0] text-lg mb-8 max-w-lg mx-auto lg:mx-0 text-center lg:text-left"
            >
              Motorista Rico calcula sua meta diária, controla seus gastos e
              mostra se o dia valeu a pena — tudo em um só lugar.
            </motion.p>

            <motion.div
              {...fadeUp(0.35)}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-4"
            >
              <a
                href={PLAY_STORE_URL}
                className="inline-flex items-center justify-center gap-2 bg-accent text-black font-semibold px-6 py-3.5 rounded-full hover:bg-accent-dark transition-colors shadow-lg shadow-[rgba(0,200,83,0.2)]"
              >
                <Smartphone size={18} /> Baixar para Android
              </a>
              <a
                href={APP_STORE_URL}
                className="inline-flex items-center justify-center gap-2 border border-[rgba(255,255,255,0.2)] text-white font-semibold px-6 py-3.5 rounded-full hover:border-accent hover:text-accent transition-colors"
              >
                <Smartphone size={18} /> Baixar para iOS
              </a>
            </motion.div>

            <motion.p
              {...fadeUp(0.45)}
              className="text-[#606060] text-sm text-center lg:text-left"
            >
              Grátis para começar · Sem cartão de crédito
            </motion.p>
          </div>

          {/* Right: Phone mockup */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="w-64 h-[520px] rounded-[3rem] border-[3px] border-[#2A2A2A] bg-[#111111] shadow-2xl overflow-hidden">
                {/* Status bar */}
                <div className="bg-[#0A0A0A] px-5 pt-4 pb-2 flex justify-between items-center">
                  <span className="text-white text-xs font-medium">9:41</span>
                  <div className="flex gap-0.5 items-end">
                    {[12, 10, 8].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-accent rounded-sm"
                        style={{ height: h }}
                      />
                    ))}
                  </div>
                </div>

                {/* App content */}
                <div className="bg-[#0A0A0A] h-full px-4 py-4 space-y-3">
                  <div>
                    <p className="text-[#A0A0A0] text-xs mb-0.5">Boa tarde, Carlos 👋</p>
                    <p className="text-white font-bold text-xl">R$ 187,50</p>
                    <p className="text-[#606060] text-xs">hoje até agora</p>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="bg-[#222] rounded-full h-1.5 overflow-hidden mb-1">
                      <div
                        className="bg-accent h-full rounded-full"
                        style={{ width: "73%" }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <p className="text-[#A0A0A0] text-xs">73% da meta</p>
                      <p className="text-accent text-xs font-medium">faltam R$ 67,50</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#1A1A1A] rounded-xl p-3">
                      <p className="text-[#606060] text-xs mb-1">Corridas</p>
                      <p className="text-white font-bold text-lg">14</p>
                    </div>
                    <div className="bg-[#1A1A1A] rounded-xl p-3">
                      <p className="text-[#606060] text-xs mb-1">Combustível</p>
                      <p className="text-red-400 font-bold text-lg">-R$ 45</p>
                    </div>
                  </div>

                  {/* Meta card */}
                  <div className="bg-[rgba(0,200,83,0.08)] border border-[rgba(0,200,83,0.25)] rounded-xl p-3">
                    <p className="text-[#A0A0A0] text-xs mb-0.5">Meta do dia</p>
                    <p className="text-accent font-bold text-2xl">R$ 255,00</p>
                    <p className="text-[#606060] text-xs">cobrir tudo e sobrar</p>
                  </div>

                  {/* Earnings list */}
                  <div className="space-y-1.5">
                    {[
                      { desc: "Corrida • 14:23", val: "+R$ 18,50" },
                      { desc: "Corrida • 13:45", val: "+R$ 12,00" },
                      { desc: "Almoço", val: "-R$ 22,00" },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-1 border-b border-[rgba(255,255,255,0.05)]">
                        <span className="text-[#A0A0A0] text-xs">{item.desc}</span>
                        <span className={`text-xs font-medium ${item.val.startsWith("+") ? "text-accent" : "text-red-400"}`}>
                          {item.val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Glow under phone */}
              <div
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-40 h-6 rounded-full blur-xl"
                style={{ background: "rgba(0,200,83,0.25)" }}
              />
            </div>
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-16 grid grid-cols-3 gap-4 max-w-sm mx-auto lg:mx-0"
        >
          {[
            { value: "20+", label: "motoristas testando" },
            { value: "R$ 0", label: "para começar" },
            { value: "2 min", label: "para configurar" },
          ].map((stat) => (
            <div
              key={stat.value}
              className="border border-[rgba(255,255,255,0.08)] rounded-xl p-4 text-center"
            >
              <p className="text-accent font-bold text-xl">{stat.value}</p>
              <p className="text-[#A0A0A0] text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
