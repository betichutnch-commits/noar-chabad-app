import type { AppendixCFormValues } from "@/components/AppendixCForm";
import { formatFullGregorianDate, formatHebrewDateRange } from "@/lib/dateUtils";

export type TripForAppendix = {
  user_id?: string | null;
  name?: string | null;
  branch?: string | null;
  department?: string | null;
  coordinator_name?: string | null;
  start_date?: string | null;
  coordinatorProfilePhone?: string | null;
  details?: {
    endDate?: string;
    gradeFrom?: string;
    gradeTo?: string;
    coordName?: string;
    coordPhone?: string;
    timeline?: Array<{ finalLocation?: string; locationValue?: string; otherDetail?: string }>;
  } | null;
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const ltrText = (value: string) => `\u202A${value}\u202C`;

const getInclusiveDays = (startDate?: string | null, endDate?: string | null) => {
  if (!startDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate || startDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const diff = Math.max(0, end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0));
  return String(Math.floor(diff / 86_400_000) + 1);
};

const getClassesLabel = (gradeFrom?: string, gradeTo?: string) => {
  if (gradeFrom && gradeTo && gradeFrom !== gradeTo) return `${gradeFrom}-${gradeTo}`;
  return gradeFrom || gradeTo || "";
};

const getGregorianDateRange = (startDate?: string | null, endDate?: string | null) => {
  if (!startDate) return "";
  const rawStart = new Date(startDate);
  const rawEnd = new Date(endDate || startDate);
  if (Number.isNaN(rawStart.getTime()) || Number.isNaN(rawEnd.getTime())) return "";
  const [start, end] = rawStart.getTime() <= rawEnd.getTime() ? [rawStart, rawEnd] : [rawEnd, rawStart];
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.getMonth() + 1;
  const endMonth = end.getMonth() + 1;
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const pad = (value: number) => String(value).padStart(2, "0");
  if (startDay === endDay && startMonth === endMonth && startYear === endYear) {
    return ltrText(`${startDay}/${pad(startMonth)}/${startYear}`);
  }
  if (startMonth === endMonth && startYear === endYear) {
    return ltrText(`${startDay}-${endDay}/${pad(startMonth)}/${startYear}`);
  }
  return ltrText(`${formatFullGregorianDate(startDate)} - ${formatFullGregorianDate(endDate || startDate)}`);
};

const getCombinedDateRange = (startDate?: string | null, endDate?: string | null) => {
  const hebrew = formatHebrewDateRange(startDate || "", endDate || startDate || "");
  const gregorian = getGregorianDateRange(startDate, endDate);
  if (hebrew && gregorian) return `${hebrew} (${gregorian})`;
  return hebrew || gregorian;
};

const getLocationLabel = (trip: TripForAppendix) => {
  const timelineLocations = (trip.details?.timeline || [])
    .map((item) => item.finalLocation || item.locationValue || item.otherDetail || "")
    .map((value) => value.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(timelineLocations));
  if (unique.length) return unique.slice(0, 3).join(", ");
  return trip.name || "";
};

export const getLanguageGender = (department?: string | null): "male" | "female" => {
  const normalized = String(department || "").replace(/״/g, '"').replace(/׳/g, "'").trim();
  return normalized.includes("בת מלך") || normalized.includes("בנות חב\"ד") || normalized.includes("בנות חב'D") ? "female" : "male";
};

export const buildAppendixCInitialValues = (trip: TripForAppendix | null): Partial<AppendixCFormValues> => {
  if (!trip) {
    return {
      signatureDate: todayIso(),
      principalName: "הגב' חיה וולס",
    };
  }

  const endDate = trip.details?.endDate || trip.start_date || "";
  return {
    approvalDate: todayIso(),
    schoolName: "",
    tripLeaderName: trip.details?.coordName || trip.coordinator_name || "",
    tripLeaderPhone: trip.coordinatorProfilePhone || trip.details?.coordPhone || "",
    classes: getClassesLabel(trip.details?.gradeFrom, trip.details?.gradeTo),
    branch: trip.branch || "",
    department: trip.department || "",
    location: getLocationLabel(trip),
    dates: getCombinedDateRange(trip.start_date, endDate),
    durationDays: getInclusiveDays(trip.start_date, endDate),
    principalName: "הגב' חיה וולס",
    signatureDate: todayIso(),
    safetyOfficerName: "",
    safetyOfficerSignature: "",
  };
};
