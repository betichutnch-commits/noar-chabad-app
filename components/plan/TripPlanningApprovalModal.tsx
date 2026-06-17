"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";

type TripPlanningApprovalModalProps = {
  tripId: string;
  tripName: string;
  open: boolean;
  onAcknowledged: () => void;
};

export function TripPlanningApprovalModal({
  tripId,
  tripName,
  open,
  onAcknowledged,
}: TripPlanningApprovalModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  if (!open || !mounted) return null;

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/planning-ack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "approval_modal" }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(String((payload as { error?: string }).error || "שמירת האישור נכשלה"));
      }
      onAcknowledged();
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "שמירת האישור נכשלה");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-5"
      role="presentation"
    >
      <div
        className={`absolute inset-0 bg-brand-dark/40 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="planning-approval-title"
        className={`relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-cyan-200 bg-surface-card shadow-[10px_10px_0_0_#FFC107] transition-all duration-300 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <div className="bg-gradient-to-l from-brand-cyan to-cyan-500 px-6 py-5 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 ring-2 ring-white/40">
            <CheckCircle2 size={30} strokeWidth={2} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/85">מחלקת בטיחות ומפעלים</p>
        </div>

        <div className="px-6 pb-6 pt-5 text-center">
          <h2 id="planning-approval-title" className="text-2xl font-black leading-snug text-brand-dark">
            הטיול אושר לפרסום ותכנון
          </h2>

          <p className="mt-3 truncate rounded-xl border border-dashed border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-bold text-brand-dark">
            {tripName}
          </p>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green py-3.5 text-base font-black text-white shadow-lg shadow-green-100 transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                שומר...
              </>
            ) : (
              "אישור"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
