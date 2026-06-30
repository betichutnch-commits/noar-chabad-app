"use client";

import React from "react";
import { Upload } from "lucide-react";
import { PlanDialogSavePrompt } from "@/components/plan/PlanDialogSavePrompt";
import { PlanDesignBriefField } from "@/components/plan/PlanDesignBriefField";
import { PlanQuickDialog } from "@/components/plan/PlanQuickDialog";
import { EquipmentSourceInput } from "@/components/plan/EquipmentSourceInput";
import { Select } from "@/components/ui/Select";
import { DESIGN_STATUS_OPTIONS, type PlanDesignDraft } from "@/lib/planDesign";
import type { PlanRowFollowUpActionId, PlanRowFollowUpMeta } from "@/lib/planRowFollowUp";

type PlanDesignQuickDialogProps = {
  draft: PlanDesignDraft;
  uploading?: boolean;
  designerSuggestions: string[];
  fieldClass: string;
  savePromptOpen: boolean;
  uploadError?: string;
  onDraftChange: (patch: Partial<PlanDesignDraft>) => void;
  onUpload: () => void;
  onClose: () => void;
  onFollowUp: (action: PlanRowFollowUpActionId, meta?: PlanRowFollowUpMeta) => void;
  onAddAnotherDesign: () => void;
};

export function PlanDesignQuickDialog({
  draft,
  uploading = false,
  designerSuggestions,
  fieldClass,
  savePromptOpen,
  uploadError = "",
  onDraftChange,
  onUpload,
  onClose,
  onFollowUp,
  onAddAnotherDesign,
}: PlanDesignQuickDialogProps) {
  const briefInputId = React.useId();
  const outputInputId = React.useId();

  const handleFollowUp = (action: PlanRowFollowUpActionId) => {
    if (action === "design") {
      onAddAnotherDesign();
      return;
    }
    onClose();
    onFollowUp(action);
  };

  return (
    <PlanQuickDialog
      title="הוספת עיצוב"
      onClose={onClose}
      scrollable
      footer={
        <>
          {uploadError ? <p className="mb-2 text-xs font-bold text-red-600">{uploadError}</p> : null}
          {savePromptOpen ? (
            <PlanDialogSavePrompt onAction={handleFollowUp} onClose={onClose} />
          ) : (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={onUpload}
                disabled={uploading || !draft.document_name.trim()}
                className="rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-fuchsia-700 disabled:opacity-50"
              >
                {uploading ? "שומר..." : "הוסף לשורה"}
              </button>
            </div>
          )}
        </>
      }
    >
      <div>
        <label className="mb-1 block text-xs font-bold text-gray-700">שם המסמך</label>
        <input
          className={`mb-3 h-9 w-full px-2 ${fieldClass}`}
          placeholder="למשל כרטיס ביקור לטיול"
          value={draft.document_name}
          onChange={(e) => onDraftChange({ document_name: e.target.value })}
          autoFocus
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-gray-700">שם מעצב</label>
        <EquipmentSourceInput
          value={draft.designer_name}
          onChange={(value) => onDraftChange({ designer_name: value })}
          sourceType="רכש"
          suggestions={designerSuggestions}
          fieldClass={fieldClass}
          className="mb-3"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-700">הגדרות גודל</label>
          <input
            className={`h-9 w-full px-2 ${fieldClass}`}
            placeholder="למשל A5"
            value={draft.size_settings}
            onChange={(e) => onDraftChange({ size_settings: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-700">סטטוס</label>
          <Select
            value={draft.status}
            onChange={(status) => onDraftChange({ status })}
            options={DESIGN_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            placeholder="בחר סטטוס"
            clearable={false}
            accent="fuchsia"
            size="sm"
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs font-bold text-gray-700">הערות נוספות</label>
        <textarea
          className={`mb-3 min-h-[56px] w-full resize-y p-2 ${fieldClass}`}
          value={draft.notes}
          onChange={(e) => onDraftChange({ notes: e.target.value })}
        />
      </div>
      <div className="mb-2">
        <label className="mb-1 block text-xs font-bold text-gray-700">הנחיות להדפסה</label>
        <div className="mb-2 flex gap-1">
          {(["text", "file"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onDraftChange({ content_mode: mode })}
              className={`h-8 flex-1 rounded-lg border text-[11px] font-bold ${
                draft.content_mode === mode
                  ? "border-fuchsia-500 bg-fuchsia-500 text-white"
                  : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              {mode === "text" ? "מילוי טקסט" : "העלאת קובץ"}
            </button>
          ))}
        </div>
        {draft.content_mode === "text" ? (
          <PlanDesignBriefField
            className="mb-3"
            documentText={draft.document_text}
            designerInstructions={draft.designer_instructions}
            onDocumentTextChange={(document_text) => onDraftChange({ document_text })}
            onDesignerInstructionsChange={(designer_instructions) => onDraftChange({ designer_instructions })}
          />
        ) : (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 p-2">
            <label htmlFor={briefInputId} className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg bg-fuchsia-600 px-3 text-xs font-black text-white hover:bg-fuchsia-700">
              <Upload size={14} />
              בחר קובץ הנחיות
            </label>
            <input
              id={briefInputId}
              type="file"
              className="sr-only"
              onChange={(e) => onDraftChange({ brief_file: e.target.files?.[0] || null })}
            />
            <span className="truncate text-xs font-bold text-gray-600">{draft.brief_file?.name || "לא נבחר קובץ"}</span>
          </div>
        )}
      </div>
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-2">
        <label htmlFor={outputInputId} className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-fuchsia-200 bg-white px-3 text-xs font-black text-fuchsia-700 hover:bg-fuchsia-50">
          <Upload size={14} />
          קובץ עיצוב מוכן (אופציונלי)
        </label>
        <input
          id={outputInputId}
          type="file"
          className="sr-only"
          onChange={(e) => onDraftChange({ output_file: e.target.files?.[0] || null })}
        />
        <span className="truncate text-xs font-bold text-gray-600">{draft.output_file?.name || "לא נבחר קובץ"}</span>
      </div>
    </PlanQuickDialog>
  );
}
