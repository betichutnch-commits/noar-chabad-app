"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { TripDetailsView } from "@/components/TripDetailsView";
import type { AppProfile, TripRecord } from "@/lib/types";

type TripDetailsDrawerProps = {
  open: boolean;
  onClose: () => void;
  trip: TripRecord & { details?: Record<string, unknown> | null; department?: string | null };
  profile?: (AppProfile & { branch?: string | null; branch_name?: string | null }) | null;
};

export function TripDetailsDrawer({ open, onClose, trip, profile }: TripDetailsDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[240]" role="presentation">
      <button
        type="button"
        aria-label="סגירת פרטי הטיול"
        className={`absolute inset-0 bg-brand-dark/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="פרטי הטיול"
        className={`absolute inset-y-0 left-0 flex w-full max-w-2xl flex-col border-r border-cyan-200 bg-surface-base shadow-2xl transition-transform duration-300 ease-out ${
          visible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cyan-100 bg-gradient-to-l from-brand-cyan to-cyan-500 px-5 py-4 text-white">
          <div className="min-w-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">פרטי הטיול</p>
            <h2 className="truncate text-lg font-black">{trip.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white hover:bg-white/25"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-5">
          <TripDetailsView trip={trip} profile={profile} isEditable={false} isPublic={false} />
        </div>
      </aside>
    </div>,
    document.body,
  );
}
