"use client";

import { PlanQuickDialog } from "@/components/plan/PlanQuickDialog";

const MOKED_TEVA_URL = "https://www.mokedteva.co.il";

export function SensitiveLocationDialog({
  matchedLabel,
  onConfirm,
  onClose,
}: {
  matchedLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <PlanQuickDialog title="אזור רגיש — נדרש תיאום" onClose={onClose}>
      <div className="space-y-4 text-sm text-gray-700">
        <p>
          המיקום שהוזן{matchedLabel ? ` (${matchedLabel})` : ""} מזוהה כ<strong className="text-orange-900">אזור רגיש</strong> לפי חוזר
          מנכ״ל 585 (איו״ש, ירושלים מזרחית, אזור ביטחוני, גנ״י וכו׳).
        </p>
        <p className="rounded-xl border border-orange-100 bg-orange-50/80 p-3 text-xs font-bold text-orange-900">
          יש לתאם עם מוקד טבע לפחות 14 ימים לפני הפעילות, ולוודא אישור טיול במערכת מוקד טבע.
        </p>
        <a
          href={MOKED_TEVA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs font-black text-brand-cyan hover:underline"
        >
          אתר מוקד טבע
        </a>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-brand-cyan px-4 py-2 text-xs font-black text-white hover:opacity-90"
          >
            הבנתי — סמן בשורה
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
          >
            סגור
          </button>
        </div>
      </div>
    </PlanQuickDialog>
  );
}
