"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Backpack, ClipboardList, Plus, Printer, UserRound } from "lucide-react";
import type { PlanRowFollowUpActionId, PlanRowFollowUpMeta } from "@/lib/planRowFollowUp";
import { PlanDialogSavePrompt } from "@/components/plan/PlanDialogSavePrompt";
import { PlanQuickDialog } from "@/components/plan/PlanQuickDialog";
import {
  INSTRUCTION_AUDIENCE_LABELS,
  type InstructionAudience,
} from "@/lib/planRowGuidelines";
import { QuantityUnitPicker } from "@/components/plan/QuantityUnitPicker";
import { EquipmentSourceInput } from "@/components/plan/EquipmentSourceInput";
import { formatRowDetailsSummaryLine, type RowDetailsSummaryCounts } from "@/lib/planRowDetailsSummary";

export type EquipmentDraft = {
  item: string;
  quantity: string;
  quantity_unit: string;
  source_type: string;
  source_details: string;
};

const DETAILS_PLACEHOLDER =
  "כתוב כאן את פירוט ההתרחשות, והשתמש במקש ימני לעדכן במערכת: חלוקת אחריות, ציוד, רכש, הדפסות והנחיות.";

const emptyEquipmentDraft = (sourceType = ""): EquipmentDraft => ({
  item: "",
  quantity: "",
  quantity_unit: "",
  source_type: sourceType,
  source_details: "",
});

type OccurrenceDetailsCellProps = {
  occurrenceDetails: string;
  staffInstructions: string;
  participantInstructions: string;
  fieldClass: string;
  disabled?: boolean;
  schemaMissing?: boolean;
  instructionsSchemaMissing?: boolean;
  summaryCounts: RowDetailsSummaryCounts;
  onOccurrenceDetailsChange: (value: string) => void;
  onOccurrenceDetailsBlur: () => void;
  onSaveInstructions: (audience: InstructionAudience, text: string) => void;
  onAddEquipment: (item: EquipmentDraft) => void;
  onOpenResponsibilities: () => void;
  onFollowUpAction: (action: PlanRowFollowUpActionId, meta?: PlanRowFollowUpMeta) => void;
  followUpRequest?: PlanRowFollowUpActionId | null;
  onFollowUpConsumed?: () => void;
  /** תווית התרחשות בלו״ז (event_text) — לתגיות קיימות ורגולציה */
  eventText?: string | null;
  instructionAudienceLabels?: Record<InstructionAudience, string>;
  staffParticipantGuidelinesLabel?: string;
  participantInstructionsButtonLabel?: string;
  equipmentSourceSuggestions?: { purchase: string[]; existing: string[]; all: string[] };
};

type ContextMenuState = { x: number; y: number } | null;

export function OccurrenceDetailsCell({
  occurrenceDetails,
  staffInstructions,
  participantInstructions,
  fieldClass,
  disabled = false,
  schemaMissing = false,
  instructionsSchemaMissing = false,
  summaryCounts,
  onOccurrenceDetailsChange,
  onOccurrenceDetailsBlur,
  onSaveInstructions,
  onAddEquipment,
  onOpenResponsibilities,
  onFollowUpAction,
  followUpRequest = null,
  onFollowUpConsumed,
  eventText = null,
  instructionAudienceLabels = INSTRUCTION_AUDIENCE_LABELS,
  staffParticipantGuidelinesLabel = "הנחיות לצוות / חניכים",
  participantInstructionsButtonLabel = "הנחיות לחניכים",
  equipmentSourceSuggestions = { purchase: [], existing: [], all: [] },
}: OccurrenceDetailsCellProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [equipmentDraft, setEquipmentDraft] = useState<EquipmentDraft>(emptyEquipmentDraft());
  const [instructionAudience, setInstructionAudience] = useState<InstructionAudience>("staff");
  const [instructionText, setInstructionText] = useState("");
  const [equipmentSavePrompt, setEquipmentSavePrompt] = useState(false);
  const [guidelinesSavePrompt, setGuidelinesSavePrompt] = useState(false);

  const summaryLine = formatRowDetailsSummaryLine(summaryCounts);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      closeContextMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeContextMenu();
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [contextMenu, closeContextMenu]);

  const openEquipmentDialog = (presetSource: "" | "רכש") => {
    setEquipmentDraft(emptyEquipmentDraft(presetSource));
    setEquipmentSavePrompt(false);
    setEquipmentOpen(true);
    closeContextMenu();
  };

  const openGuidelinesDialog = (audience?: InstructionAudience) => {
    const nextAudience = audience || "staff";
    setInstructionAudience(nextAudience);
    setInstructionText(nextAudience === "staff" ? staffInstructions : participantInstructions);
    setGuidelinesSavePrompt(false);
    setGuidelinesOpen(true);
    closeContextMenu();
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    if (disabled) return;
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  const saveEquipment = () => {
    const item = equipmentDraft.item.trim();
    if (!item) return;
    onAddEquipment({
      item,
      quantity: equipmentDraft.quantity.trim(),
      quantity_unit: equipmentDraft.quantity_unit.trim(),
      source_type: equipmentDraft.source_type,
      source_details: equipmentDraft.source_details.trim(),
    });
    setEquipmentSavePrompt(true);
  };

  const saveGuidelines = () => {
    onSaveInstructions(instructionAudience, instructionText.trim());
    setGuidelinesSavePrompt(true);
  };

  const closeEquipmentDialog = () => {
    setEquipmentOpen(false);
    setEquipmentSavePrompt(false);
  };

  const closeGuidelinesDialog = () => {
    setGuidelinesOpen(false);
    setGuidelinesSavePrompt(false);
  };

  const addAnotherEquipment = () => {
    const preset = equipmentDraft.source_type === "רכש" ? "רכש" : "";
    setEquipmentDraft(emptyEquipmentDraft(preset));
    setEquipmentSavePrompt(false);
  };

  const addAnotherGuidelines = () => {
    const otherAudience: InstructionAudience = instructionAudience === "staff" ? "participants" : "staff";
    const otherText = otherAudience === "staff" ? staffInstructions : participantInstructions;
    if (!String(otherText || "").trim()) {
      setInstructionAudience(otherAudience);
      setInstructionText("");
    }
    setGuidelinesSavePrompt(false);
  };

  const handleEquipmentFollowUp = (action: PlanRowFollowUpActionId) => {
    if (equipmentDraft.source_type === "רכש" && action === "purchase") {
      addAnotherEquipment();
      return;
    }
    if (equipmentDraft.source_type !== "רכש" && action === "equipment") {
      addAnotherEquipment();
      return;
    }
    if (action === "equipment") {
      setEquipmentDraft(emptyEquipmentDraft(""));
      setEquipmentSavePrompt(false);
      return;
    }
    if (action === "purchase") {
      setEquipmentDraft(emptyEquipmentDraft("רכש"));
      setEquipmentSavePrompt(false);
      return;
    }
    closeEquipmentDialog();
    onFollowUpAction(action);
  };

  const handleGuidelinesFollowUp = (action: PlanRowFollowUpActionId) => {
    if (action === "guidelines") {
      addAnotherGuidelines();
      return;
    }
    closeGuidelinesDialog();
    onFollowUpAction(action);
  };

  useEffect(() => {
    if (!followUpRequest) return;
    const timer = window.setTimeout(() => {
      if (followUpRequest === "purchase") openEquipmentDialog("רכש");
      else if (followUpRequest === "equipment") openEquipmentDialog("");
      else if (followUpRequest === "guidelines") openGuidelinesDialog();
      onFollowUpConsumed?.();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open on external follow-up signal only
  }, [followUpRequest, onFollowUpConsumed]);

  const hasStaffInstructions = Boolean(staffInstructions.trim());
  const hasParticipantInstructions = Boolean(participantInstructions.trim());

  return (
    <>
      <div className="relative w-full" onContextMenu={handleContextMenu}>
        {schemaMissing ? (
          <p className="mb-1 text-[10px] font-bold text-amber-700">
            יש להריץ מיגרציה `20260513_add_occurrence_details.sql` כדי לשמור פירוט.
          </p>
        ) : null}
        {instructionsSchemaMissing ? (
          <p className="mb-1 text-[10px] font-bold text-amber-700">
            יש להריץ מיגרציה `20260514_add_row_instructions.sql` כדי לשמור הנחיות.
          </p>
        ) : null}
        <textarea
          value={occurrenceDetails}
          onChange={(e) => onOccurrenceDetailsChange(e.target.value)}
          onBlur={onOccurrenceDetailsBlur}
          disabled={disabled}
          placeholder={DETAILS_PLACEHOLDER}
          className="w-full min-h-[100px] resize-y rounded-lg border border-gray-200 bg-white px-2 pt-1 pb-2 text-right text-sm font-normal leading-snug text-gray-800 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {summaryLine ? (
          <p className="mt-1 text-[10px] font-bold text-gray-500" aria-live="polite">
            {summaryLine}
          </p>
        ) : null}
        {(hasStaffInstructions || hasParticipantInstructions) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {hasStaffInstructions ? (
              <button
                type="button"
                onClick={() => openGuidelinesDialog("staff")}
                className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800 hover:bg-sky-100"
              >
                הנחיות לצוות
              </button>
            ) : null}
            {hasParticipantInstructions ? (
              <button
                type="button"
                onClick={() => openGuidelinesDialog("participants")}
                className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800 hover:bg-indigo-100"
              >
                {participantInstructionsButtonLabel}
              </button>
            ) : null}
          </div>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
            setContextMenu({ x: rect.left, y: rect.bottom + 4 });
          }}
          className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          aria-label="תפריט עדכון"
          data-tooltip="מקש ימני: אחריות, ציוד, רכש, עיצוב והדפסה, הנחיות"
        >
          <Plus size={12} />
        </button>
      </div>

      {contextMenu && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[250] min-w-[210px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-right text-xs font-bold text-gray-800 hover:bg-violet-50"
                onClick={() => {
                  onOpenResponsibilities();
                  closeContextMenu();
                }}
              >
                <UserRound size={14} className="text-violet-600" />
                חלוקת אחריות
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-right text-xs font-bold text-gray-800 hover:bg-emerald-50"
                onClick={() => openEquipmentDialog("")}
              >
                <Backpack size={14} className="text-emerald-600" />
                הוסף ציוד
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-right text-xs font-bold text-gray-800 hover:bg-amber-50"
                onClick={() => openEquipmentDialog("רכש")}
              >
                <Backpack size={14} className="text-amber-600" />
                הוסף רכש
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-right text-xs font-bold text-gray-800 hover:bg-cyan-50"
                onClick={() => {
                  closeContextMenu();
                  onFollowUpAction("print");
                }}
              >
                <Printer size={14} className="text-cyan-600" />
                הוסף הדפסה
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-right text-xs font-bold text-gray-800 hover:bg-sky-50"
                onClick={() => openGuidelinesDialog()}
              >
                <ClipboardList size={14} className="text-sky-600" />
                {staffParticipantGuidelinesLabel}
              </button>
            </div>,
            document.body,
          )
        : null}

      {equipmentOpen ? (
        <PlanQuickDialog
          title={equipmentDraft.source_type === "רכש" ? "הוספת פריט רכש" : "הוספת פריט ציוד"}
          onClose={closeEquipmentDialog}
        >
          <label className="mb-1 block text-xs font-bold text-gray-700">פריט</label>
          <input
            value={equipmentDraft.item}
            onChange={(e) => setEquipmentDraft((prev) => ({ ...prev, item: e.target.value }))}
            className={`mb-2 w-full h-9 px-2 ${fieldClass}`}
            autoFocus
          />
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">כמות</label>
              <input
                value={equipmentDraft.quantity}
                onChange={(e) => setEquipmentDraft((prev) => ({ ...prev, quantity: e.target.value }))}
                className={`w-full h-9 px-2 ${fieldClass}`}
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">יחידה</label>
              <QuantityUnitPicker
                value={equipmentDraft.quantity_unit}
                onChange={(quantity_unit) => setEquipmentDraft((prev) => ({ ...prev, quantity_unit }))}
                fieldClass={fieldClass}
                placeholder="בחר יחידה"
              />
            </div>
          </div>
          <label className="mb-1 block text-xs font-bold text-gray-700">סוג</label>
          <div className="mb-2 flex gap-1">
            {["קיים", "רכש"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setEquipmentDraft((prev) => ({ ...prev, source_type: opt }))}
                className={`h-8 flex-1 rounded-lg border text-[11px] font-bold ${
                  equipmentDraft.source_type === opt
                    ? opt === "רכש"
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-emerald-500 bg-emerald-500 text-white"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <label className="mb-1 block text-xs font-bold text-gray-700">מקור / ספק</label>
          <EquipmentSourceInput
            value={equipmentDraft.source_details}
            onChange={(value) => setEquipmentDraft((prev) => ({ ...prev, source_details: value }))}
            sourceType={equipmentDraft.source_type}
            suggestions={
              equipmentDraft.source_type === "רכש"
                ? equipmentSourceSuggestions.purchase
                : equipmentDraft.source_type === "קיים" || equipmentDraft.source_type === "מקור"
                  ? equipmentSourceSuggestions.existing
                  : equipmentSourceSuggestions.all
            }
            fieldClass={fieldClass}
            className="mb-3"
          />
          {equipmentSavePrompt ? (
            <PlanDialogSavePrompt onAction={handleEquipmentFollowUp} onClose={closeEquipmentDialog} />
          ) : (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEquipmentDialog}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={saveEquipment}
                disabled={!equipmentDraft.item.trim()}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                הוסף לשורה
              </button>
            </div>
          )}
        </PlanQuickDialog>
      ) : null}

      {guidelinesOpen ? (
        <PlanQuickDialog title={staffParticipantGuidelinesLabel} onClose={closeGuidelinesDialog}>
          <div className="mb-3 flex gap-1">
            {(["staff", "participants"] as InstructionAudience[]).map((audience) => (
              <button
                key={audience}
                type="button"
                onClick={() => {
                  setInstructionAudience(audience);
                  setInstructionText(audience === "staff" ? staffInstructions : participantInstructions);
                }}
                className={`h-8 flex-1 rounded-lg border text-[11px] font-bold ${
                  instructionAudience === audience
                    ? audience === "staff"
                      ? "border-sky-500 bg-sky-500 text-white"
                      : "border-indigo-500 bg-indigo-500 text-white"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                {instructionAudienceLabels[audience]}
              </button>
            ))}
          </div>
          <label className="mb-2 block text-xs font-bold text-gray-700">
            הנחיות ל{instructionAudienceLabels[instructionAudience]}
          </label>
          <textarea
            value={instructionText}
            onChange={(e) => setInstructionText(e.target.value)}
            className={`mb-3 w-full min-h-[120px] resize-y p-2 ${fieldClass}`}
            placeholder={`כתוב הנחיות ל${instructionAudienceLabels[instructionAudience]}...`}
            autoFocus
          />
          {guidelinesSavePrompt ? (
            <PlanDialogSavePrompt onAction={handleGuidelinesFollowUp} onClose={closeGuidelinesDialog} />
          ) : (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeGuidelinesDialog}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={saveGuidelines}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700"
              >
                שמור הנחיות
              </button>
            </div>
          )}
        </PlanQuickDialog>
      ) : null}
    </>
  );
}
