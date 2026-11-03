import { Brush, Building2, Factory, Hammer, Layers, ShieldCheck, Sofa, type LucideIcon } from "lucide-react";
import Image from "next/image";

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
      {/* The emblem's teal and gold need a light ground to read on the dark header and footer. */}
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]">
        <Image src="/logo-mark.png" alt="" width={203} height={166} loading="eager" className="h-auto w-8" />
      </span>
      <span className="leading-none whitespace-nowrap">
        <span className={`block font-display text-[15px] font-extrabold tracking-tight ${light ? "text-white" : "text-stone-950"}`}>
          NEW HOUSE
        </span>
        <span className={`mt-0.5 block text-[10.5px] font-semibold tracking-[0.32em] ${light ? "text-[#d4b06a]" : "text-[#9a7a3c]"}`}>
          WORLD
        </span>
      </span>
    </span>
  );
}
