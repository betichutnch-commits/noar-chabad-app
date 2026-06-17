"use client";

import { AlertTriangle, ExternalLink, Stethoscope, Shield, Users } from "lucide-react";
import type { RowRegulationBrief } from "@/lib/regulation";

export function RowRegulationBriefBadges({ brief }: { brief?: RowRegulationBrief | null }) {
  if (!brief) return null;

  const officialLink = brief.circularLinks.find((l) => l.external);
  const medicBadge =
    brief.medicSummary &&
    brief.medicCount != null &&
    !/^\d/.test(brief.medicSummary)
      ? `${brief.medicCount} ${brief.medicSummary}`
      : brief.medicSummary;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {officialLink ? (
        <a
          href={officialLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-[#E91E63]/30 bg-pink-50 px-2 py-0.5 text-[10px] font-black text-[#E91E63] hover:bg-pink-100"
          title='קישור לחוזר מנכ"ל'
        >
          <ExternalLink size={10} />
          {'חוזר מנכ"ל'}
        </a>
      ) : null}
      {medicBadge ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-800">
          <Stethoscope size={10} />
          {medicBadge}
        </span>
      ) : null}
      {brief.adultStaffCount != null && brief.adultStaffCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
          <Users size={10} />
          {brief.adultStaffCount} צוות בוגר
        </span>
      ) : null}
      {brief.securityRequired && brief.securityCount != null ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700">
          <Shield size={10} />
          {brief.securityCount} מאבטח
        </span>
      ) : null}
      {brief.ageEligible === false ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-800">
          <Users size={10} />
          גיל: !
        </span>
      ) : null}
      {brief.sensitiveLocation ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-800">
          <AlertTriangle size={10} />
          אזור רגיש
        </span>
      ) : null}
    </div>
  );
}
