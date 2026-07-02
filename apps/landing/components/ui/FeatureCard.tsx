"use client";
import { motion } from "framer-motion";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

export default function FeatureCard({
  icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-[#1A1A1A] rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(0,200,83,0.3)] transition-colors duration-300 h-full"
    >
      <div className="w-12 h-12 rounded-full bg-[rgba(0,200,83,0.1)] flex items-center justify-center text-2xl mb-4">
        {icon}
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      <p className="text-[#A0A0A0] text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}
