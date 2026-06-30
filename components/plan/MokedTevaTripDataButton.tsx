"use client";

import React, { useMemo, useState } from "react";
import { ClipboardCopy, Loader2 } from "lucide-react";
import { MokedTevaTripDataDialog } from "@/components/plan/MokedTevaTripDataDialog";
import { getPlanDayGregorianLabel } from "@/lib/dateUtils";
import { buildMokedTevaTripCopyData } from "@/lib/mokedTevaTripCopyData";
import type { MokedTevaTripCopyData } from "@/lib/mokedTevaTripCopyData";
import { tripNeedsMokedTevaCoordination } from "@/lib/regulation/compliance";
import { seedRowsFromTripDetails } from "@/lib/tripPlan";
import type { TripAutofillMeta } from "@/lib/tripDocumentAutofill";

type TripLike = {
  name?: string | null;
  start_date?: string | null;
  coordinator_name?: string | null;
  details?: Record<string, unknown> | null;
};

type PlanRowLike = {
  day_index?: number | null;
  order_index?: number;
  location_text?: string | null;
  event_text?: string | null;
};

type MokedTevaTripDataButtonProps = {
  tripId: string;
  trip: TripLike;
  data?: MokedTevaTripCopyData;
  className?: string;
  label?: string;
};

function planRowsFromTripDetails(details?: Record<string, unknown> | null) {
  return seedRowsFromTripDetails(details).map((row) => ({
    day_index: row.day_index,
    order_index: row.order_index,
    location_text: row.location_text,
    event_text: row.event_text,
  }));
}

export function tripShowsMokedTevaTripData(trip: TripLike) {
  const details = (trip.details || {}) as Record<string, unknown>;
  const seeded = seedRowsFromTripDetails(details);
  return tripNeedsMokedTevaCoordination({
    planRows: seeded.map((row) => ({
      eventText: row.event_text,
      locationSensitive: row.location_sensitive,
    })),
    tripDetails: details,
  });
}

function buildCopyData(trip: TripLike, planRows: PlanRowLike[]) {
  const tripMeta: TripAutofillMeta = {
    name: trip.name,
    start_date: trip.start_date,
    coordinator_name: trip.coordinator_name,
    details: trip.details,
  };
  return buildMokedTevaTripCopyData({
    trip: tripMeta,
    tripName: trip.name,
    tripStartDate: trip.start_date,
    planRows,
    dayLabel: (dayIndex) => getPlanDayGregorianLabel(trip.start_date, dayIndex),
  });
}

export function MokedTevaTripDataButton({
  tripId,
  trip,
  data,
  className = "",
  label = "נתוני הטיול",
}: MokedTevaTripDataButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copyData, setCopyData] = useState<MokedTevaTripCopyData | null>(data || null);
  const [error, setError] = useState("");

  const visible = useMemo(() => tripShowsMokedTevaTripData(trip), [trip]);

  if (!visible) return null;

  const handleOpen = async () => {
    if (copyData) {
      setOpen(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/plan`, { credentials: "include", cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as {
        rows?: PlanRowLike[];
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error || "טעינת נתוני הטיול נכשלה");
      const planRows = Array.isArray(payload.rows) && payload.rows.length ? payload.rows : planRowsFromTripDetails(trip.details);
      setCopyData(buildCopyData(trip, planRows));
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת נתוני הטיול נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleOpen()}
        disabled={loading}
        className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 text-sm font-black text-brand-cyan shadow-sm hover:bg-cyan-50 disabled:opacity-60 ${className}`}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCopy size={16} />}
        {label}
      </button>
      {error ? <p className="mt-1 text-xs font-bold text-red-600">{error}</p> : null}
      {open && copyData ? <MokedTevaTripDataDialog data={copyData} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
