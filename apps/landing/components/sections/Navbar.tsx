"use client";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#planos", label: "Planos" },
  { href: "#baixar", label: "Baixar" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[rgba(10,10,10,0.92)] backdrop-blur-md border-b border-[rgba(255,255,255,0.08)]"
          : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="text-white font-bold text-xl">
            Motorista Rico
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[#A0A0A0] hover:text-white text-sm transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          <a
            href="#baixar"
            className="hidden md:inline-flex items-center bg-accent text-black text-sm font-semibold px-5 py-2 rounded-full hover:bg-accent-dark transition-colors"
          >
            Baixar o app
          </a>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden bg-[#111111] border-t border-[rgba(255,255,255,0.08)] px-4 py-4 space-y-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block text-[#A0A0A0] hover:text-white text-sm py-3 border-b border-[rgba(255,255,255,0.05)] last:border-0"
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="pt-2">
            <a
              href="#baixar"
              className="block bg-accent text-black text-sm font-semibold px-5 py-3 rounded-full text-center hover:bg-accent-dark transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Baixar o app
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
