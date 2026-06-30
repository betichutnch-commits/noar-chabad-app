"use client";

import { getOccurrenceRegulationHints } from "@/lib/regulation/compliance";
import { BUSINESS_LICENSE_TASK_ID, tripPlanTaskRowKey } from "@/lib/tripPlanTasks";

type RegulationOccurrenceBadgesProps = {
  planRowId: string;
  eventText?: string | null;
  onNavigateToTask: (taskRowKey: string) => void;
};

export function RegulationOccurrenceBadges({ planRowId, eventText, onNavigateToTask }: RegulationOccurrenceBadgesProps) {
  const hints = getOccurrenceRegulationHints(eventText);
  if (!hints.needsLicense && !hints.needsInsurance) return null;

  const taskRowKey = tripPlanTaskRowKey(BUSINESS_LICENSE_TASK_ID, planRowId);

  return (
    <div className="flex flex-wrap justify-center gap-1">
      {hints.needsLicense ? (
        <button
          type="button"
          onClick={() => onNavigateToTask(taskRowKey)}
          className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-black text-purple-800 transition-colors hover:border-purple-300 hover:bg-purple-100"
          title="מעבר למשימת רישוי בלשונית משימות"
        >
          {hints.licenseLabel}
        </button>
      ) : null}
      {hints.needsInsurance ? (
        <button
          type="button"
          onClick={() => onNavigateToTask(taskRowKey)}
          className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-800 transition-colors hover:border-sky-300 hover:bg-sky-100"
          title="מעבר למשימת ביטוח בלשונית משימות"
        >
          {hints.insuranceLabel}
        </button>
      ) : null}
    </div>
  );
}
