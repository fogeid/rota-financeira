"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import PlanCard from "@/components/ui/PlanCard";

const freeFeatures = [
  { included: true, text: "Meta diária calculada" },
  { included: true, text: "Registro de ganhos e gastos" },
  { included: true, text: "Controle de combustível" },
  { included: true, text: "Resumo semanal" },
  { included: true, text: "Código de indicação" },
  { included: false, text: "Relatório PDF mensal" },
  { included: false, text: "Cálculo de IR" },
  { included: false, text: "Histórico completo" },
];

const premiumFeatures = [
  { included: true, text: "Tudo do plano Gratuito" },
  { included: true, text: "Relatório PDF mensal" },
  { included: true, text: "Cálculo automático de IR" },
  { included: true, text: "Histórico de 12 meses" },
  { included: true, text: "Exportação de dados" },
  { included: true, text: "Suporte prioritário" },
];

export default function Plans() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="planos" className="py-20 bg-[#111111]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Comece grátis, evolua quando quiser
          </h2>
          <p className="text-[#A0A0A0] mb-8">
            Sem pegadinhas. Cancele quando quiser.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center bg-[#1A1A1A] rounded-full p-1 border border-[rgba(255,255,255,0.08)]">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                !annual
                  ? "bg-accent text-black"
                  : "text-[#A0A0A0] hover:text-white"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                annual
                  ? "bg-accent text-black"
                  : "text-[#A0A0A0] hover:text-white"
              }`}
            >
              Anual
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${
                  annual
                    ? "bg-black/20 text-black"
                    : "bg-accent text-black"
                }`}
              >
                -25%
              </span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
          >
            <PlanCard
              name="Gratuito"
              price="R$ 0"
              priceLabel=""
              subtitle="Para sempre"
              features={freeFeatures}
              ctaLabel="Baixar grátis"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <PlanCard
              name="Premium"
              price={annual ? "R$ 7,42" : "R$ 9,90"}
              priceLabel="/mês"
              subtitle={
                annual
                  ? "Cobrado R$ 89/ano · 14 dias grátis"
                  : "14 dias grátis para testar"
              }
              features={premiumFeatures}
              ctaLabel="Começar grátis por 14 dias"
              highlighted
              badge="Mais popular"
            />
          </motion.div>
        </div>

        <p className="text-center text-[#606060] text-sm mt-6">
          🔒 Pagamento seguro via PIX ou cartão · Cancele a qualquer momento
        </p>
      </div>
    </section>
  );
}
