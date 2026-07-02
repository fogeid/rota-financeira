interface TestimonialCardProps {
  name: string;
  plan: string;
  text: string;
  stars: number;
}

export default function TestimonialCard({
  name,
  plan,
  text,
  stars,
}: TestimonialCardProps) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("");

  return (
    <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[rgba(0,200,83,0.15)] h-full flex flex-col">
      <div className="text-accent text-5xl font-serif leading-none mb-3 opacity-40">
        &ldquo;
      </div>
      <p className="text-[#A0A0A0] text-sm leading-relaxed flex-1 mb-6">{text}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-black font-bold text-sm shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{name}</p>
          <p className="text-[#606060] text-xs">{plan}</p>
        </div>
        <div className="text-accent text-sm shrink-0">
          {"★".repeat(stars)}
          {"☆".repeat(5 - stars)}
        </div>
      </div>
    </div>
  );
}
