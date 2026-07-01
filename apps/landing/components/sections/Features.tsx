"use client";
import { motion } from "framer-motion";
import FeatureCard from "@/components/ui/FeatureCard";

const features = [
  {
    icon: "🎯",
    title: "Sua meta do dia, na hora",
    description:
      "Informe sua parcela, seus custos e quanto quer ganhar. O Motorista Rico calcula quanto você precisa faturar hoje.",
  },
  {
    icon: "💰",
    title: "Registre cada corrida",
    description:
      "Conecte com Uber e 99 ou registre manualmente. Veja seus ganhos do dia, da semana e do mês.",
  },
  {
    icon: "⛽",
    title: "Abastecimento e manutenção",
    description:
      "Registre combustível, lavagens e manutenções. Saiba exatamente quanto custa para você trabalhar.",
  },
  {
    icon: "📊",
    title: "Relatórios mensais em PDF",
    description:
      "Veja um resumo completo do seu mês com um toque. Guarde para a declaração do IR ou para seu controle pessoal.",
  },
  {
    icon: "📋",
    title: "Quanto guardar para o IR",
    description:
      "O app calcula automaticamente quanto você precisa reservar para o carnê-leão todo mês. Sem surpresas.",
  },
  {
    icon: "🤝",
    title: "Indique e ganhe dinheiro",
    description:
      "Compartilhe seu código com outros motoristas. A cada um que assinar o Premium, você recebe cashback.",
  },
];

export default function Features() {
  return (
    <section id="funcionalidades" className="py-20 bg-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            Tudo que você precisa para{" "}
            <span className="text-accent">tomar controle</span> das suas
            finanças
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
