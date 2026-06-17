import { formatFullGregorianDate, formatHebrewDateRange } from "@/lib/dateUtils";
import {
  allResponsibilitiesColumnsDone,
  buildAssigneeBoards,
  filterBoardsForTripLeader,
  type PlanRowForAssigneeBoard,
} from "@/lib/planAssigneeResponsibilities";
import { normalizePlanRowTasks, type PlanRowTask } from "@/lib/planRowTasks";
import type { TripDocumentDefinition } from "@/lib/tripDocumentsCatalog";

export type UploadedDocumentFile = { url: string; name: string; type: string; size: number; uploadedAt: string };

export type TripAutofillMeta = {
  name?: string | null;
  branch?: string | null;
  department?: string | null;
  coordinator_name?: string | null;
  start_date?: string | null;
  details?: Record<string, unknown> | null;
};

export type AutofillPlanRow = {
  id?: string;
  order_index?: number;
  day_index?: number | null;
  time_text?: string | null;
  location_text?: string | null;
  event_text?: string | null;
  notes?: string | null;
  safety_done?: boolean | null;
  safety?: Array<{
    risk?: string | null;
    mitigation?: string | null;
    owner?: string | null;
    risk_level_before?: number | null;
    likelihood_before?: number | null;
    risk_level_after?: number | null;
    likelihood_after?: number | null;
  }>;
  tasks?: Array<{
    phase?: string | null;
    task_text?: string | null;
    assignee_name?: string | null;
  }>;
  responsibilities_done?: boolean | null;
  owner_name?: string | null;
};

export type AutofillParticipant = {
  id: string;
  type?: "participant" | "staff" | string;
  name?: string;
  phone?: string | null;
  contactPhone?: string | null;
  parentApproval?: string | null;
  role?: string | null;
  busId?: string | null;
  raw?: Record<string, unknown> | null;
};

export type AutofillBus = {
  id: string;
  name?: string | null;
  bus_number?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  company?: string | null;
  capacity?: number | null;
  leader_name?: string | null;
  leader_phone?: string | null;
  leader_email?: string | null;
};

export type AutofillAssignmentSet = {
  id: string;
  kind: string;
  audience: "participants" | "staff" | "both";
  title: string;
  items: Array<{
    id: string;
    busId?: string | null;
    name: string;
    members: Array<{ id: string; participantId: string }>;
  }>;
};

export type AutofillParticipantsPayload = {
  participants: AutofillParticipant[];
  staff: AutofillParticipant[];
  buses: AutofillBus[];
  assignmentSets: AutofillAssignmentSet[];
};

export type DocumentAutofillField = { label: string; source: string; filled: boolean };
export type DocumentReadiness = { status: "מוכן PDF" | "לטיפול"; fields: DocumentAutofillField[]; missing: string[]; isAutoReady: boolean };
export type DocumentFieldMapping = { label: string; source: string; isMissingSource?: boolean };

export type TripDocumentAutofillContext = {
  trip: TripAutofillMeta | null;
  rows: AutofillPlanRow[];
  participantsPayload: AutofillParticipantsPayload;
  uploadedFilesByDocumentKey?: Record<string, UploadedDocumentFile[]>;
  formDataByDocumentKey?: Record<string, Record<string, unknown> | null | undefined>;
};

export type SecretaryTripCoordinatorItineraryRow = {
  date: string;
  timeRange: string;
  activity: string;
  safetyHighlights: string;
  response: string;
  notes: string;
};

export type SecretaryTripCoordinatorAutofill = {
  coordinatorName: string;
  coordinatorPhone: string;
  classLabel: string;
  branch: string;
  department: string;
  tripName: string;
  tripDates: string;
  tripDuration: string;
  travelerCount: string;
  sleepLocation: string;
  lodgingPhone: string;
  mokedApprovalNumber: string;
  transportationCompany: string;
  transportationPhone: string;
  guideCompany: string;
  guidePhone: string;
  itineraryRows: SecretaryTripCoordinatorItineraryRow[];
};

export const defaultAutofillParticipantsPayload: AutofillParticipantsPayload = {
  participants: [],
  staff: [],
  buses: [],
  assignmentSets: [],
};

export const textValue = (value: unknown) => String(value ?? "").trim();
export const hasText = (value: unknown) => Boolean(textValue(value));

export const getUploadedDocumentFiles = (formData: unknown, legacyPdfUrl?: string | null): UploadedDocumentFile[] => {
  const data = formData && typeof formData === "object" ? (formData as Record<string, unknown>) : {};
  const rawFiles = Array.isArray(data.uploadedFiles) ? data.uploadedFiles : [];
  const files = rawFiles
    .map<UploadedDocumentFile | null>((file) => {
      if (!file || typeof file !== "object") return null;
      const record = file as Record<string, unknown>;
      const url = textValue(record.url);
      if (!url) return null;
      return {
        url,
        name: textValue(record.name) || "מסמך",
        type: textValue(record.type),
        size: Number(record.size || 0),
        uploadedAt: textValue(record.uploadedAt),
      };
    })
    .filter((file): file is UploadedDocumentFile => Boolean(file));
  const legacy = textValue(legacyPdfUrl);
  if (legacy && !files.some((file) => file.url === legacy)) {
    files.unshift({ url: legacy, name: "מסמך קודם", type: "application/pdf", size: 0, uploadedAt: "" });
  }
  return files;
};

const MOKED_TEVA_DOCUMENT_KEY = "moked-teva-approval";
const UPLOADABLE_DOCUMENT_KEYS = new Set([MOKED_TEVA_DOCUMENT_KEY, "police-approvals", "business-license-insurance", "medic-security-certificates"]);
const READY_BY_DEFAULT_DOCUMENT_KEYS = new Set(["emergency-incident-report", "medical-referral", "casualties-summary", "emergency-procedure"]);

const rawParticipantText = (person: AutofillParticipant, key: string) => textValue(person.raw?.[key]);

const getClassesLabel = (gradeFrom?: unknown, gradeTo?: unknown) => {
  const from = textValue(gradeFrom);
  const to = textValue(gradeTo);
  if (from && to && from !== to) return `${from}-${to}`;
  return from || to;
};

const ltrText = (value: string) => `\u202A${value}\u202C`;

const getDateRange = (startDate?: string | null, endDate?: unknown) => {
  if (!startDate) return "";
  const rawEndDate = textValue(endDate) || startDate;
  const hebrew = formatHebrewDateRange(startDate, rawEndDate);
  const gregorianStart = formatFullGregorianDate(startDate);
  const gregorianEnd = formatFullGregorianDate(rawEndDate);
  const gregorian = gregorianStart && gregorianEnd && gregorianStart !== gregorianEnd ? `${gregorianStart} - ${gregorianEnd}` : gregorianStart;
  if (hebrew && gregorian) return `${hebrew} (${ltrText(gregorian)})`;
  return hebrew || (gregorian ? ltrText(gregorian) : "");
};

const getInclusiveDays = (startDate?: string | null, endDate?: unknown) => {
  if (!startDate) return "";
  const start = new Date(startDate);
  const end = new Date(textValue(endDate) || startDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const diff = Math.max(0, end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0));
  return String(Math.floor(diff / 86_400_000) + 1);
};

const uniqueText = (values: Array<unknown>) => Array.from(new Set(values.map(textValue).filter(Boolean))).join(", ");

const getSleepLocation = (trip: TripAutofillMeta | null, rows: AutofillPlanRow[]) => {
  const timeline = Array.isArray(trip?.details?.timeline) ? (trip?.details?.timeline as Array<Record<string, unknown>>) : [];
  const sleepLine = timeline.find((item) => textValue(item.category) === "sleeping" || textValue(item.subCategory).includes("לינ") || textValue(item.finalSubCategory).includes("לינ"));
  const fromTimeline = [sleepLine?.otherDetail, sleepLine?.finalLocation].filter(Boolean).join(" - ");
  if (fromTimeline) return fromTimeline;
  const row = rows.find((item) => textValue(item.event_text).includes("לינ") || textValue(item.notes).includes("לינ"));
  return [row?.event_text, row?.location_text].map(textValue).filter(Boolean).join(" - ");
};

const formatShortDate = (value?: unknown) => {
  const raw = textValue(value);
  if (!raw) return "";
  const [year, month, day] = raw.split("-");
  return year && month && day ? `${day}/${month}/${year}` : raw;
};

export const getDocumentDataSourceLabel = (document: TripDocumentDefinition) => {
  const sources: Record<string, string> = {
    "trip-role-definitions": "עמודת באחריות בלו״ז + פרטי אחראי הטיול",
    "staff-role-definitions": "עמודת באחריות בלו״ז",
    "schedule-safety-highlights": "לו״ז מפורט",
    "risk-management": "עמודת הבטיחות בלו״ז",
    "safety-department-review-tracking": "טבלת מסמכי תיק הטיול",
    "moked-teva-approval": "מערכת מוקד טבע / העלאת קובץ",
    "appendix-c-trip-leader-appointment": "פרטי הטיול, חתימת אחראי בטיחות וחתימת המזכ״לית",
    "secretary-and-trip-coordinator-approval": "פרטי הטיול והלו״ז",
    "police-approvals": "העלאת קבצים ידנית",
    "business-license-insurance": "העלאת קבצים ידנית",
    "medic-security-certificates": "העלאת קבצים ידנית",
    "participant-list": "פרטי חניכים וצוות",
    "trip-entry-registration": "פרטי חניכים וצוות + שיבוצים",
    "medical-sensitivities": "פרטי חניכים וצוות",
    "staff-list": "פרטי חניכים וצוות",
    "essential-contact-list": "רשימת קשר מהטיול, פרופילים ותקני צוות",
    "participant-groups": "שיבוצים וקבוצות",
    "bus-participant-assignments": "שיבוץ לאוטובוסים",
    "transport-table": "ניהול הסעות",
    "bus-pre-departure-check": "טופס בדיקה ידני",
    "bus-responsible-teacher-guidelines": "חוזר מנכ״ל / נהלי הסעות",
    "student-briefing": "חוזר מנכ״ל / נהלי הארגון",
    "student-letter-equipment": "פרטי הטיול / מילוי ידני",
    "reporting-chain": "נהלי דיווח בארגון",
    "emergency-incident-report": "טופס ידני בעת אירוע",
    "medical-referral": "טופס ידני בעת צורך רפואי",
    "casualties-summary": "טופס ידני בעת אירוע",
    "emergency-procedure": "חוזר מנכ״ל / נהלי חירום",
  };
  if (sources[document.key]) return sources[document.key];
  if (document.sourceKind === "auto") return "נתוני המערכת";
  if (document.sourceKind === "fixed") return "חוזר מנכ״ל / נהלי הארגון";
  if (document.handlingKind === "upload-or-link") return "העלאת קובץ / קישור";
  return "מילוי ידני";
};

const mapField = (label: string, source: string): DocumentFieldMapping => ({ label, source, isMissingSource: source === "חסר" });

const assigneeRowsFromContext = (context: TripDocumentAutofillContext): PlanRowForAssigneeBoard[] =>
  context.rows.map((row, index) => ({
    id: row.id || `row-${index}`,
    order_index: row.order_index ?? index,
    day_index: row.day_index,
    time_text: row.time_text,
    location_text: row.location_text,
    event_text: row.event_text,
    owner_name: row.owner_name,
    safety: row.safety,
    tasks: normalizePlanRowTasks((row.tasks || []) as Partial<PlanRowTask>[]),
  }));

export const getDocumentFieldMapping = (document: TripDocumentDefinition): DocumentFieldMapping[] => {
  switch (document.key) {
    case "trip-role-definitions":
      return [
        mapField("סימון סיימתי בכל שורות באחריות", "עמודת באחריות בלו״ז"),
        mapField("שם אחראי הטיול", "פרטי הטיול"),
        mapField("משימות ואחריות", "עמודת באחריות בלו״ז"),
        mapField("שיוך לשלב בטיול", "לו״ז מפורט"),
      ];
    case "staff-role-definitions":
      return [
        mapField("סימון סיימתי בכל שורות באחריות", "עמודת באחריות בלו״ז"),
        mapField("אחראים במשימות", "עמודת באחריות בלו״ז"),
        mapField("משימות מוגדרות", "עמודת באחריות בלו״ז"),
        mapField("שיוך לשלב בטיול", "לו״ז מפורט"),
      ];
    case "bus-responsible-teacher-guidelines":
    case "student-briefing":
    case "reporting-chain":
    case "emergency-procedure":
      return [mapField("תוכן המסמך", "חוזר מנכ״ל / נהלי הארגון")];
    case "moked-teva-approval":
    case "police-approvals":
    case "business-license-insurance":
    case "medic-security-certificates":
      return [mapField("קובץ PDF או תמונה", "העלאת קבצים למסמכי תיק הטיול")];
    case "secretary-and-trip-coordinator-approval":
      return [
        mapField("שם אחראי הטיול", "פרטי הטיול"),
        mapField("טלפון אחראי הטיול", "פרטי הטיול"),
        mapField("כיתות", "פרטי הטיול"),
        mapField("סניף", "פרטי הטיול"),
        mapField("מחלקה", "פרטי הטיול"),
        mapField("מקום / אזור הטיול", "פרטי הטיול"),
        mapField("תאריכי הטיול", "פרטי הטיול"),
        mapField("משך ימים", "פרטי הטיול"),
        mapField("מספר משתתפים", "פרטי הטיול"),
        mapField("מקום לינה", "לו״ז מפורט / פרטי הטיול"),
        mapField("טלפון מקום לינה", "חסר"),
        mapField("מספר אישור מוקד טבע", "חסר"),
        mapField("חברת הסעה", "ניהול הסעות"),
        mapField("טלפון הסעה", "ניהול הסעות"),
        mapField("חברת הדרכה", "חסר"),
        mapField("טלפון חברת הדרכה", "חסר"),
        mapField("שורות מסלול", "לו״ז מפורט"),
        mapField("דגשים בטיחותיים", "עמודת הבטיחות בלו״ז"),
        mapField("המענה הניתן", "עמודת הבטיחות בלו״ז"),
        mapField("אישור מוקד טבע", "מסמכי העלאה"),
      ];
    case "appendix-c-trip-leader-appointment":
      return [
        mapField("שם אחראי הטיול", "פרטי הטיול / טופס כתב מינוי"),
        mapField("טלפון אחראי הטיול", "פרטי הטיול / טופס כתב מינוי"),
        mapField("כיתות", "פרטי הטיול / טופס כתב מינוי"),
        mapField("סניף", "פרטי הטיול / טופס כתב מינוי"),
        mapField("מחלקה", "פרטי הטיול / טופס כתב מינוי"),
        mapField("מקום / אזור", "פרטי הטיול / טופס כתב מינוי"),
        mapField("תאריכים", "פרטי הטיול / טופס כתב מינוי"),
        mapField("משך ימים", "פרטי הטיול / טופס כתב מינוי"),
        mapField("שם מזכ״לית", "טופס כתב מינוי"),
        mapField("חתימת מזכ״לית", "טופס כתב מינוי / חתימה"),
        mapField("חתימת אחראי בטיחות", "אישור בטיחות / חתימה"),
      ];
    case "schedule-safety-highlights":
      return [
        mapField("יום", "לו״ז מפורט"),
        mapField("שעה", "לו״ז מפורט"),
        mapField("מקום", "לו״ז מפורט"),
        mapField("התרחשות", "לו״ז מפורט"),
        mapField("סיכון וצמצום סיכון", "עמודת הבטיחות בלו״ז"),
        mapField("הערות", "לו״ז מפורט"),
      ];
    case "risk-management":
      return [
        mapField("סיכון", "עמודת הבטיחות בלו״ז"),
        mapField("פעולות צמצום", "עמודת הבטיחות בלו״ז"),
        mapField("אחראי לביצוע", "עמודת הבטיחות בלו״ז"),
        mapField("סימון בטיחות הושלם", "לו״ז מפורט"),
      ];
    case "safety-department-review-tracking":
      return [
        mapField("שם מסמך", "קטלוג מסמכי תיק הטיול"),
        mapField("סטטוס", "חישוב סטטוס מסמכי תיק הטיול"),
        mapField("מקור נתונים", "מיפוי מקורות המסמכים"),
        mapField("חוסרים", "שכבת autofill למסמכים"),
      ];
    case "participant-list":
      return [
        mapField("שם פרטי ומשפחה", "פרטי חניכים וצוות"),
        mapField("תעודת זהות", "פרטי חניכים וצוות"),
        mapField("סניף", "פרטי חניכים וצוות"),
        mapField("כיתה", "פרטי חניכים וצוות"),
        mapField("שם הורים", "פרטי חניכים וצוות"),
        mapField("אישור הורים", "פרטי חניכים וצוות"),
      ];
    case "trip-entry-registration":
      return [
        mapField("שם פרטי ומשפחה", "פרטי חניכים וצוות"),
        mapField("תעודת זהות", "פרטי חניכים וצוות"),
        mapField("סניף", "פרטי חניכים וצוות"),
        mapField("כיתה", "פרטי חניכים וצוות"),
        mapField("עמודות שיבוצים", "שיבוצים"),
      ];
    case "medical-sensitivities":
      return [
        mapField("שם חניך", "פרטי חניכים וצוות"),
        mapField("בעיה רפואית / רגישות / אלרגיה", "פרטי חניכים וצוות"),
        mapField("הנחיות טיפול", "חסר"),
      ];
    case "staff-list":
      return [
        mapField("תפקיד", "פרטי חניכים וצוות"),
        mapField("שם פרטי ומשפחה", "פרטי חניכים וצוות"),
        mapField("תעודת זהות", "פרטי חניכים וצוות"),
        mapField("סניף", "פרטי חניכים וצוות"),
        mapField("כיתה", "פרטי חניכים וצוות"),
        mapField("שם הורים", "פרטי חניכים וצוות"),
        mapField("אישור הורים", "פרטי חניכים וצוות"),
        mapField("אישור משטרה מעל גיל 18", "מסמכי העלאה / אישורי משטרה"),
      ];
    case "essential-contact-list":
      return [
        mapField("תפקיד", "רשימת קשר מסונכרנת"),
        mapField("שם פרטי", "פרטי הטיול / פרופילים / צוות"),
        mapField("שם משפחה", "פרטי הטיול / פרופילים / צוות"),
        mapField("טלפון", "פרטי הטיול / פרופילים / צוות"),
        mapField("טלפון נוסף", "פרטי חניכים וצוות"),
        mapField("אימייל", "פרופילים / פרטי חניכים וצוות"),
        mapField("הערות", "מערכת / השלמות ידניות לפי אזור הטיול"),
        mapField("מוקדי חירום", "מספרי חירום קבועים"),
        mapField("קב״ט אזורי", "חסר"),
        mapField("בית רפואה באזור הטיול", "חסר"),
        mapField("מזכ״לית הארגון", "חסר"),
        mapField("אחראי בטיחות משויך לטיול", "שיוך מחלקת בטיחות"),
        mapField("מנהל המחלקה", "פרופילי מחלקה"),
        mapField("אחראית הסניפים במטה", "פרופילי מחלקה"),
        mapField("כל תקני הצוות", "מצבת צוות מאושרת / טבלת צוות"),
      ];
    case "participant-groups":
      return [
        mapField("שם קבוצה", "שיבוצים וקבוצות"),
        mapField("שם חניך", "פרטי חניכים וצוות"),
        mapField("סניף", "פרטי חניכים וצוות"),
        mapField("כיתה", "פרטי חניכים וצוות"),
        mapField("מדריך / אחראי קבוצה", "שיבוצים וקבוצות"),
      ];
    case "bus-participant-assignments":
      return [
        mapField("שם אוטובוס", "שיבוץ לאוטובוסים"),
        mapField("שם חניך", "פרטי חניכים וצוות"),
        mapField("אחראי הסעה", "ניהול הסעות"),
        mapField("טלפון אחראי הסעה", "ניהול הסעות"),
        mapField("מספר חניכים", "שיבוץ לאוטובוסים"),
        mapField("הערות", "ניהול הסעות / שיבוץ לאוטובוסים"),
      ];
    case "transport-table":
      return [
        mapField("שם אוטובוס", "ניהול הסעות"),
        mapField("מספר אוטובוס", "ניהול הסעות"),
        mapField("חברת הסעות", "ניהול הסעות"),
        mapField("שם נהג", "ניהול הסעות"),
        mapField("טלפון נהג", "ניהול הסעות"),
        mapField("קיבולת", "ניהול הסעות"),
        mapField("אחראי הסעה", "ניהול הסעות"),
        mapField("טלפון אחראי הסעה", "ניהול הסעות"),
        mapField("כתובת ושעת יציאה", "חסר"),
        mapField("אישורים שנשלחו", "חסר"),
      ];
    case "bus-pre-departure-check":
      return [
        mapField("פרטי האוטובוס", "חסר"),
        mapField("שם הנהג", "ניהול הסעות"),
        mapField("טלפון הנהג", "ניהול הסעות"),
        mapField("חברת הסעות", "ניהול הסעות"),
        mapField("אישור קצין בטיחות", "בדיקה ידנית לפני יציאה"),
        mapField("חגורות / מים / ציוד בטיחות", "בדיקה ידנית לפני יציאה"),
      ];
    case "student-letter-equipment":
      return [
        mapField("שם הטיול", "פרטי הטיול"),
        mapField("תאריכים ושעות", "פרטי הטיול / לו״ז מפורט"),
        mapField("נקודות איסוף", "חסר"),
        mapField("רשימת ציוד", "רשימת ציוד"),
        mapField("דגשים להורים", "חסר"),
      ];
    case "emergency-incident-report":
      return [
        mapField("פרטי האירוע", "מילוי בעת אירוע"),
        mapField("מיקום", "מילוי בעת אירוע"),
        mapField("מעורבים", "מילוי בעת אירוע"),
        mapField("פעולות שבוצעו", "מילוי בעת אירוע"),
        mapField("דיווחים והחלטות המשך", "מילוי בעת אירוע"),
      ];
    case "medical-referral":
      return [
        mapField("פרטי תלמיד", "פרטי חניכים וצוות / מילוי בעת אירוע"),
        mapField("נסיבות הפגיעה", "מילוי בעת אירוע"),
        mapField("טיפול ראשוני", "מילוי בעת אירוע"),
        mapField("מלווה אחראי", "מילוי בעת אירוע"),
      ];
    case "casualties-summary":
      return [
        mapField("שם נפגע", "מילוי בעת אירוע"),
        mapField("סטטוס", "מילוי בעת אירוע"),
        mapField("מיקום", "מילוי בעת אירוע"),
        mapField("טיפול / פינוי", "מילוי בעת אירוע"),
        mapField("בית חולים", "מילוי בעת אירוע"),
        mapField("קשר עם הורים", "מילוי בעת אירוע"),
      ];
    default:
      return [mapField("שדות הטופס טרם מופו", "חסר")];
  }
};

export const getSecretaryTripCoordinatorAutofill = (context: TripDocumentAutofillContext): SecretaryTripCoordinatorAutofill => {
  const trip = context.trip;
  const details = (trip?.details || {}) as Record<string, unknown>;
  const rowsWithContent = context.rows.filter((row) => hasText(row.time_text) || hasText(row.location_text) || hasText(row.event_text) || hasText(row.notes));
  const timeline = Array.isArray(details.timeline) ? (details.timeline as Array<Record<string, unknown>>) : [];
  const timelineRows = timeline.map((item) => ({
    date: formatShortDate(item.date),
    timeRange: "",
    activity: [item.finalSubCategory, item.finalLocation, item.otherDetail, item.details].map(textValue).filter(Boolean).join(" | "),
    safetyHighlights: "",
    response: "",
    notes: "",
  }));
  const planRows = rowsWithContent.map((row, index) => {
    const safety = row.safety || [];
    return {
      date: row.day_index ? `יום ${row.day_index}` : `שורה ${index + 1}`,
      timeRange: textValue(row.time_text),
      activity: [row.event_text, row.location_text].map(textValue).filter(Boolean).join(" | "),
      safetyHighlights: safety.map((item) => textValue(item.risk)).filter(Boolean).join("; "),
      response: safety.map((item) => textValue(item.mitigation)).filter(Boolean).join("; "),
      notes: textValue(row.notes),
    };
  });
  const itineraryRows = (planRows.length ? planRows : timelineRows).filter((row) => Object.values(row).some(Boolean));
  const blankRows = Array.from({ length: Math.max(0, 7 - itineraryRows.length) }, () => ({
    date: "",
    timeRange: "",
    activity: "",
    safetyHighlights: "",
    response: "",
    notes: "",
  }));
  const buses = context.participantsPayload.buses || [];
  const transportationCompany = uniqueText(buses.map((bus) => bus.company));
  const transportationPhone = uniqueText(buses.flatMap((bus) => [bus.driver_phone, bus.leader_phone]));

  return {
    coordinatorName: textValue(details.coordName) || textValue(trip?.coordinator_name),
    coordinatorPhone: textValue(details.coordPhone),
    classLabel: getClassesLabel(details.gradeFrom, details.gradeTo),
    branch: textValue(trip?.branch),
    department: textValue(trip?.department),
    tripName: textValue(trip?.name),
    tripDates: getDateRange(trip?.start_date, details.endDate),
    tripDuration: getInclusiveDays(trip?.start_date, details.endDate),
    travelerCount: textValue(details.chanichimCount) || textValue(details.totalTravelers),
    sleepLocation: getSleepLocation(trip, context.rows),
    lodgingPhone: textValue(details.lodgingPhone),
    mokedApprovalNumber: textValue(details.mokedApprovalNumber),
    transportationCompany,
    transportationPhone,
    guideCompany: textValue(details.guideCompany),
    guidePhone: textValue(details.guidePhone),
    itineraryRows: [...itineraryRows, ...blankRows].slice(0, Math.max(7, itineraryRows.length)),
  };
};

export const getDocumentReadiness = (document: TripDocumentDefinition, context: TripDocumentAutofillContext, formData?: Record<string, unknown> | null): DocumentReadiness => {
  const trip = context.trip;
  const details = (trip?.details || {}) as Record<string, unknown>;
  const participants = context.participantsPayload.participants || [];
  const staff = context.participantsPayload.staff || [];
  const realStaff = staff.filter((person) => !Boolean(person.raw?.requiredStaffPlaceholder));
  const hasMissingRequiredStaff = staff.some((person) => Boolean(person.raw?.requiredStaffPlaceholder));
  const buses = context.participantsPayload.buses || [];
  const assignmentSets = context.participantsPayload.assignmentSets || [];
  const uploadedFiles = context.uploadedFilesByDocumentKey?.[document.key] || [];
  const rowsWithContent = context.rows.filter((row) => hasText(row.time_text) || hasText(row.location_text) || hasText(row.event_text) || hasText(row.notes));
  const safetyEntries = context.rows.flatMap((row) => row.safety || []);
  const form = formData || context.formDataByDocumentKey?.[document.key] || {};
  const field = (label: string, source: string, filled: boolean): DocumentAutofillField => ({ label, source, filled });
  const allParticipants = [...participants, ...staff];
  const participantIdentity = (person: AutofillParticipant) => rawParticipantText(person, "identity") || textValue(person.id);
  const participantGrade = (person: AutofillParticipant) => rawParticipantText(person, "grade");
  const participantBranch = (person: AutofillParticipant) => rawParticipantText(person, "branch") || textValue(person.role);
  const participantParents = (person: AutofillParticipant) => [rawParticipantText(person, "fatherName"), rawParticipantText(person, "motherName")].filter(Boolean).join(" / ");
  const hasAssignmentMembers = (kind?: string) => assignmentSets.some((set) => (!kind || set.kind === kind) && set.items.some((item) => item.members.length > 0));
  const hasBusAssignment = hasAssignmentMembers("buses") || participants.some((person) => hasText(person.busId));
  const hasMokedApproval = document.key === MOKED_TEVA_DOCUMENT_KEY ? uploadedFiles.length > 0 : (context.uploadedFilesByDocumentKey?.[MOKED_TEVA_DOCUMENT_KEY] || []).length > 0;

  let fields: DocumentAutofillField[] = [];
  let forcedReady = false;

  if (READY_BY_DEFAULT_DOCUMENT_KEYS.has(document.key)) {
    forcedReady = true;
  } else if (UPLOADABLE_DOCUMENT_KEYS.has(document.key)) {
    fields = [field("קובץ PDF או תמונה", "העלאת קבצים", uploadedFiles.length > 0)];
  } else {
    switch (document.key) {
      case "secretary-and-trip-coordinator-approval": {
        const values = getSecretaryTripCoordinatorAutofill(context);
        fields = [
          field("שם אחראי הטיול", "פרטי הטיול", hasText(values.coordinatorName)),
          field("טלפון אחראי הטיול", "פרטי הטיול", hasText(values.coordinatorPhone)),
          field("כיתות", "פרטי הטיול", hasText(values.classLabel)),
          field("סניף", "פרטי הטיול", hasText(values.branch)),
          field("מחלקה", "פרטי הטיול", hasText(values.department)),
          field("מקום / אזור הטיול", "פרטי הטיול", hasText(values.tripName)),
          field("תאריכי הטיול", "פרטי הטיול", hasText(values.tripDates)),
          field("מספר משתתפים", "פרטי הטיול", hasText(values.travelerCount)),
          field("מקום לינה", "לו״ז מפורט / פרטי הטיול", hasText(values.sleepLocation)),
          field("חברת הסעה", "ניהול הסעות", hasText(values.transportationCompany)),
          field("טלפון הסעה", "ניהול הסעות", hasText(values.transportationPhone)),
          field("שורות מסלול", "לו״ז מפורט", values.itineraryRows.some((row) => hasText(row.activity))),
          field("אישור מוקד טבע", "מסמכי העלאה", hasMokedApproval),
        ];
        break;
      }
      case "appendix-c-trip-leader-appointment":
        fields = [
          field("שם אחראי הטיול", "פרטי הטיול / טופס כתב מינוי", hasText(form.tripLeaderName) || hasText(details.coordName) || hasText(trip?.coordinator_name)),
          field("טלפון אחראי הטיול", "פרטי הטיול / טופס כתב מינוי", hasText(form.tripLeaderPhone) || hasText(details.coordPhone)),
          field("כיתות", "פרטי הטיול / טופס כתב מינוי", hasText(form.classes) || hasText(details.gradeFrom) || hasText(details.gradeTo)),
          field("סניף", "פרטי הטיול / טופס כתב מינוי", hasText(form.branch) || hasText(trip?.branch)),
          field("מחלקה", "פרטי הטיול / טופס כתב מינוי", hasText(form.department) || hasText(trip?.department)),
          field("מקום / אזור", "פרטי הטיול / טופס כתב מינוי", hasText(form.location) || hasText(trip?.name)),
          field("תאריכים", "פרטי הטיול / טופס כתב מינוי", hasText(form.dates) || hasText(trip?.start_date)),
          field("משך ימים", "פרטי הטיול / טופס כתב מינוי", hasText(form.durationDays) || hasText(details.endDate || trip?.start_date)),
          field("שם מזכ״לית", "טופס כתב מינוי", hasText(form.principalName)),
          field("חתימת מזכ״לית", "טופס כתב מינוי / חתימה", hasText(form.principalSignature)),
          field("חתימת אחראי בטיחות", "אישור בטיחות / חתימה", hasText(form.safetyOfficerSignature)),
        ];
        break;
      case "schedule-safety-highlights":
        fields = [
          field("שורות לו״ז", "לו״ז מפורט", rowsWithContent.length > 0),
          field("שעה בכל שורה", "לו״ז מפורט", rowsWithContent.length > 0 && rowsWithContent.every((row) => hasText(row.time_text))),
          field("מקום בכל שורה", "לו״ז מפורט", rowsWithContent.length > 0 && rowsWithContent.every((row) => hasText(row.location_text))),
          field("התרחשות בכל שורה", "לו״ז מפורט", rowsWithContent.length > 0 && rowsWithContent.every((row) => hasText(row.event_text))),
          field("דגשי בטיחות", "עמודת הבטיחות בלו״ז", rowsWithContent.length > 0 && rowsWithContent.every((row) => Boolean(row.safety_done))),
        ];
        break;
      case "risk-management":
        fields = [
          field("סיכונים", "עמודת הבטיחות בלו״ז", safetyEntries.length > 0 && safetyEntries.every((item) => hasText(item.risk))),
          field("פעולות צמצום", "עמודת הבטיחות בלו״ז", safetyEntries.length > 0 && safetyEntries.every((item) => hasText(item.mitigation))),
          field("אחראים לביצוע", "עמודת הבטיחות בלו״ז", safetyEntries.length > 0 && safetyEntries.every((item) => hasText(item.owner))),
          field("סימון בטיחות הושלם", "לו״ז מפורט", context.rows.length > 0 && context.rows.every((row) => Boolean(row.safety_done))),
        ];
        break;
      case "safety-department-review-tracking":
        fields = [field("רשימת מסמכים", "קטלוג מסמכי תיק הטיול", true)];
        break;
      case "participant-list":
        fields = [
          field("רשימת חניכים", "פרטי חניכים וצוות", participants.length > 0),
          field("תעודות זהות", "פרטי חניכים וצוות", participants.length > 0 && participants.every((person) => hasText(participantIdentity(person)))),
          field("סניף וכיתה", "פרטי חניכים וצוות", participants.length > 0 && participants.every((person) => hasText(participantBranch(person)) && hasText(participantGrade(person)))),
          field("שמות הורים", "פרטי חניכים וצוות", participants.length > 0 && participants.every((person) => hasText(participantParents(person)))),
          field("אישורי הורים", "פרטי חניכים וצוות", participants.length > 0 && participants.every((person) => hasText(person.parentApproval) || hasText(rawParticipantText(person, "parentApproval")))),
        ];
        break;
      case "trip-entry-registration":
        fields = [
          field("חניכים וצוות", "פרטי חניכים וצוות", allParticipants.length > 0),
          field("תעודות זהות", "פרטי חניכים וצוות", allParticipants.length > 0 && allParticipants.every((person) => hasText(participantIdentity(person)))),
          field("שיבוצים", "שיבוצים", assignmentSets.length > 0 && assignmentSets.some((set) => set.items.some((item) => item.members.length > 0))),
        ];
        break;
      case "staff-list":
        fields = [
          field("רשימת צוות", "פרטי חניכים וצוות", realStaff.length > 0),
          field("תקני חובה מאוישים", "מצבת צוות מאושרת", !hasMissingRequiredStaff),
          field("תפקידים", "פרטי חניכים וצוות", realStaff.length > 0 && realStaff.every((person) => hasText(rawParticipantText(person, "staffRole")) || hasText(person.role))),
          field("תעודות זהות", "פרטי חניכים וצוות", realStaff.length > 0 && realStaff.every((person) => hasText(participantIdentity(person)))),
        ];
        break;
      case "essential-contact-list":
        fields = [
          field("מוקדי חירום", "מספרי חירום קבועים", true),
          field("אחראי הטיול", "פרטי הטיול", hasText(details.coordName) || hasText(trip?.coordinator_name)),
          field("טלפון אחראי הטיול", "פרטי הטיול", hasText(details.coordPhone)),
          field("תקני צוות", "מצבת צוות מאושרת / טבלת צוות", staff.length > 0),
          field("תקני חובה מאוישים", "מצבת צוות מאושרת", !hasMissingRequiredStaff),
          field("טלפוני צוות", "טבלת צוות", realStaff.length > 0 && realStaff.every((person) => hasText(person.phone) || hasText(rawParticipantText(person, "phone")))),
        ];
        break;
      case "participant-groups":
        fields = [
          field("רשימת חניכים", "פרטי חניכים וצוות", participants.length > 0),
          field("שיבוץ לקבוצות", "שיבוצים וקבוצות", hasAssignmentMembers("groups")),
        ];
        break;
      case "bus-participant-assignments":
        fields = [
          field("רשימת חניכים", "פרטי חניכים וצוות", participants.length > 0),
          field("שיבוץ לאוטובוסים", "שיבוץ לאוטובוסים", hasBusAssignment),
          field("אחראי הסעה", "ניהול הסעות", buses.length > 0 && buses.every((bus) => hasText(bus.leader_name) && hasText(bus.leader_phone))),
        ];
        break;
      case "transport-table":
        fields = [
          field("אוטובוסים", "ניהול הסעות", buses.length > 0),
          field("חברת הסעות", "ניהול הסעות", buses.length > 0 && buses.every((bus) => hasText(bus.company))),
          field("נהג וטלפון", "ניהול הסעות", buses.length > 0 && buses.every((bus) => hasText(bus.driver_name) && hasText(bus.driver_phone))),
          field("קיבולת", "ניהול הסעות", buses.length > 0 && buses.every((bus) => Number(bus.capacity || 0) > 0)),
          field("אחראי הסעה", "ניהול הסעות", buses.length > 0 && buses.every((bus) => hasText(bus.leader_name) && hasText(bus.leader_phone))),
        ];
        break;
      case "medical-sensitivities":
        fields = [
          field("רשימת חניכים", "פרטי חניכים וצוות", participants.length > 0),
          field("נתוני רגישויות רפואיות", "פרטי חניכים וצוות", participants.some((person) => hasText(rawParticipantText(person, "medicalNotes")))),
        ];
        break;
      case "trip-role-definitions": {
        const coordinator = textValue(details.coordName) || textValue(trip?.coordinator_name);
        const boards = filterBoardsForTripLeader(buildAssigneeBoards(assigneeRowsFromContext(context)), coordinator);
        const responsibilitiesDone = allResponsibilitiesColumnsDone(context.rows);
        fields = [
          field("סימון סיימתי בכל שורות באחריות", "עמודת באחריות בלו״ז", responsibilitiesDone),
          field("שם אחראי הטיול", "פרטי הטיול", hasText(coordinator)),
          field("משימות ואחריות", "עמודת באחריות בלו״ז", boards.some((board) => board.totalCount > 0)),
          field(
            "שיוך לשלב בטיול",
            "לו״ז מפורט",
            boards.some((board) =>
              Object.values(board.phases).some((items) => items.some((item) => hasText(item.stageLabel))),
            ),
          ),
        ];
        break;
      }
      case "staff-role-definitions": {
        const boards = buildAssigneeBoards(assigneeRowsFromContext(context));
        const responsibilitiesDone = allResponsibilitiesColumnsDone(context.rows);
        fields = [
          field("סימון סיימתי בכל שורות באחריות", "עמודת באחריות בלו״ז", responsibilitiesDone),
          field("אחראים במשימות", "עמודת באחריות בלו״ז", boards.length > 0),
          field("משימות מוגדרות", "עמודת באחריות בלו״ז", boards.some((board) => board.totalCount > 0)),
          field(
            "שיוך לשלב בטיול",
            "לו״ז מפורט",
            boards.some((board) =>
              Object.values(board.phases).some((items) => items.some((item) => hasText(item.stageLabel))),
            ),
          ),
        ];
        break;
      }
      default:
        if (!document.editUrl && document.handlingKind !== "upload-or-link") {
          fields = [field("טופס במערכת", getDocumentDataSourceLabel(document), false)];
        } else {
          fields = [field("מיפוי שדות חובה", getDocumentDataSourceLabel(document), false)];
        }
    }
  }

  const missing = fields.filter((item) => !item.filled).map((item) => item.label);
  let isAutoReady = forcedReady || (fields.length > 0 && missing.length === 0);

  if (document.key === "trip-role-definitions" || document.key === "staff-role-definitions") {
    const responsibilitiesDone = allResponsibilitiesColumnsDone(context.rows);
    isAutoReady = responsibilitiesDone;
    return {
      status: isAutoReady ? "מוכן PDF" : "לטיפול",
      fields,
      missing: responsibilitiesDone ? [] : ["סימון סיימתי בכל שורות באחריות"],
      isAutoReady,
    };
  }

  return {
    status: isAutoReady ? "מוכן PDF" : "לטיפול",
    fields,
    missing,
    isAutoReady,
  };
};
