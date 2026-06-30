"use client";

import React from "react";
import { Upload } from "lucide-react";
import { PlanDialogSavePrompt } from "@/components/plan/PlanDialogSavePrompt";
import { PlanQuickDialog } from "@/components/plan/PlanQuickDialog";
import { Select } from "@/components/ui/Select";
import type { PlanRowFollowUpActionId, PlanRowFollowUpMeta } from "@/lib/planRowFollowUp";

export type PlanPrintDraft = {
  file: File | null;
  quantity: string;
  print_size: string;
  page_type: string;
  print_location: string;
  design_id: string;
};

type RowDesignOption = {
  id: string;
  document_name: string;
  size_settings?: string | null;
};

type PlanPrintQuickDialogProps = {
  draft: PlanPrintDraft;
  rowDesigns?: RowDesignOption[];
  uploading?: boolean;
  printLocationSuggestions: string[];
  fieldClass: string;
  savePromptOpen: boolean;
  uploadError?: string;
  onDraftChange: (patch: Partial<PlanPrintDraft>) => void;
  onUpload: () => void;
  onClose: () => void;
  onFollowUp: (action: PlanRowFollowUpActionId, meta?: PlanRowFollowUpMeta) => void;
  onAddAnotherPrint: () => void;
};

export function PlanPrintQuickDialog({
  draft,
  rowDesigns = [],
  uploading = false,
  printLocationSuggestions,
  fieldClass,
  savePromptOpen,
  uploadError = "",
  onDraftChange,
  onUpload,
  onClose,
  onFollowUp,
  onAddAnotherPrint,
}: PlanPrintQuickDialogProps) {
  const [locationOpen, setLocationOpen] = React.useState(false);
  const inputId = React.useId();

  const handleFollowUp = (action: PlanRowFollowUpActionId) => {
    if (action === "print") {
      onAddAnotherPrint();
      return;
    }
    onClose();
    onFollowUp(action);
  };

  return (
    <PlanQuickDialog title="הוספת הדפסה" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-700">כמות</label>
          <input
            className={`h-9 w-full px-2 ${fieldClass}`}
            placeholder="כמות"
            inputMode="numeric"
            value={draft.quantity}
            onChange={(e) => onDraftChange({ quantity: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-700">גודל הדפסה</label>
          <input
            className={`h-9 w-full px-2 ${fieldClass}`}
            placeholder="גודל"
            value={draft.print_size}
            onChange={(e) => onDraftChange({ print_size: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-700">סוג דף</label>
          <input
            className={`h-9 w-full px-2 ${fieldClass}`}
            placeholder="סוג דף"
            value={draft.page_type}
            onChange={(e) => onDraftChange({ page_type: e.target.value })}
          />
        </div>
        <div className="relative">
          <label className="mb-1 block text-xs font-bold text-gray-700">מקום הדפסה</label>
          <input
            className={`h-9 w-full px-2 ${fieldClass}`}
            placeholder="מקום הדפסה"
            value={draft.print_location}
            onFocus={() => setLocationOpen(true)}
            onChange={(e) => {
              setLocationOpen(true);
              onDraftChange({ print_location: e.target.value });
            }}
            onBlur={() => {
              window.setTimeout(() => setLocationOpen(false), 120);
            }}
          />
          {locationOpen && printLocationSuggestions.length > 0 ? (
            <div className="absolute right-0 top-full z-50 mt-1 max-h-40 w-full overflow-auto rounded-xl border border-cyan-200 bg-white p-1 shadow-lg">
              {printLocationSuggestions.map((value) => (
                <button
                  key={value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onDraftChange({ print_location: value });
                    setLocationOpen(false);
                  }}
                  className="block h-8 w-full rounded-lg px-2 text-center text-xs font-bold text-gray-700 hover:bg-cyan-50"
                >
                  {value}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {rowDesigns.length > 0 ? (
        <div className="mt-3">
          <label className="mb-1 block text-xs font-bold text-gray-700">קישור לעיצוב (אופציונלי)</label>
          <Select
            value={draft.design_id}
            onChange={(designId) => {
              const linkedDesign = rowDesigns.find((design) => design.id === designId);
              onDraftChange({
                design_id: designId,
                print_size: linkedDesign?.size_settings?.trim() || draft.print_size,
              });
            }}
            options={rowDesigns.map((design) => ({
              value: design.id,
              label: design.document_name,
            }))}
            placeholder="ללא קישור"
            accent="cyan"
            size="sm"
          />
        </div>
      ) : null}
      {uploadError ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] font-bold text-red-700">{uploadError}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          id={inputId}
          type="file"
          className="sr-only"
          onChange={(e) => onDraftChange({ file: e.target.files?.[0] || null })}
        />
        <label
          htmlFor={inputId}
          className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 text-xs font-bold text-brand-cyan hover:bg-cyan-100"
        >
          <Upload size={14} />
          בחר קובץ
        </label>
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-gray-600">{draft.file?.name || "לא נבחר קובץ"}</span>
      </div>
      {savePromptOpen ? (
        <PlanDialogSavePrompt onClose={onClose} onAction={handleFollowUp} />
      ) : (
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold hover:bg-gray-50">
            ביטול
          </button>
          <button
            type="button"
            onClick={onUpload}
            disabled={!draft.file || uploading}
            className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {uploading ? "מעלה..." : "העלה לעמודת הדפסות"}
          </button>
        </div>
      )}
    </PlanQuickDialog>
  );
}
