import { ReactNode } from "react";

export default function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-[rgba(0,200,83,0.1)] text-accent border border-[rgba(0,200,83,0.3)]">
      {children}
    </span>
  );
}
