"use client";

import { PlanQuickDialog } from "@/components/plan/PlanQuickDialog";
import type { SustainabilityMotif } from "@/lib/sustainability";
import { SustainabilityIconBadge } from "./SustainabilityIcon";
import { SustainabilityMotifCard } from "./SustainabilityMotifCard";

export function SustainabilityBriefDialog({
  motifs,
  activityLabel,
  onClose,
}: {
  motifs: SustainabilityMotif[];
  activityLabel: string;
  onClose: () => void;
}) {
  return (
    <PlanQuickDialog title={`קיימות — ${activityLabel}`} onClose={onClose}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto text-sm text-gray-700">
        <div className="rounded-xl border border-brand-green bg-green-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-black text-green-900">
            <SustainabilityIconBadge size={12} />
            קיימות, איכות סביבה וצמצום צריכה
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
            הנחיות לתכנון ידידותי לסביבה — צמצום בזבוז, שימוש חוזר ושמירה על השטח.
          </p>
        </div>
        <div className="space-y-3">
          {motifs.map((motif) => (
            <SustainabilityMotifCard key={motif.id} motif={motif} />
          ))}
        </div>
      </div>
    </PlanQuickDialog>
  );
}
