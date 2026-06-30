"use client";

import type { SustainabilityMotif } from "@/lib/sustainability";
import { SustainabilityIconBadge } from "./SustainabilityIcon";
type SustainabilityMotifCardProps = {
  motif: SustainabilityMotif;
  compact?: boolean;
};

export function SustainabilityMotifCard({ motif, compact = false }: SustainabilityMotifCardProps) {
  return (
    <article className="w-full rounded-xl border border-brand-green bg-green-50 p-3 text-right shadow-sm">
      <div className="mb-1.5 flex items-start gap-2">
        <SustainabilityIconBadge size={14} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-black text-brand-dark">{motif.title}</h4>
          <p className="mt-0.5 text-[11px] font-bold leading-relaxed text-green-900">{motif.topic}</p>
        </div>
      </div>
      {!compact ? <p className="text-[11px] leading-relaxed text-text-secondary">{motif.body}</p> : null}
    </article>
  );
}
