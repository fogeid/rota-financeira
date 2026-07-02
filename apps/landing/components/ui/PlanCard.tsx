interface PlanFeature {
  included: boolean;
  text: string;
}

interface PlanCardProps {
  name: string;
  price: string;
  priceLabel: string;
  subtitle: string;
  features: PlanFeature[];
  ctaLabel: string;
  highlighted?: boolean;
  badge?: string;
}

export default function PlanCard({
  name,
  price,
  priceLabel,
  subtitle,
  features,
  ctaLabel,
  highlighted,
  badge,
}: PlanCardProps) {
  return (
    <div
      className={`relative rounded-2xl p-8 border h-full flex flex-col ${
        highlighted
          ? "border-accent bg-[#111111] shadow-[0_0_30px_rgba(0,200,83,0.1)]"
          : "border-[rgba(255,255,255,0.08)] bg-[#1A1A1A]"
      }`}
    >
      {badge && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-accent text-black text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
          {badge}
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-white font-bold text-xl mb-1">{name}</h3>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-4xl font-bold text-white">{price}</span>
          {priceLabel && (
            <span className="text-[#A0A0A0] text-sm">{priceLabel}</span>
          )}
        </div>
        <p className="text-[#A0A0A0] text-sm">{subtitle}</p>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="shrink-0">{f.included ? "✅" : "❌"}</span>
            <span className={f.included ? "text-white" : "text-[#606060]"}>
              {f.text}
            </span>
          </li>
        ))}
      </ul>

      <button
        className={`w-full py-3 rounded-full font-semibold transition-all duration-200 ${
          highlighted
            ? "bg-accent text-black hover:bg-accent-dark"
            : "border border-[rgba(255,255,255,0.2)] text-white hover:border-accent hover:text-accent"
        }`}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
