"use client";

import { AlertTriangle, ExternalLink, Shield, Stethoscope, Users } from "lucide-react";
import { PlanQuickDialog } from "@/components/plan/PlanQuickDialog";
import type { RowRegulationBrief } from "@/lib/regulation";

export function RowRegulationBriefDialog({
  brief,
  onConfirm,
  onClose,
  onNavigateLink,
}: {
  brief: RowRegulationBrief;
  onConfirm: () => void;
  onClose: () => void;
  onNavigateLink?: (href: string, external: boolean) => void;
}) {
  const officialLink = brief.circularLinks.find((l) => l.external);

  const handleOfficialLink = () => {
    if (!officialLink) return;
    if (onNavigateLink) {
      onNavigateLink(officialLink.href, true);
      return;
    }
    window.open(officialLink.href, "_blank", "noopener,noreferrer");
  };

  return (
    <PlanQuickDialog title={brief.activityLabel} onClose={onClose}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto text-sm text-gray-700">
        {officialLink ? (
          <button
            type="button"
            onClick={handleOfficialLink}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-[#E91E63]/40 bg-pink-50 px-3 py-2.5 text-xs font-black text-[#E91E63] shadow-sm transition-colors hover:bg-pink-100"
          >
            <ExternalLink size={14} />
            {officialLink.label}
          </button>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-violet-900">
              <Stethoscope size={14} />
              ליווי רפואי
            </p>
            {brief.medicRequired && brief.medicSummary ? (
              <p className="text-sm font-black text-violet-900">{brief.medicSummary}</p>
            ) : brief.needsFirstAidKit ? (
              <p className="text-sm font-black text-violet-900">ערכת עזרה ראשונה</p>
            ) : (
              <p className="text-xs text-gray-600">לא זוהתה דרישה רפואית ספציפית לפעילות זו.</p>
            )}
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-emerald-900">
              <Users size={14} />
              מלווים בוגרים
            </p>
            {brief.adultStaffRequired && brief.adultStaffSummary ? (
              <p className="text-sm text-emerald-900">
                <span className="font-black">{brief.adultStaffSummary}</span>
                {brief.adultStaffRatioLabel ? (
                  <span className="text-xs font-normal text-emerald-800/90">
                    {" "}
                    ({brief.adultStaffRatioLabel})
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="text-xs text-gray-600">לשורה זו לא חושב יחס מלווה בוגר (מחושב ברמת הטיול).</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:col-span-2">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-800">
              <Shield size={14} />
              אבטחה
            </p>
            {brief.securityRequired ? (
              <p className="text-xs leading-relaxed text-slate-700">
                {brief.securityCount != null ? `${brief.securityCount} מאבטחים` : "לפי חוזר 585 והנחיות מוקד טבע"}
                {brief.securityNotes ? ` — ${brief.securityNotes}` : ""}
              </p>
            ) : (
              <p className="text-xs text-gray-600">לא זוהתה דרישת מאבטח לשורה זו.</p>
            )}
          </div>
        </div>

        {brief.ageEligible === false && brief.ageMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-relaxed text-red-800">
            <AlertTriangle size={14} className="mb-1 inline shrink-0" />
            {brief.ageMessage}
          </div>
        ) : null}

        {(brief.needsLicense || brief.sensitiveLocation) ? (
          <div className="space-y-2 rounded-xl border border-orange-200 bg-orange-50/80 p-3 text-xs text-orange-900">
            {brief.needsLicense ? (
              <p className="font-bold">נדרש רישוי עסק + ביטוח — יש להעלות מסמכים לשורה לפני שליחת הבקשה.</p>
            ) : null}
            {brief.sensitiveLocation ? (
              <p className="flex items-center gap-1 font-bold">
                <AlertTriangle size={12} /> אזור רגיש
              </p>
            ) : null}
          </div>
        ) : null}

        {brief.needsMokedTeva ? (
          <p className="rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-xs font-bold leading-relaxed text-sky-900">
            נדרש אישור מוקד טבע — התיאום יבוצע על ידי מחלקת הבטיחות והמפעלים.
          </p>
        ) : null}

        <button
          type="button"
          onClick={onConfirm}
          className="w-full rounded-xl bg-brand-green py-3 text-sm font-black text-white shadow-lg shadow-green-100 transition-all hover:bg-[#7CB342]"
        >
          הבנתי — הוסף ללו״ז
        </button>
      </div>
    </PlanQuickDialog>
  );
}
