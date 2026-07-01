const links = {
  Produto: [
    { label: "Funcionalidades", href: "#funcionalidades" },
    { label: "Planos", href: "#planos" },
    { label: "Download", href: "#baixar" },
  ],
  Empresa: [
    { label: "Sobre", href: "#" },
    { label: "Contato", href: "#" },
    { label: "Blog", href: "#" },
  ],
  Legal: [
    { label: "Termos de Uso", href: "#" },
    { label: "Política de Privacidade", href: "#" },
    { label: "Política de Cookies", href: "#" },
  ],
  Suporte: [
    { label: "FAQ", href: "#" },
    { label: "WhatsApp", href: "#" },
    { label: "E-mail", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#0A0A0A] border-t border-[rgba(255,255,255,0.06)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Logo + description */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-white font-bold text-xl block mb-3">
              Motorista Rico
            </span>
            <p className="text-[#606060] text-sm leading-relaxed mb-4">
              Gestão financeira simples para motoristas de Uber e 99.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                aria-label="Instagram"
                className="text-[#606060] hover:text-accent transition-colors"
              >
                {/* Instagram icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="TikTok"
                className="text-[#606060] hover:text-accent transition-colors"
              >
                {/* TikTok icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.72a8.18 8.18 0 0 0 4.78 1.52V6.79a4.86 4.86 0 0 1-1.01-.1z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="YouTube"
                className="text-[#606060] hover:text-accent transition-colors"
              >
                {/* YouTube icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.5 6.19a3.02 3.02 0 0 0-2.13-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.37.55A3.02 3.02 0 0 0 .5 6.19 31.47 31.47 0 0 0 0 12a31.47 31.47 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.13 2.14C4.5 20.5 12 20.5 12 20.5s7.5 0 9.37-.55a3.02 3.02 0 0 0 2.13-2.14A31.47 31.47 0 0 0 24 12a31.47 31.47 0 0 0-.5-5.81zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-white font-semibold text-sm mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-[#606060] hover:text-[#A0A0A0] text-sm transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[rgba(255,255,255,0.06)] pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-center">
          <p className="text-[#606060] text-sm">
            © 2026 Motorista Rico. Todos os direitos reservados.
          </p>
          <p className="text-[#606060] text-sm">
            Feito com ❤️ para os motoristas do Brasil
          </p>
        </div>
      </div>
    </footer>
  );
}
