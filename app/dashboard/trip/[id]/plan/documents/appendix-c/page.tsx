"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppendixCForm, { type AppendixCFormValues } from "@/components/AppendixCForm";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { formatFullGregorianDate, formatHebrewDateRange } from "@/lib/dateUtils";

type TripForAppendix = {
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

type DocumentOverrideResponse = {
  document_key?: string;
  status?: string | null;
  form_data?: Partial<AppendixCFormValues> | null;
};

const APPENDIX_C_DOCUMENT_KEY = "appendix-c-trip-leader-appointment";
const todayIso = () => new Date().toISOString().slice(0, 10);
const ltrText = (value: string) => `\u202A${value}\u202C`;
const isClosedDocumentStatus = (status?: string | null) => status === "מוכן PDF" || status === "נבדק";

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

const getLanguageGender = (department?: string | null): "male" | "female" => {
  const normalized = String(department || "").replace(/״/g, '"').replace(/׳/g, "'").trim();
  return normalized.includes("בת מלך") || normalized.includes("בנות חב\"ד") || normalized.includes("בנות חב'D") ? "female" : "male";
};

const canUserSignAsSafetyOps = (role?: string | null, department?: string | null) =>
  String(role || "").toLowerCase() === "safety_admin" ||
  String(role || "").toLowerCase() === "admin" ||
  String(department || "").includes("בטיחות ומפעלים");

const canUserSignAsSecretary = (role?: string | null) =>
  String(role || "").toLowerCase() === "secretary";

const buildInitialValues = (trip: TripForAppendix | null): Partial<AppendixCFormValues> => {
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
  };
};

export default function AppendixCPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = params.id;
  const printMode = searchParams.get("print") === "1";
  const editMode = searchParams.get("edit") === "1";
  const [trip, setTrip] = useState<TripForAppendix | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [canSignSignature, setCanSignSignature] = useState(false);
  const [canSignSafetySignature, setCanSignSafetySignature] = useState(false);
  const [savedValues, setSavedValues] = useState<Partial<AppendixCFormValues> | null>(null);
  const [liveValues, setLiveValues] = useState<Partial<AppendixCFormValues> | null>(null);
  const [documentStatus, setDocumentStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const autoSaveTimerRef = useRef<number | null>(null);
  const storageKey = `appendix-c-form:${tripId}`;

  const saveDocumentOverride = useCallback(
    async (values: Partial<AppendixCFormValues>, status: string) => {
      const response = await fetch(`/api/trips/${tripId}/plan/documents`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateDocument",
          documentKey: APPENDIX_C_DOCUMENT_KEY,
          status,
          formData: values,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || "שמירת המסמך נכשלה"));
    },
    [tripId],
  );

  useEffect(() => {
    const loadTrip = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("trips")
        .select("user_id, name, branch, department, coordinator_name, start_date, details")
        .eq("id", tripId)
        .single();
      let tripData = (data as TripForAppendix | null) || null;
      if (tripData?.user_id) {
        const { data: profile } = await supabase.from("profiles").select("phone").eq("id", tripData.user_id).single();
        tripData = { ...tripData, coordinatorProfilePhone: String(profile?.phone || "") };
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: currentProfile } = await supabase.from("profiles").select("role, department").eq("id", user.id).single();
        const userRole = String(currentProfile?.role || "");
        const userDept = String(currentProfile?.department || "");
        setCanSignSignature(canUserSignAsSecretary(userRole));
        setCanSignSafetySignature(canUserSignAsSafetyOps(userRole, userDept));
      } else {
        setCanSignSignature(false);
        setCanSignSafetySignature(false);
      }
      setTrip(tripData);
      const rawSaved = window.localStorage.getItem(storageKey);
      let localSaved: Partial<AppendixCFormValues> | null = null;
      if (rawSaved) {
        try {
          localSaved = JSON.parse(rawSaved) as Partial<AppendixCFormValues>;
        } catch {
          localSaved = null;
        }
      }
      const documentsResponse = await fetch(`/api/trips/${tripId}/plan/documents`, { credentials: "include" });
      const documentsPayload = await documentsResponse.json().catch(() => ({}));
      const appendixOverride = (documentsPayload?.documents || []).find(
        (document: DocumentOverrideResponse) => document.document_key === APPENDIX_C_DOCUMENT_KEY,
      ) as DocumentOverrideResponse | undefined;
      setSavedValues(appendixOverride?.form_data || localSaved);
      setDocumentStatus(appendixOverride?.status || null);
      setLoading(false);
    };
    void loadTrip();
  }, [storageKey, tripId]);

  const initialValues = useMemo(() => ({ ...buildInitialValues(trip), ...(savedValues || {}) }), [savedValues, trip]);
  const languageGender = useMemo(() => getLanguageGender(trip?.department), [trip?.department]);
  const currentValues = liveValues || initialValues;
  const closedView = !printMode && !editMode && isClosedDocumentStatus(documentStatus);
  const isReadOnlyDocument = printMode || closedView;
  const isDocumentComplete = [
    currentValues.tripLeaderName,
    currentValues.tripLeaderPhone,
    currentValues.classes,
    currentValues.branch,
    currentValues.department,
    currentValues.location,
    currentValues.dates,
    currentValues.durationDays,
    currentValues.principalName,
    currentValues.principalSignature,
    currentValues.signatureDate,
    currentValues.safetyOfficerSignature,
  ].every((value) => String(value || "").trim());

  const handleValuesChange = (values: AppendixCFormValues) => {
    setLiveValues(values);
    setDocumentStatus("בטיפול");
    window.localStorage.setItem(storageKey, JSON.stringify(values));
    setSaveError("");
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      void saveDocumentOverride(values, "בטיפול").catch((error) => {
        setSaveError(error instanceof Error ? error.message : "שמירת המסמך נכשלה");
      });
    }, 600);
  };

  useEffect(() => {
    if (!printMode || loading) return;
    const timer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timer);
  }, [loading, printMode]);

  const closeDocumentAsPdf = async () => {
    setClosing(true);
    setSaveError("");
    try {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
      const values = currentValues;
      await saveDocumentOverride(values, "מוכן PDF");
      setDocumentStatus("מוכן PDF");
      window.localStorage.setItem(storageKey, JSON.stringify(values));
      router.push(`/dashboard/trip/${tripId}/plan?quickAction=documents`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "סגירת המסמך נכשלה");
    } finally {
      setClosing(false);
    }
  };

  return (
    <>
      {loading ? <div className="fixed right-4 top-4 z-50 rounded-2xl bg-white px-4 py-2 text-xs font-black text-text-secondary shadow-md print:hidden">טוען נתוני טיול...</div> : null}
      <AppendixCForm
        key={`${loading ? "loading" : "loaded"}-${isReadOnlyDocument ? "readonly" : "edit"}`}
        isEditable={!isReadOnlyDocument}
        initialValues={initialValues}
        languageGender={languageGender}
        canSignSignature={!isReadOnlyDocument && canSignSignature}
        canSignSafetySignature={!isReadOnlyDocument && canSignSafetySignature}
        onValuesChange={handleValuesChange}
        actions={
          printMode ? (
            <Button variant="outline" onClick={() => router.replace(`/dashboard/trip/${tripId}/plan/documents/appendix-c?edit=1`)} className="px-4">
              <ArrowRight size={16} />
              חזרה למצב עריכה
            </Button>
          ) : (
            <>
              {closedView ? (
                <span className="inline-flex h-10 items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 text-xs font-black text-emerald-700 shadow-sm">
                  <CheckCircle2 size={16} />
                  המסמך סגור ומוכן PDF
                </span>
              ) : null}
              <Button variant="outline" onClick={() => router.push(`/dashboard/trip/${tripId}/plan?quickAction=documents`)} className="px-4">
                <ArrowRight size={16} />
                חזרה
              </Button>
            </>
          )
        }
      />
      {!printMode && saveError ? (
        <div className="mx-auto mt-3 max-w-[210mm] rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center text-xs font-black text-red-700 print:hidden">
          {saveError}
        </div>
      ) : null}
      {closedView ? (
        <div className="mx-auto mt-5 flex max-w-[210mm] justify-center print:hidden">
          <Button variant="primary" onClick={() => router.replace(`/dashboard/trip/${tripId}/plan/documents/appendix-c?edit=1`)} className="px-8">
            עריכה
          </Button>
        </div>
      ) : !printMode && isDocumentComplete ? (
        <div className="mx-auto mt-5 flex max-w-[210mm] justify-center print:hidden">
          <Button variant="primary" onClick={closeDocumentAsPdf} disabled={closing} className="px-8">
            <CheckCircle2 size={16} />
            {closing ? "שומר וסוגר..." : "סגירת המסמך (PDF)"}
          </Button>
        </div>
      ) : !printMode ? (
        <div className="mx-auto mt-2 max-w-[210mm] text-center text-xs font-bold text-text-muted print:hidden">הכפתור ייפתח אחרי שכל שדות המסמך ימולאו.</div>
      ) : null}
    </>
  );
}
