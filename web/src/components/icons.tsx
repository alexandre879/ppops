import { Brush, Building2, Factory, Hammer, Layers, ShieldCheck, Sofa, type LucideIcon } from "lucide-react";

import type { CategoryIcon } from "@/lib/types";

const ICONS: Record<CategoryIcon, LucideIcon> = {
  building: Building2,
  layers: Layers,
  brush: Brush,
  hammer: Hammer,
  sofa: Sofa,
  factory: Factory,
  shield: ShieldCheck,
};

export function CategoryIconView({ icon, className }: { icon: CategoryIcon; className?: string }) {
  const Icon = ICONS[icon] ?? Building2;
  return <Icon className={className} aria-hidden />;
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden>
        <rect width="40" height="40" rx="8" fill="#f26b1d" />
        <path d="M9 20.5 20 11l11 9.5" fill="none" stroke="#1c1917" strokeWidth="3.2" strokeLinejoin="round" />
        <path d="M13 19v11h5.5v-6h3v6H27V19" fill="#1c1917" />
      </svg>
      <span className="leading-none whitespace-nowrap">
        <span className={`block font-display text-[15px] font-extrabold tracking-tight ${light ? "text-white" : "text-stone-950"}`}>
          NEW HOUSE
        </span>
        <span className={`block text-[10.5px] font-semibold tracking-[0.32em] ${light ? "text-brand-400" : "text-brand-700"}`}>
          WORLD
        </span>
      </span>
    </span>
  );
}
