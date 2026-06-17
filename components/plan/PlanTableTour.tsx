"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import {
  PLAN_TABLE_TOUR_STEPS,
  hasCompletedPlanTableTour,
  markPlanTableTourCompleted,
  type PlanTableTourNavigate,
  type PlanTableTourPlacement,
  type PlanTableTourStep,
} from "@/lib/planTableTour";

type Rect = { top: number; left: number; width: number; height: number };

type PlanTableTourProps = {
  enabled: boolean;
  steps?: PlanTableTourStep[];
  forceOpen?: boolean;
  markCompleted?: boolean;
  onForceOpenConsumed?: () => void;
  onClose?: () => void;
  onNavigate?: (nav: PlanTableTourNavigate) => void;
};

function measureTarget(selector: string): Rect | null {
  const el = document.querySelector(`[data-plan-tour="${selector}"]`);
  if (!el) return null;
  const box = el.getBoundingClientRect();
  const pad = 8;
  return {
    top: Math.max(8, box.top - pad),
    left: Math.max(8, box.left - pad),
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  };
}

type BubbleBox = { top: number; left: number; width: number; height: number };

function clampBubble(top: number, left: number, size: { width: number; height: number }) {
  return {
    top: Math.min(Math.max(12, top), window.innerHeight - size.height - 12),
    left: Math.min(Math.max(12, left), window.innerWidth - size.width - 12),
  };
}

function bubbleBox(pos: { top: number; left: number }, size: { width: number; height: number }): BubbleBox {
  return { top: pos.top, left: pos.left, width: size.width, height: size.height };
}

function overlapsTarget(target: Rect, bubble: BubbleBox, gap = 12) {
  return !(
    bubble.left + bubble.width + gap <= target.left ||
    target.left + target.width + gap <= bubble.left ||
    bubble.top + bubble.height + gap <= target.top ||
    target.top + target.height + gap <= bubble.top
  );
}

function positionForPlacement(
  rect: Rect,
  placement: PlanTableTourPlacement,
  size: { width: number; height: number },
) {
  const gap = 16;
  let top = rect.top;
  let left = rect.left;

  switch (placement) {
    case "bottom":
      top = rect.top + rect.height + gap;
      left = rect.left + rect.width / 2 - size.width / 2;
      break;
    case "top":
      top = rect.top - size.height - gap;
      left = rect.left + rect.width / 2 - size.width / 2;
      break;
    case "left":
      top = rect.top + rect.height / 2 - size.height / 2;
      left = rect.left - size.width - gap;
      break;
    case "right":
      top = rect.top + rect.height / 2 - size.height / 2;
      left = rect.left + rect.width + gap;
      break;
    default:
      break;
  }

  return clampBubble(top, left, size);
}

function resolveBubblePosition(
  rect: Rect | null,
  preferred: PlanTableTourPlacement,
  size: { width: number; height: number },
) {
  if (!rect || preferred === "center") {
    return {
      top: Math.max(16, window.innerHeight / 2 - size.height / 2),
      left: Math.max(16, window.innerWidth / 2 - size.width / 2),
    };
  }

  const candidates: PlanTableTourPlacement[] = [];
  const push = (p: PlanTableTourPlacement) => {
    if (!candidates.includes(p)) candidates.push(p);
  };

  push(preferred);
  if (rect.height < 96) {
    push("bottom");
    push("top");
  }
  if (preferred === "right") push("left");
  if (preferred === "left") push("right");
  push("bottom");
  push("top");
  push("left");
  push("right");

  for (const placement of candidates) {
    const pos = positionForPlacement(rect, placement, size);
    if (!overlapsTarget(rect, bubbleBox(pos, size))) return pos;
  }

  return clampBubble(rect.top + rect.height + 16, rect.left + rect.width / 2 - size.width / 2, size);
}

export function PlanTableTour({
  enabled,
  steps: stepsProp,
  forceOpen = false,
  markCompleted = true,
  onForceOpenConsumed,
  onClose,
  onNavigate,
}: PlanTableTourProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const autoOpenHandledRef = useRef(false);
  const onForceOpenConsumedRef = useRef(onForceOpenConsumed);
  const onNavigateRef = useRef(onNavigate);
  const onCloseRef = useRef(onClose);

  onForceOpenConsumedRef.current = onForceOpenConsumed;
  onNavigateRef.current = onNavigate;
  onCloseRef.current = onClose;

  const isSectionTour = Boolean(stepsProp);

  const steps = stepsProp ?? PLAN_TABLE_TOUR_STEPS;
  const step: PlanTableTourStep = steps[stepIndex] ?? steps[0];
  const isLast = stepIndex >= steps.length - 1;
  const isFirst = stepIndex === 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (forceOpen) {
      setStepIndex(0);
      setOpen(true);
      onForceOpenConsumedRef.current?.();
      return;
    }
    if (isSectionTour || hasCompletedPlanTableTour() || autoOpenHandledRef.current) return;

    const timer = window.setTimeout(() => {
      autoOpenHandledRef.current = true;
      setOpen(true);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [enabled, forceOpen, isSectionTour]);

  const refreshTarget = useCallback(() => {
    if (!step.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(`[data-plan-tour="${step.target}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" });
    requestAnimationFrame(() => {
      setTargetRect(measureTarget(step.target!));
    });
  }, [step.target]);

  useLayoutEffect(() => {
    if (!open) return;
    if (step.tab || step.peopleSection) {
      onNavigateRef.current?.({ tab: step.tab, peopleSection: step.peopleSection });
    }
  }, [open, stepIndex, step.tab, step.peopleSection]);

  useLayoutEffect(() => {
    if (!open) return;
    const delay = step.tab || step.peopleSection ? 180 : 0;
    const timer = window.setTimeout(() => refreshTarget(), delay);
    const onLayout = () => refreshTarget();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    const interval = window.setInterval(refreshTarget, 400);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
      window.clearInterval(interval);
    };
  }, [open, refreshTarget, stepIndex, step.tab, step.peopleSection]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  const closeTour = (completed: boolean) => {
    if (!isSectionTour) {
      markPlanTableTourCompleted();
    } else if (completed && markCompleted) {
      markPlanTableTourCompleted();
    }
    setOpen(false);
    setStepIndex(0);
    setTargetRect(null);
    onCloseRef.current?.();
  };

  const goNext = () => {
    if (isLast) {
      closeTour(true);
      return;
    }
    setStepIndex((index) => index + 1);
  };

  const goPrev = () => {
    if (!isFirst) setStepIndex((index) => index - 1);
  };

  if (!mounted || !open) return null;

  const bubbleWidth = Math.min(360, window.innerWidth - 24);
  const bubbleHeight = 220;
  const placement = step.placement ?? (step.target ? "bottom" : "center");
  const bubblePos = resolveBubblePosition(targetRect, placement, {
    width: bubbleWidth,
    height: bubbleHeight,
  });
  const maskId = "plan-table-tour-spotlight-mask";

  return createPortal(
    <div className="fixed inset-0 z-[380]" role="presentation">
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            {targetRect ? (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx={16}
                ry={16}
                fill="black"
              />
            ) : null}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(38, 50, 56, 0.58)" mask={`url(#${maskId})`} />
      </svg>

      {targetRect ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-4 ring-brand-cyan/80"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
          aria-hidden
        />
      ) : null}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-table-tour-title"
        className="absolute rounded-3xl border border-cyan-200 bg-surface-card p-5 shadow-2xl"
        style={{ top: bubblePos.top, left: bubblePos.left, width: bubbleWidth }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2 text-right">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-brand-cyan">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                הדרכה {stepIndex + 1} מתוך {steps.length}
              </p>
              <h2 id="plan-table-tour-title" className="text-lg font-black leading-snug text-brand-dark">
                {step.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => closeTour(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted"
            aria-label="סגור הדרכה"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-right text-sm leading-relaxed text-text-secondary">{step.body}</p>

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-border-subtle pt-4">
          <button
            type="button"
            onClick={() => closeTour(false)}
            className="text-xs font-bold text-text-muted hover:text-brand-dark"
          >
            דלג
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={isFirst}
              className="inline-flex items-center gap-1 rounded-xl border border-border-subtle px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              <ChevronRight size={14} />
              הקודם
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1 rounded-xl bg-brand-cyan px-4 py-2 text-xs font-black text-white hover:brightness-105"
            >
              {isLast ? "סיום" : "הבא"}
              {!isLast ? <ChevronLeft size={14} /> : null}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
