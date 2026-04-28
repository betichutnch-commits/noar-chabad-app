"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  ArrowRight,
  Trash2,
  ChevronLeft,
  FileEdit,
  User,
  Building2,
} from "lucide-react";
import { CATEGORY_STYLES } from "@/lib/constants";
import { formatHebrewDateRange } from "@/lib/dateUtils";
import { getTripStatusConfig } from "@/lib/tripStatus";
import { getDepartmentLanguage } from "@/lib/auth";
import type { TripRecord } from "@/lib/types";

export type TripCardViewerContext = "coordinator" | "manager";

export interface TripCardAlert {
  tone: "amber" | "red";
  label: string;
}

/** Trip row for the card; `details` is a loose record (e.g. from Supabase). */
export type TripCardTripModel = Omit<TripRecord, "details"> & {
  details?: Record<string, unknown> | null;
  department?: string | null;
};

export interface TripCardProps {
  trip: TripCardTripModel;
  onDeleteDraft?: (id: string) => void;
  onCancelTrip?: (id: string) => void;
  /** ברירת מחדל: רכז */
  viewerContext?: TripCardViewerContext;
  /** ניווט לדף טיפול מנהלים (חובה כש־viewerContext === 'manager') */
  manageHref?: string;
  showCoordinatorMeta?: boolean;
  showDepartmentTag?: boolean;
  alert?: TripCardAlert;
}

/** מחלקת רקע לסרט סוג הטיול (גם לנקודת צבע בטבלה קומפקטית) */
export const getTripTypeRibbonClass = (type: string) => {
  if (!type) return "bg-slate-400";
  if (type === "טיול מחוץ לסניף") return "bg-brand-cyan";
  if (type === "כנס/אירוע מחוץ לסניף") return "bg-purple-400";
  if (type === "פעילות לא שגרתית בסניף") return "bg-brand-green";
  if (type === "יציאה רגלית באזור הסניף") return "bg-amber-400";
  return "bg-slate-400";
};

// לוגיקה לתצוגת דסקטופ (ריבוע צד שמאל)
const getSmartDateDisplay = (startStr: string, endStr: string) => {
  const start = new Date(startStr);
  const end = new Date(endStr || startStr);

  const sDay = start.getDate();
  const sMonth = start.getMonth() + 1;
  const sYear = start.getFullYear();

  const eDay = end.getDate();
  const eMonth = end.getMonth() + 1;
  const eYear = end.getFullYear();

  if (start.getTime() === end.getTime()) {
    return { top: `${sDay}`, bottom: `${sMonth < 10 ? "0" + sMonth : sMonth}/${sYear}` };
  }
  if (sMonth === eMonth && sYear === eYear) {
    return { top: `${sDay}-${eDay}`, bottom: `${sMonth < 10 ? "0" + sMonth : sMonth}/${sYear}` };
  }
  return { top: `${sDay}/${sMonth}-${eDay}/${eMonth}`, bottom: `${sYear}` };
};

const getMobileDateString = (startStr: string, endStr: string) => {
  const start = new Date(startStr);
  const end = new Date(endStr || startStr);

  const sDay = start.getDate();
  const sMonth = (start.getMonth() + 1).toString().padStart(2, "0");
  const sYear = start.getFullYear();

  const eDay = end.getDate();
  const eMonth = (end.getMonth() + 1).toString().padStart(2, "0");
  const eYear = end.getFullYear();

  if (start.getTime() === end.getTime()) {
    return `${sDay}/${sMonth}/${sYear}`;
  }
  if (sMonth === eMonth && sYear === eYear) {
    return `${sDay}-${eDay}/${sMonth}/${sYear}`;
  }
  if (sYear === eYear) {
    return `${sDay}/${sMonth} - ${eDay}/${eMonth}/${sYear}`;
  }
  return `${sDay}/${sMonth}/${sYear.toString().slice(-2)} - ${eDay}/${eMonth}/${eYear.toString().slice(-2)}`;
};

const alertToneClasses = (tone: TripCardAlert["tone"]) =>
  tone === "red"
    ? "bg-red-50 text-red-800 border border-red-200"
    : "bg-amber-50 text-amber-900 border border-amber-200";

export const TripCard = ({
  trip,
  onDeleteDraft,
  onCancelTrip,
  viewerContext = "coordinator",
  manageHref,
  showCoordinatorMeta: showCoordinatorMetaProp,
  showDepartmentTag: showDepartmentTagProp,
  alert,
}: TripCardProps) => {
  const router = useRouter();
  const d = (trip.details || {}) as Record<string, unknown>;
  const timeline = (d.timeline as Array<Record<string, unknown>> | undefined) || [];
  const status = getTripStatusConfig(trip.status);
  const StatusIcon = status.icon;
  const isDraft = trip.status === "draft";
  const isPast = new Date(trip.start_date) < new Date(new Date().setHours(0, 0, 0, 0));
  const isCancelled = trip.status === "cancelled";
  const isManagerView = viewerContext === "manager";

  const showCoordinatorMeta =
    showCoordinatorMetaProp !== undefined ? showCoordinatorMetaProp : isManagerView;
  const showDepartmentTag =
    showDepartmentTagProp !== undefined ? showDepartmentTagProp : isManagerView;

  const detailTarget =
    isManagerView && manageHref
      ? manageHref
      : `/dashboard/trip/${trip.id}`;

  const endDate = typeof d.endDate === "string" ? d.endDate : trip.start_date || "";
  const smartDate = getSmartDateDisplay(trip.start_date || "", endDate);
  const mobileDateString = getMobileDateString(trip.start_date || "", endDate);
  const dateRangeHeb = formatHebrewDateRange(trip.start_date || "", endDate);

  const deptLang = getDepartmentLanguage(trip.department);
  const participantsLabel =
    deptLang === "female" ? "משתתפות" : deptLang === "male" ? "משתתפים" : "משתתפים/ות";

  const tripTypeStr = typeof d.tripType === "string" ? d.tripType : "";

  const handleCardClick = () => {
    router.push(detailTarget);
  };

  const coordinatorLine =
    showCoordinatorMeta && (trip.coordinator_name || trip.branch) ? (
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-3 -mt-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-[10px] shrink-0">
            {trip.coordinator_name?.[0] || "?"}
          </div>
          <User size={14} className="text-gray-400 shrink-0" />
          <span className="font-bold text-gray-700 truncate">
            {trip.coordinator_name || "לא צוין"}
          </span>
        </div>
        {trip.branch ? (
          <>
            <span className="text-gray-300 hidden sm:inline">·</span>
            <div className="flex items-center gap-1 min-w-0">
              <Building2 size={14} className="text-gray-400 shrink-0" />
              <span className="truncate">{trip.branch}</span>
            </div>
          </>
        ) : null}
      </div>
    ) : null;

  const departmentPill =
    showDepartmentTag && trip.department ? (
      <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold border max-w-[140px] truncate bg-white/90 text-slate-700 border-white/60 shadow-sm">
        {trip.department}
      </span>
    ) : null;

  const alertPill = alert ? (
    <span
      className={`px-2 py-0.5 rounded-lg text-[9px] font-bold max-w-[200px] truncate ${alertToneClasses(alert.tone)}`}
    >
      {alert.label}
    </span>
  ) : null;

  return (
    <div
      onClick={handleCardClick}
      className={`bg-surface-card border border-border-subtle rounded-2xl md:rounded-l-2xl md:rounded-r-none shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col md:flex-row min-h-[140px] cursor-pointer
            ${isDraft ? "border-dashed bg-gray-50/50" : ""}
            ${isPast || isCancelled ? "opacity-75 grayscale-[0.1]" : ""}
        `}
    >
      {/* === MOBILE ONLY: Header === */}
      <div className="md:hidden flex flex-col w-full">
        <div
          className={`w-full py-1.5 px-3 flex items-center justify-center text-white text-xs font-bold ${getTripTypeRibbonClass(tripTypeStr)}`}
        >
          {tripTypeStr}
        </div>
        {alert ? (
          <div className="flex justify-end px-2 py-1 bg-slate-50/80 border-b border-gray-100">
            {alertPill}
          </div>
        ) : null}
        <div className="flex justify-between items-start gap-2 p-3 bg-slate-50 border-b border-gray-100">
          <div className="flex flex-col items-end gap-1 min-w-0 flex-1">
            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 flex-wrap ${status.bg} ${status.textCol}`}>
              <StatusIcon size={12} /> {status.text}
              {departmentPill}
            </div>
          </div>
          <div className="text-left flex flex-col items-end gap-0.5 shrink-0">
            <span className="text-sm font-black text-gray-800 leading-none">{mobileDateString}</span>
            <span className="text-[10px] text-gray-400 font-bold">{dateRangeHeb}</span>
          </div>
        </div>
      </div>

      {/* === DESKTOP ONLY: Left Side Elements === */}
      <div
        className={`hidden md:flex absolute top-0 left-0 px-2 py-1.5 items-center gap-1.5 flex-wrap max-w-[min(100%,28rem)] text-xs font-bold rounded-br-xl z-20 ${status.bg} ${status.textCol}`}
      >
        <span className="inline-flex items-center gap-1.5 shrink-0">
          <StatusIcon size={14} />
          {status.text}
        </span>
        {departmentPill}
        {alertPill}
      </div>

      <div
        className={`hidden md:flex w-9 shrink-0 items-center justify-center text-white text-[11px] font-bold z-10 ${getTripTypeRibbonClass(tripTypeStr)}`}
      >
        <span className="rotate-90 whitespace-nowrap tracking-wider drop-shadow-sm">{tripTypeStr}</span>
      </div>

      <div className="hidden md:flex w-32 shrink-0 flex-col justify-center items-center text-center p-2 border-l border-dashed border-gray-200 bg-gradient-to-b from-white to-gray-50/50">
        <div className="transform transition-transform duration-300 hover:-translate-y-1 cursor-default">
          <div className="text-2xl font-black text-gray-800 leading-none dir-ltr tracking-tight">
            {smartDate.top}
          </div>
          <div className="text-sm font-bold text-gray-500 dir-ltr mt-1">{smartDate.bottom}</div>
          <div className="w-8 h-[2px] bg-gray-100 mx-auto my-2 rounded-full"></div>
          <div className="text-[10px] text-gray-400 font-bold leading-tight px-1">{dateRangeHeb}</div>
        </div>
      </div>

      {/* === גוף הכרטיס === */}
      <div className="flex-1 p-4 pb-2 md:p-4 flex flex-col justify-center min-w-0 overflow-hidden relative md:pt-10">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2 md:mb-4 mt-1 md:mt-0">
          <h3 className="text-lg md:text-xl font-black text-gray-800 truncate leading-none" title={trip.name}>
            {trip.name || "ללא שם"}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200 whitespace-nowrap">
              {typeof d.totalTravelers === "string" || typeof d.totalTravelers === "number"
                ? d.totalTravelers
                : 0}{" "}
              {participantsLabel}
            </span>
            {(typeof d.gradeFrom === "string" || typeof d.gradeTo === "string") && (
              <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200 whitespace-nowrap">
                כיתות {String(d.gradeFrom || "")}-{String(d.gradeTo || "")}
              </span>
            )}
          </div>
        </div>

        {coordinatorLine}

        {/* רכבת */}
        <div className="relative w-full">
          <div className="absolute left-0 top-0 bottom-4 w-6 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>

          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-1 md:px-0 w-full items-stretch">
            {timeline.length === 0 ? (
              <div className="text-xs text-gray-400 italic p-2 w-full">טרם הוזן לו״ז</div>
            ) : (
              timeline.map((item, i: number) => {
                const category = typeof item.category === "string" ? item.category : "other";
                const catStyle = CATEGORY_STYLES[category] || CATEGORY_STYLES.other;
                const Icon = catStyle.icon;

                let titleText =
                  typeof item.finalSubCategory === "string" ? item.finalSubCategory : catStyle.label;
                let subText = typeof item.finalLocation === "string" ? item.finalLocation : "";

                if (category === "sleeping") {
                  if (item.subCategory === "לינת מבנה" || titleText === "לינת מבנה") {
                    titleText = "לינת מבנה";
                    const placeName = typeof item.otherDetail === "string" ? item.otherDetail : "";
                    const placeCity = typeof item.finalLocation === "string" ? item.finalLocation : "";
                    if (placeName && placeCity) subText = `${placeName} - ${placeCity}`;
                    else subText = placeName || placeCity;
                  } else {
                    titleText = typeof item.subCategory === "string" ? item.subCategory : "לינה";
                    subText = typeof item.finalLocation === "string" ? item.finalLocation : "";
                  }
                }

                return (
                  <div key={i} className="flex items-center shrink-0 group relative">
                    <div
                      className={`w-24 md:w-26 shrink-0 border rounded-xl p-1.5 flex flex-col gap-1 transition-all hover:shadow-md ${catStyle.pastelBg} ${catStyle.border}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center bg-white shadow-sm ${catStyle.darkText} shrink-0`}
                        >
                          <Icon size={10} />
                        </div>
                        <span className={`text-[9px] md:text-[10px] font-black leading-tight truncate ${catStyle.darkText}`}>
                          {catStyle.label}
                        </span>
                      </div>
                      <div className="pr-0.5">
                        <div
                          className="text-[10px] md:text-[11px] font-bold text-gray-800 leading-tight truncate"
                          title={titleText}
                        >
                          {titleText || "-"}
                        </div>
                        {subText ? (
                          <div
                            className="text-[9px] text-gray-500 truncate flex items-center gap-0.5 mt-0.5"
                            title={subText}
                          >
                            <MapPin size={8} className="shrink-0" />
                            {subText}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {i < timeline.length - 1 ? (
                      <div className="shrink-0 px-0.5 text-gray-300 group-hover:text-brand-cyan transition-colors -ml-0.5 z-10 relative">
                        <ChevronLeft size={16} strokeWidth={2} />
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* === כפתורים === */}
      <div className="flex flex-row md:flex-col justify-end p-3 gap-2 w-full md:w-32 shrink-0 bg-surface-card border-t md:border-t-0 border-gray-100">
        {isManagerView ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(detailTarget);
            }}
            className="w-full py-2 bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
          >
            <ArrowRight size={14} /> לפרטים
          </button>
        ) : isDraft ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/new-trip?id=${trip.id}`);
              }}
              className="w-full py-2 bg-brand-cyan text-white rounded-lg text-xs font-bold hover:bg-cyan-600 transition-colors flex items-center justify-center gap-1 shadow-sm"
            >
              <FileEdit size={14} /> עריכה
            </button>
            {onDeleteDraft ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteDraft(trip.id);
                }}
                className="w-full py-2 bg-white border border-red-100 text-red-500 rounded-lg text-xs font-bold hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center gap-1"
              >
                <Trash2 size={14} /> מחק
              </button>
            ) : null}
          </>
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/trip/${trip.id}`);
              }}
              className="w-full py-2 bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
              <ArrowRight size={14} /> לפרטים
            </button>

            {onCancelTrip && !isPast && !isCancelled ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelTrip(trip.id);
                }}
                className="w-full py-2 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
              >
                <Trash2 size={14} /> לביטול
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};
