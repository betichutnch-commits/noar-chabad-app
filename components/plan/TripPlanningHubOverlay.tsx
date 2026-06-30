"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Info,
  Loader2,
  MapPin,
  X,
} from "lucide-react";
import { TripDetailsDrawer } from "@/components/plan/TripDetailsDrawer";
import { useUser } from "@/hooks/useUser";
import { formatHebrewDateRange } from "@/lib/dateUtils";
import type { CoordinatorPlanningBrief, PlanningRequirementItem, PlanningRequirementTone } from "@/lib/coordinatorPlanningBrief";
import { isSustainabilityRequirementId } from "@/lib/sustainability";
import type { TripRecord } from "@/lib/types";
import { SustainabilityIconBadge } from "@/components/sustainability/SustainabilityIcon";

type PlanningBriefResponse = {
  ok: boolean;
  trip: TripRecord & { details?: Record<string, unknown> | null };
  brief: CoordinatorPlanningBrief;
  detailedPlanUrl: string;
};

const toneAccent: Record<PlanningRequirementTone, string> = {
  amber: "border-brand-yellow bg-amber-50",
  cyan: "border-brand-cyan bg-cyan-50",
  emerald: "border-brand-green bg-green-50",
  violet: "border-brand-pink bg-pink-50",
  slate: "border-cyan-200 bg-surface-muted",
};

function RequirementRow({ item, index }: { item: PlanningRequirementItem; index: number }) {
  const isSustainability = isSustainabilityRequirementId(item.id);

  return (
    <li className={`flex gap-3 border-r-4 pr-3 py-2.5 ${toneAccent[item.tone]}`}>
      {isSustainability ? (
        <SustainabilityIconBadge size={12} />
      ) : (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-brand-cyan bg-white text-[10px] font-black text-brand-cyan">
          {index + 1}
        </span>
      )}
      <div className="min-w-0 text-right">
        <p className="font-black text-sm text-brand-dark">{item.label}</p>
        {item.detail ? <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{item.detail}</p> : null}
      </div>
    </li>
  );
}

type TripPlanningHubOverlayProps = {
  tripId: string;
  open: boolean;
  onClose: () => void;
  onAcknowledged?: () => void;
};

export function TripPlanningHubOverlay({ tripId, open, onClose, onAcknowledged }: TripPlanningHubOverlayProps) {
  const router = useRouter();
  const { profile, loading: userLoading } = useUser("/");
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [payload, setPayload] = useState<PlanningBriefResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const loadBrief = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/planning-brief`);
      const data = (await res.json()) as PlanningBriefResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "טעינת נתוני התכנון נכשלה");
      setPayload(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת נתוני התכנון נכשלה");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (open && !userLoading) void loadBrief();
  }, [open, loadBrief, userLoading]);

  const handleHubAck = async () => {
    if (!tripId || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/planning-ack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "hub" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(String((data as { error?: string }).error || "שמירת האישור נכשלה"));
      }
      onAcknowledged?.();
      onClose();
      router.push(`/dashboard/trip/${tripId}/plan`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "שמירת האישור נכשלה");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !open) return null;

  const trip = payload?.trip;
  const brief = payload?.brief;
  const detailedPlanUrl = payload?.detailedPlanUrl || `/dashboard/trip/${tripId}/plan`;
  const details = (trip?.details || {}) as Record<string, unknown>;
  const endDate = typeof details.endDate === "string" ? details.endDate : trip?.start_date || "";
  const dateLabel = trip ? formatHebrewDateRange(trip.start_date || "", endDate) : "";

  return createPortal(
    <div className="fixed inset-0 z-[245] flex items-center justify-center p-4 sm:p-6" role="presentation">
      <button
        type="button"
        aria-label="סגירה"
        className={`absolute inset-0 bg-brand-dark/45 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="תכנון והיערכות לטיול"
        className={`relative z-10 flex w-full max-w-lg max-h-[min(90vh,720px)] flex-col overflow-hidden rounded-3xl border border-cyan-200 bg-surface-card shadow-[0_24px_64px_rgba(0,0,0,0.2),8px_8px_0_0_#FFC107] transition-all duration-300 ${
          visible ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {userLoading || loading ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="animate-spin text-brand-cyan" size={36} />
          </div>
        ) : error || !trip || !brief ? (
          <div className="p-8 text-center">
            <p className="font-bold text-red-600">{error || "לא נמצאו נתוני טיול"}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 text-sm font-bold text-brand-cyan hover:underline"
            >
              סגור
            </button>
          </div>
        ) : (
          <>
            <header className="relative shrink-0 bg-gradient-to-l from-brand-cyan to-cyan-500 px-5 py-4 text-white">
              <button
                type="button"
                onClick={onClose}
                aria-label="סגור"
                className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <X size={16} />
              </button>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">מאושר לפרסום ותכנון</p>
              <h1 className="mt-1 pe-8 text-xl font-black leading-tight">{trip.name}</h1>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {dateLabel ? (
                  <span className="inline-flex items-center gap-1 border border-white/25 bg-white/10 px-2 py-0.5 text-[11px] font-bold">
                    <CalendarDays size={12} />
                    {dateLabel}
                  </span>
                ) : null}
                {trip.branch ? (
                  <span className="inline-flex items-center gap-1 border border-white/25 bg-white/10 px-2 py-0.5 text-[11px] font-bold">
                    <MapPin size={12} />
                    {trip.branch}
                  </span>
                ) : null}
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-5">
              <section>
                <h2 className="text-xs font-black uppercase tracking-[0.12em] text-brand-dark">
                  לתשומת לבך, לטיול זה נדרש
                </h2>
                <ol className="mt-2 space-y-1.5 rounded-xl border border-cyan-100 bg-cyan-50/40 p-3">
                  {brief.requirements.map((item, index) => (
                    <RequirementRow key={item.id} item={item} index={index} />
                  ))}
                </ol>
              </section>

              <section className="grid gap-2 sm:grid-cols-2">
                <Link
                  href={`${detailedPlanUrl}?panel=documents`}
                  onClick={onClose}
                  className="group flex flex-col rounded-xl border border-cyan-200 bg-white p-3 text-right shadow-sm transition hover:border-brand-cyan"
                >
                  <FileText className="text-brand-cyan" size={20} />
                  <p className="mt-2 text-sm font-black text-brand-dark">מסמכים</p>
                  <p className="text-[11px] text-text-secondary">
                    {brief.documents.autoReady}/{brief.documents.total} מוכנים
                  </p>
                </Link>

                <button
                  type="button"
                  onClick={() => setDetailsOpen(true)}
                  className="group flex flex-col rounded-xl border border-pink-200 bg-pink-50 p-3 text-right text-start shadow-sm transition hover:border-brand-pink"
                >
                  <Info className="text-brand-pink" size={20} />
                  <p className="mt-2 text-sm font-black text-brand-dark">פרטי הטיול</p>
                  <p className="text-[11px] text-text-secondary">הגשה מקורית</p>
                </button>
              </section>

              <p className="text-center">
                <Link
                  href={detailedPlanUrl}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-cyan hover:underline"
                >
                  <ClipboardList size={13} />
                  תכנון מפורט
                </Link>
              </p>
            </div>

            <footer className="shrink-0 border-t border-cyan-100 bg-surface-muted/80 p-4">
              <button
                type="button"
                onClick={handleHubAck}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green py-3 text-sm font-black text-white shadow-md shadow-green-100 transition hover:brightness-105 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
                אישור
              </button>
            </footer>
          </>
        )}
      </div>

      {trip && profile ? (
        <TripDetailsDrawer open={detailsOpen} onClose={() => setDetailsOpen(false)} trip={trip} profile={profile} />
      ) : null}
    </div>,
    document.body,
  );
}
