"use client";
import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";

const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL || "#";
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || "#";

export default function Download() {
  return (
    <section
      id="baixar"
      className="py-20 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #003A16 0%, #004D20 40%, #003A16 100%)",
      }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(0,200,83,0.12) 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Pronto para descobrir quanto você{" "}
            <span className="text-accent">realmente ganha?</span>
          </h2>
          <p className="text-[rgba(255,255,255,0.65)] text-lg mb-8">
            Baixe agora. Grátis. Sem cartão de crédito.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <a
              href={PLAY_STORE_URL}
              className="inline-flex items-center justify-center gap-2 bg-white text-black font-semibold px-7 py-3.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Smartphone size={20} /> Google Play
            </a>
            <a
              href={APP_STORE_URL}
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white font-semibold px-7 py-3.5 rounded-full hover:bg-white hover:text-black transition-colors"
            >
              <Smartphone size={20} /> App Store
            </a>
          </div>

          {/* QR code placeholder */}
          <div className="inline-block mb-6">
            <div className="w-32 h-32 bg-[rgba(0,0,0,0.25)] border border-[rgba(255,255,255,0.15)] rounded-2xl flex flex-col items-center justify-center mx-auto p-3">
              <div className="grid grid-cols-4 gap-1 mb-2">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-[2px] ${
                      [0, 3, 5, 10, 12, 15, 7, 8].includes(i)
                        ? "bg-[rgba(255,255,255,0.8)]"
                        : "bg-[rgba(255,255,255,0.15)]"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[rgba(255,255,255,0.4)] text-[9px] text-center leading-tight">
                QR Code em breve
              </p>
            </div>
          </div>

          <p className="text-[rgba(255,255,255,0.4)] text-sm">
            Disponível para Android e iOS · Mais de 20 motoristas já usam
          </p>
        </motion.div>
      </div>
    </section>
  );
}
