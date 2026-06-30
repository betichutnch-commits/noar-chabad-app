"use client";

import type { SustainabilityMotif } from "@/lib/sustainability";
import { SustainabilityIconBadge } from "./SustainabilityIcon";
import { SustainabilityMotifCard } from "./SustainabilityMotifCard";
type SustainabilityMotifStripProps = {
  motifs: SustainabilityMotif[];
  compact?: boolean;
  title?: string;
  fullWidth?: boolean;
};

export function SustainabilityMotifStrip({
  motifs,
  compact = true,
  title = "דגשי קיימות ואיכות סביבה",
  fullWidth = false,
}: SustainabilityMotifStripProps) {
  if (!motifs.length) return null;

  const useFullWidth = fullWidth || motifs.length === 1;

  return (
    <section className="space-y-2 rounded-2xl border border-dashed border-brand-green bg-green-50/60 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-black text-green-900">
        <SustainabilityIconBadge size={12} className="shadow-none" />
        {title}
      </p>
      <div className={`grid w-full gap-2 ${useFullWidth ? "grid-cols-1" : "md:grid-cols-2"}`}>
        {motifs.map((motif) => (
          <SustainabilityMotifCard key={motif.id} motif={motif} compact={compact} />
        ))}
      </div>
    </section>
  );
}
