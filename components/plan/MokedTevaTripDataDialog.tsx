"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ClipboardCopy, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { MokedTevaTripCopyData } from "@/lib/mokedTevaTripCopyData";

type MokedTevaTripDataDialogProps = {
  data: MokedTevaTripCopyData;
  onClose: () => void;
};

async function copyText(value: string) {
  if (!value || value === "—") return;
  await navigator.clipboard.writeText(value);
}

function fieldGridClass(fieldId: string) {
  if (fieldId === "schedule" || fieldId === "notes") return "col-span-full";
  if (fieldId === "trip-name") return "col-span-2 sm:col-span-2 lg:col-span-2";
  return "";
}

function fieldCardClass(fieldId: string) {
  if (fieldId === "schedule") {
    return "border-2 border-brand-cyan/35 bg-gradient-to-br from-white via-cyan-50/50 to-white shadow-[0_2px_10px_rgba(0,188,212,0.12)]";
  }
  if (fieldId === "notes") {
    return "border-2 border-brand-yellow/50 bg-gradient-to-br from-white via-yellow-50/40 to-white shadow-[0_2px_10px_rgba(255,193,7,0.1)]";
  }
  return "border-2 border-brand-pink/30 bg-gradient-to-br from-white via-pink-50/50 to-white shadow-[0_2px_10px_rgba(233,30,99,0.1)] hover:border-brand-pink/50";
}

function fieldLabelClass(fieldId: string) {
  if (fieldId === "schedule") return "text-brand-cyan";
  if (fieldId === "notes") return "text-amber-700";
  return "text-brand-pink";
}

function copyButtonClass(copied: boolean, fieldId: string) {
  if (copied) {
    return "border-brand-green/40 bg-brand-green/10 text-brand-green";
  }
  if (fieldId === "schedule") {
    return "border-cyan-200 bg-white text-brand-cyan hover:bg-cyan-50";
  }
  if (fieldId === "notes") {
    return "border-amber-200 bg-white text-amber-700 hover:bg-amber-50";
  }
  return "border-pink-200 bg-white text-brand-pink hover:bg-pink-50";
}

export function MokedTevaTripDataDialog({ data, onClose }: MokedTevaTripDataDialogProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const handleCopy = async (id: string, value: string) => {
    await copyText(value);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1600);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] overflow-y-auto overscroll-contain">
      <div className="flex min-h-full justify-center p-3 sm:p-6">
        <button type="button" className="fixed inset-0 bg-black/35" onClick={onClose} aria-label="סגור" />
        <div className="relative z-10 my-4 flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border-2 border-pink-200/80 bg-white shadow-[0_24px_60px_rgba(233,30,99,0.15)] sm:my-6">
          <div className="flex shrink-0 items-center justify-between gap-3 bg-gradient-to-l from-brand-pink via-pink-500 to-brand-cyan px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
                <ClipboardCopy size={18} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-white sm:text-base">נתוני הטיול לאישור מוקד טבע</h3>
                <p className="mt-0.5 text-[10px] font-bold text-white/85 sm:text-[11px]">העתקה מהירה לטופס המערכת</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-white/15 p-1.5 text-white transition hover:bg-white/25"
              aria-label="סגור"
            >
              <X size={18} />
            </button>
          </div>

          <div className="bg-gradient-to-b from-pink-50/60 to-white px-4 py-3 sm:px-5 sm:py-4">
            <p className="mb-3 rounded-xl border border-pink-100 bg-white/80 px-3 py-2 text-[11px] font-bold text-text-secondary sm:text-xs">
              לחצו «העתק» ליד כל שדה כדי להדביק בטופס אישור הטיול במערכת מוקד טבע.
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
              {data.fields.map((field) => {
                const copied = copiedId === field.id;
                return (
                  <div
                    key={field.id}
                    className={`rounded-xl p-2.5 transition-colors sm:p-3 ${fieldGridClass(field.id)} ${fieldCardClass(field.id)}`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <p className={`min-w-0 text-[10px] font-black leading-tight sm:text-[11px] ${fieldLabelClass(field.id)}`}>
                        {field.label}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleCopy(field.id, field.value)}
                        className={`inline-flex shrink-0 items-center gap-0.5 rounded-lg border px-1.5 py-0.5 text-[9px] font-black transition sm:px-2 sm:text-[10px] ${copyButtonClass(copied, field.id)}`}
                      >
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                        {copied ? "הועתק" : "העתק"}
                      </button>
                    </div>
                    <p
                      className={`mt-1.5 break-words text-[11px] font-bold leading-snug text-text-primary sm:text-xs ${
                        field.id === "schedule" ? "font-mono whitespace-pre-wrap leading-relaxed" : ""
                      }`}
                    >
                      {field.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="shrink-0 border-t border-pink-100 bg-pink-50/40 px-4 py-3 sm:px-5 sm:py-4">
            <Button
              variant="primary"
              className="w-full border-0 bg-gradient-to-l from-brand-pink to-pink-500 shadow-[0_8px_20px_rgba(233,30,99,0.25)] hover:from-pink-600 hover:to-brand-pink"
              onClick={() => void handleCopy("all", data.allText)}
            >
              {copiedId === "all" ? <Check size={14} /> : <Copy size={14} />}
              {copiedId === "all" ? "הועתק הכל" : "העתק הכל"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
