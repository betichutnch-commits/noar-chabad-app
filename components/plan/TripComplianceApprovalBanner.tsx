"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";

type ComplianceSummary = {
  mandatoryOpen: number;
  recommendedOpen: number;
};

export function TripComplianceApprovalBanner({ tripId }: { tripId: string }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/trips/${tripId}/regulation-compliance`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        setSummary(data.compliance?.summary || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  if (loading) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs font-bold text-amber-800">
        <Loader2 size={14} className="animate-spin" />
        בודק ציות לחוזר 585…
      </div>
    );
  }

  if (!summary || (summary.mandatoryOpen === 0 && summary.recommendedOpen === 0)) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-950">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <div>
          <p className="font-black">ציות לחוזר 585 — לפני אישור</p>
          <p className="mt-1 font-bold">
            {summary.mandatoryOpen > 0
              ? `${summary.mandatoryOpen} דרישות חובה פתוחות`
              : null}
            {summary.mandatoryOpen > 0 && summary.recommendedOpen > 0 ? " · " : null}
            {summary.recommendedOpen > 0 ? `${summary.recommendedOpen} מומלצות` : null}
          </p>
          <p className="mt-1 text-[11px] text-amber-800">אזהרה בלבד — לא חוסם אישור. מומלץ לוודא לפני פרסום.</p>
          <Link
            href={`/dashboard/trip/${tripId}/plan?quickAction=guidelines`}
            className="mt-2 inline-block font-black text-brand-cyan hover:underline"
          >
            פתיחת פאנל ציות והנחיות
          </Link>
        </div>
      </div>
    </div>
  );
}
