"use client";
import { motion } from "framer-motion";
import TestimonialCard from "@/components/ui/TestimonialCard";

// TODO: Substituir por depoimentos reais verificados após o lançamento público
const testimonials = [
  {
    name: "Carlos S., Cuiabá - MT",
    plan: "Usuário Premium",
    text: "Antes eu não sabia se o dia tinha sido bom ou ruim. Agora eu sei na hora. O app me mostrou que eu gastava R$ 8 por dia só com água e lanche — parece pouco mas no mês dá R$ 240.",
    stars: 5,
  },
  {
    name: "Marcos A., Goiânia - GO",
    plan: "Usuário Premium",
    text: "A parcela do meu carro é R$ 1.200. O app me diz que preciso fazer R$ 180 por dia para cobrir tudo e ainda sobrar. Simples assim. Não precisa ser contador.",
    stars: 5,
  },
  {
    name: "José R., São Paulo - SP",
    plan: "Usuário Gratuito",
    text: "Já indiquei 3 colegas e recebi R$ 15 de cashback. Não é muito mas ajuda. E eles também estão gostando.",
    stars: 4,
  },
];

export default function Testimonials() {
  return (
    <section className="py-20 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            O que os motoristas estão dizendo
          </h2>
          <p className="text-[#A0A0A0]">
            Motoristas reais que já usam o Motorista Rico
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <TestimonialCard {...t} />
            </motion.div>
          ))}
        </div>

        <p className="text-center text-[#606060] text-xs">
          * Depoimentos de usuários reais do período de testes.
        </p>
      </div>
    </section>
  );
}
