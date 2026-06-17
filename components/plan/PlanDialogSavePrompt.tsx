"use client";

import React from "react";
import { PLAN_ROW_FOLLOW_UP_ACTIONS, type PlanRowFollowUpActionId } from "@/lib/planRowFollowUp";

export function PlanDialogSavePrompt({
  onAction,
  onClose,
}: {
  onAction: (action: PlanRowFollowUpActionId) => void;
  onClose: () => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-2.5 text-right">
      <p className="mb-2 text-[11px] font-bold text-green-800">נשמר בהצלחה. מה להוסיף עכשיו?</p>
      <div className="mb-2 flex flex-wrap justify-end gap-1.5">
        {PLAN_ROW_FOLLOW_UP_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction(action.id)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-black ${action.accentClass}`}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
        >
          סגור
        </button>
      </div>
    </div>
  );
}
