"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bus, LayoutGrid, Route, Sparkles, UsersRound, X } from "lucide-react";
import { PLAN_TABLE_TOUR_SECTION_OPTIONS, type PlanTableTourSection } from "@/lib/planTableTour";

type PlanTableTourPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (section: PlanTableTourSection) => void;
};

const SECTION_ICONS: Record<PlanTableTourSection, React.ReactNode> = {
  schedule: <Route size={22} />,
  participants: <UsersRound size={22} />,
  transport: <Bus size={22} />,
  "quick-actions": <LayoutGrid size={22} />,
};

export function PlanTableTourPicker({ open, onClose, onSelect }: PlanTableTourPickerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[375] flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-brand-dark/55" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-tour-picker-title"
        className="relative w-full max-w-lg rounded-3xl border border-cyan-200 bg-surface-card p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted"
          aria-label="סגור"
        >
          <X size={16} />
        </button>

        <div className="mb-5 flex items-start gap-3 text-right">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-brand-cyan">
            <Sparkles size={22} />
          </div>
          <div>
            <h2 id="plan-tour-picker-title" className="text-xl font-black text-brand-dark">
              בחרו מסלול הדרכה
            </h2>
            <p className="mt-1 text-sm text-text-secondary">על מה תרצו לקבל הסבר עכשיו?</p>
          </div>
        </div>

        <div className="grid gap-2">
          {PLAN_TABLE_TOUR_SECTION_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border-subtle bg-white p-4 text-right transition-all hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50/40 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-brand-cyan">
                {SECTION_ICONS[option.id]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-brand-dark">{option.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-text-secondary">{option.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
