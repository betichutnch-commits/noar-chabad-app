"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  Plus,
  Save,
  ArrowRight,
  X,
  Upload,
  Trash2,
  ShieldAlert,
  Backpack,
  Printer,
  StickyNote,
  CalendarDays,
  Clock3,
  GripVertical,
  Check,
  ChevronDown,
  RefreshCw,
  Info,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ShoppingCart,
  CreditCard,
  Phone,
  Settings,
  ClipboardList,
  ListChecks,
  ScrollText,
  Building2,
  UsersRound,
  UserRound,
  Bus,
  Route,
  Maximize2,
  Minimize2,
  Download,
  Eye,
  ExternalLink,
} from "lucide-react";
import { EmergencyProcedureContent } from "@/components/EmergencyMedicalDocuments";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tooltip } from "@/components/ui/Tooltip";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabaseClient";
import { isManagerUser } from "@/lib/auth";
import { formatHebrewDate } from "@/lib/dateUtils";
import {
  defaultAutofillParticipantsPayload,
  getDocumentDataSourceLabel,
  getDocumentReadiness,
  getUploadedDocumentFiles,
  type AutofillParticipantsPayload,
  type TripAutofillMeta,
  type UploadedDocumentFile,
} from "@/lib/tripDocumentAutofill";
import type { TripDocumentDefinition } from "@/lib/tripDocumentsCatalog";
import type { RequiredStaffContext, RequiredStaffPlanRow } from "@/lib/tripRequiredRoles";
import { computeRowDetailsSummaryCounts } from "@/lib/planRowDetailsSummary";
import { normalizePlanRowTasks, type PlanRowTask } from "@/lib/planRowTasks";
import { AssigneeResponsibilitiesBoard } from "@/components/plan/AssigneeResponsibilitiesBoard";
import { OccurrenceDetailsCell } from "@/components/plan/OccurrenceDetailsCell";
import { TripRegulationCompliancePanel } from "@/components/plan/TripRegulationCompliancePanel";
import { circular585, detectSensitiveLocation } from "@/lib/regulation";
import { SensitiveLocationDialog } from "@/components/plan/SensitiveLocationDialog";
import { RowResponsibilitiesCell } from "@/components/plan/RowResponsibilitiesCell";
import { buildAssigneeBoards } from "@/lib/planAssigneeResponsibilities";
import { RiskMitigationDisplay } from "@/components/plan/RiskMitigationDisplay";
import { PlanPrintQuickDialog } from "@/components/plan/PlanPrintQuickDialog";
import { authFetch } from "@/lib/authFetch";
import { PLAN_TRIP_PAGE_TITLE } from "@/lib/planTripLabels";
import { PlanTableTour } from "@/components/plan/PlanTableTour";
import { PlanTableTourPicker } from "@/components/plan/PlanTableTourPicker";
import {
  getInitialPeopleSectionForTourSection,
  getInitialTabForTourSection,
  getTourStepsForSection,
  type PlanTableTourNavigate,
  type PlanTableTourPeopleSection,
  type PlanTableTourSection,
  type PlanTableTourStep,
} from "@/lib/planTableTour";
import type { PlanRowFollowUpActionId, PlanRowFollowUpMeta } from "@/lib/planRowFollowUp";
import { syncRowOwnerFields } from "@/lib/planRowOwnerSync";
import {
  buildPlanningRoleOptions,
  buildStaffRoster,
  resolveStaffAssigneeFromFields,
  type StaffRosterEntry,
  type StaffAssigneeValue,
} from "@/lib/staffRoster";
import { StaffAssigneePicker } from "@/components/plan/StaffAssigneePicker";
import { ParticipantsTab } from "./ParticipantsTab";

type PlanPrint = {
  id: string;
  row_id: string;
  file_name?: string | null;
  file_size_bytes?: number | null;
  quantity?: number | null;
  print_size?: string | null;
  page_type?: string | null;
  print_location?: string | null;
  notes?: string | null;
  status?: string | null;
};
type PlanRow = {
  id: string;
  order_index: number;
  day_index?: number | null;
  time_text?: string | null;
  location_text?: string | null;
  location_sensitive?: boolean | null;
  event_text?: string | null;
  occurrence_details?: string | null;
  staff_instructions?: string | null;
  participant_instructions?: string | null;
  notes?: string | null;
  owner_name?: string | null;
  owner_participant_id?: string | null;
  owner_role_key?: string | null;
  tasks?: PlanRowTask[];
  safety_done?: boolean | null;
  equipment_done?: boolean | null;
  prints_done?: boolean | null;
  notes_done?: boolean | null;
  details_done?: boolean | null;
  responsibilities_done?: boolean | null;
  safety: Array<{
    id?: string;
    risk?: string | null;
    mitigation?: string | null;
    owner?: string | null;
    owner_participant_id?: string | null;
    owner_role_key?: string | null;
    risk_level_before?: number | null;
    likelihood_before?: number | null;
    risk_level_after?: number | null;
    likelihood_after?: number | null;
  }>;
  equipment: Array<{
    id?: string;
    item?: string | null;
    quantity?: string | null;
    quantity_unit?: string | null;
    source_type?: string | null;
    source_details?: string | null;
  }>;
  prints: PlanPrint[];
};

type PlanSection = "safety" | "equipment" | "prints" | "notes" | "details" | "responsibilities";
type PlanSectionWithDone = PlanSection;
type ExpandedColsState = {
  safety: boolean;
  equipment: boolean;
  prints: boolean;
  notes: boolean;
  details: boolean;
  responsibilities: boolean;
};
const emptyExpandedCols = (): ExpandedColsState => ({
  safety: false,
  equipment: false,
  prints: false,
  notes: false,
  details: false,
  responsibilities: false,
});
type PlanTab = "schedule" | "participants" | "transport";
type QuickActionId = "documents" | "emergency" | "equipment" | "purchases" | "risks" | "refunds" | "contacts" | "roles" | "guidelines" | "prints";
type QuickActionSurfaceId = QuickActionId | "suppliers" | "printShops";
type PurchaseOverride = { id?: string; equipment_id: string; status?: string | null; owner?: string | null; unit_price?: number | string | null };
type SupplierRecord = { id?: string; name: string; phone?: string | null; email?: string | null; address?: string | null };
type PrintShopRecord = { id?: string; name: string; phone?: string | null; email?: string | null; address?: string | null };
type TripContactRow = { role: string; firstName: string; lastName: string; phone: string; extraPhone: string; email: string; notes: string };
type TripInvoiceRecord = {
  id: string;
  equipment_id?: string | null;
  amount?: number | string | null;
  supplier_name?: string | null;
  invoice_number?: string | null;
  notes?: string | null;
  file_url: string;
  file_name: string;
  file_type?: string | null;
  file_size?: number | null;
  submission_status?: string | null;
  created_at?: string | null;
};
type TripDocumentOverride = {
  id?: string;
  document_key: string;
  status?: string | null;
  owner?: string | null;
  note?: string | null;
  edit_url?: string | null;
  pdf_url?: string | null;
  form_data?: Record<string, unknown> | null;
};
type StyledStatusOption = { value: string; label: string };

const bytesLabel = (v?: number | null) => {
  if (!v) return "";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${Math.round(v / 1024)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
};

const plannerTabs: Array<{ id: PlanTab; label: string; Icon: typeof Route }> = [
  { id: "schedule", label: "לו״ז מפורט", Icon: Route },
  { id: "participants", label: "פרטי חניכים וצוות", Icon: UsersRound },
  { id: "transport", label: "ניהול הסעות", Icon: Bus },
];

const quickActionButtons: Array<{ id: QuickActionId; label: string; Icon: typeof FileText }> = [
  { id: "documents", label: "מסמכי תיק הטיול", Icon: FileText },
  { id: "emergency", label: "הנחיות חירום", Icon: AlertTriangle },
  { id: "equipment", label: "רשימת ציוד", Icon: ListChecks },
  { id: "purchases", label: "רשימת רכש", Icon: ShoppingCart },
  { id: "risks", label: "ניהול סיכונים", Icon: ShieldAlert },
  { id: "refunds", label: "החזר כספים", Icon: ClipboardList },
  { id: "contacts", label: "רשימת קשר", Icon: Phone },
  { id: "roles", label: "הגדרות תפקיד", Icon: Settings },
  { id: "guidelines", label: "הנחיות וחוזרי מנכ״ל", Icon: ScrollText },
  { id: "prints", label: "הדפסות", Icon: Printer },
];

const documentStatusOptions: StyledStatusOption[] = [
  { value: "לטיפול דחוף", label: "לטיפול דחוף" },
  { value: "לטיפול", label: "לטיפול" },
  { value: "בעבודה", label: "בעבודה" },
  { value: "מוכן PDF", label: "מוכן" },
  { value: "לא נדרש", label: "לא נדרש" },
];

const equipmentStatusOptions: StyledStatusOption[] = [
  { value: "", label: "בחר סטטוס" },
  { value: "לביצוע", label: "לביצוע" },
  { value: "בטיפול", label: "בטיפול" },
  { value: "הוכן", label: "הוכן" },
  { value: "נאסף", label: "נאסף" },
  { value: "חסר", label: "חסר" },
  { value: "בוטל", label: "בוטל" },
];

const printStatusOptions: StyledStatusOption[] = [
  { value: "", label: "בחר סטטוס" },
  { value: "לביצוע", label: "לביצוע" },
  { value: "בטיפול", label: "בטיפול" },
  { value: "נשלח לבית דפוס", label: "נשלח לבית דפוס" },
  { value: "הודפס", label: "הודפס" },
  { value: "נאסף", label: "נאסף" },
  { value: "בוטל", label: "בוטל" },
];

const purchaseStatusOptions: StyledStatusOption[] = [
  { value: "", label: "בחר סטטוס" },
  { value: "לביצוע", label: "לביצוע" },
  { value: "בטיפול", label: "בטיפול" },
  { value: "הוזמן", label: "הוזמן" },
  { value: "סופק", label: "סופק" },
  { value: "בוטל", label: "בוטל" },
];

const invoiceSubmissionStatusOptions: StyledStatusOption[] = [
  { value: "draft", label: "טיוטה" },
  { value: "ready", label: "מוכן לשליחה" },
  { value: "sent", label: "נשלח למזכירות" },
];

const documentCatalog: TripDocumentDefinition[] = [
  {
    key: "trip-role-definitions",
    category: "פרטי הטיול והיערכות",
    title: "הגדרות תפקיד אחראי טיול",
    description: "ריכוז אחריות אחראי הטיול לפי משימות הלו״ז: בהיערכות, בשעת מעשה ואחר מעשה, עם שיוך לשלב בטיול.",
    sourceKind: "auto",
    handlingKind: "auto-generated",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/trip-role-definitions`,
  },
  {
    key: "staff-role-definitions",
    category: "פרטי הטיול והיערכות",
    title: "הגדרות תפקיד צוות הטיול",
    description: "ריכוז אחריות לכל אחראי שהוגדר במשימות הלו״ז, לפי שלבי ההיערכות, ביצוע וסיום.",
    sourceKind: "auto",
    handlingKind: "auto-generated",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/staff-role-definitions`,
  },
  {
    key: "schedule-safety-highlights",
    category: "פרטי הטיול והיערכות",
    title: "לו״ז ודגשי בטיחות",
    description: "מסלול הטיול המפורט, כל שלבי היום, דגשי הבטיחות והחלופות הנדרשות לפי תנאי המסלול ומזג האוויר.",
    sourceKind: "auto",
    handlingKind: "auto-generated",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/schedule-safety`,
  },
  {
    key: "risk-management",
    category: "פרטי הטיול והיערכות",
    title: "ניהול סיכונים",
    description: "טבלת ניהול סיכונים לפי נספח ט״ז: גורמי סיכון, תרחישים אפשריים, פעולות מניעה ואחראים לביצוע.",
    sourceKind: "auto",
    handlingKind: "auto-generated",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/risk-management`,
  },
  {
    key: "safety-department-review-tracking",
    category: "פרטי הטיול והיערכות",
    title: "טבלת מעקב לביקורת מחלקת הבטיחות",
    description: "טבלת שליטה לבדיקת השלמת מסמכי תיק הטיול, הערות הביקורת ואישור מחלקת הבטיחות.",
    sourceKind: "auto",
    handlingKind: "auto-generated",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/safety-review-tracking`,
  },
  {
    key: "moked-teva-approval",
    category: "אישורי הטיול",
    title: "אישור מוקד טבע / לשכה לתיאום טיולים",
    description: "אישור שמונפק במערכת מוקד טבע/הלשכה לתיאום טיולים ומועלה לכאן כקובץ PDF או תמונה.",
    sourceKind: "manual",
    handlingKind: "upload-or-link",
  },
  {
    key: "appendix-c-trip-leader-appointment",
    category: "אישורי הטיול",
    title: "כתב מינוי לאחראי הטיול",
    description: "נספח ג׳ - כתב מינוי רשמי לאחראי הטיול מטעם מזכ\"לית הארגון.",
    sourceKind: "manual",
    handlingKind: "internal-form",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/appendix-c`,
  },
  {
    key: "secretary-and-trip-coordinator-approval",
    category: "אישורי הטיול",
    title: "אישור מזכ\"לית ורכז טיולים",
    description: "מסמך חתימה המאשר שהמזכ״לית ורכז הטיולים עברו על תוכנית הטיול, ההיערכות וההנחיות והטיול מאושר לביצוע.",
    sourceKind: "manual",
    handlingKind: "internal-form",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/secretary-trip-coordinator-approval`,
  },
  {
    key: "police-approvals",
    category: "אישורי הטיול",
    title: "אישורי משטרה / היעדר עבירות מין",
    description: "אישורי משטרה והיעדר מניעה להעסקה למדריכים, נהגים, חובשים, מאבטחים ונותני שירות רלוונטיים.",
    sourceKind: "manual",
    handlingKind: "upload-or-link",
  },
  {
    key: "business-license-insurance",
    category: "אישורי הטיול",
    title: "רישיונות וביטוחים של המקום",
    description: "רישיון עסק, ביטוח בתוקף ואישורי משרד הבריאות/בטיחות לכל אתר, מפעיל, אטרקציה, לינה או קייטרינג.",
    sourceKind: "manual",
    handlingKind: "upload-or-link",
  },
  {
    key: "medic-security-certificates",
    category: "אישורי הטיול",
    title: "תעודות ואישור חובש ומאבטח",
    description: "תעודות הכשרה ואישורים בתוקף למלווים רפואיים, חובשים, מאבטחים ונושאי נשק לפי דרישות חוזר מנכ״ל ואישור הטיול.",
    sourceKind: "manual",
    handlingKind: "upload-or-link",
  },
  {
    key: "participant-list",
    category: "חניכים וצוות",
    title: "רשימת חניכים + אישורי הורים",
    description: "רשימת כל החניכים המשתתפים בטיול, פרטי התקשרות, אישורי הורים, הצהרת בריאות ואישורים מיוחדים כמו רחצה או פעילות מים.",
    sourceKind: "auto",
    handlingKind: "auto-generated",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/participant-list`,
  },
  {
    key: "trip-entry-registration",
    category: "חניכים וצוות",
    title: "רישום לכניסה חניכים + צוות",
    description: "רשימת כניסה ונוכחות ביום הטיול לצורך בקרה, ספירה והשוואה לרשימות המאושרות.",
    sourceKind: "auto",
    handlingKind: "auto-generated",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/trip-entry-registration`,
  },
  {
    key: "medical-sensitivities",
    category: "חניכים וצוות",
    title: "רשימת חניכים עם בעיה רפואית/רגישות/אלרגיה",
    description: "ריכוז מגבלות רפואיות, אלרגיות, ציוד אישי נדרש, הנחיות הורים ודגשים למסירה לחובש, למדריכים ולאחראי הסעה.",
    sourceKind: "auto",
    handlingKind: "auto-generated",
  },
  {
    key: "staff-list",
    category: "חניכים וצוות",
    title: "רשימה של הצוות",
    description: "רשימת צוות ההדרכה והליווי של הטיול, תפקידים, טלפונים, פרטי קשר ואישורים נדרשים.",
    sourceKind: "auto",
    handlingKind: "auto-generated",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/staff-list`,
  },
  {
    key: "essential-contact-list",
    category: "חניכים וצוות",
    title: "רשימת קשר חיונית לטיול",
    description: "רשימת טלפונים חיוניים ורלוונטיים לטיול: מוקדי חירום, גורמי ארגון ובטיחות, וכל תקני הצוות המאושרים.",
    sourceKind: "auto",
    handlingKind: "auto-generated",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/essential-contact-list`,
  },
  {
    key: "participant-groups",
    category: "חניכים וצוות",
    title: "רשימת חניכים לפי קבוצות",
    description: "רשימות קבוצתיות למדריכים, כולל מספר חניכים, שם מדריך, פרטי קשר ודגשים רלוונטיים לכל קבוצה.",
    sourceKind: "auto",
    handlingKind: "auto-generated",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/participant-groups`,
  },
  {
    key: "bus-participant-assignments",
    category: "הסעות",
    title: "רשימת חניכים לפי הסעות",
    description: "רשימות חניכים וצוות לפי אוטובוסים, כולל אחראי הסעה, מספר חניכים, מספר צוות, מרכז והערות.",
    sourceKind: "auto",
    handlingKind: "auto-generated",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/bus-participant-assignments`,
  },
  {
    key: "transport-table",
    category: "הסעות",
    title: "טבלת שליטה בהסעות",
    description: "טבלת שליטה בהסעות: אחראי הסעה, טלפון, כתובת ושעת יציאה, נהג, חברת הסעות ואישורים שנשלחו.",
    sourceKind: "auto",
    handlingKind: "auto-generated",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/transport-table`,
  },
  {
    key: "bus-pre-departure-check",
    category: "הסעות",
    title: "בדיקת אוטובוס לפני יציאה",
    description: "נספח ט״ו - בדיקת האוטובוס לפני יציאה: אישור קצין בטיחות, רישיון נהג, גיל אוטובוס, חגורות, מים, אלונקה ותיק עזרה ראשונה.",
    sourceKind: "manual",
    handlingKind: "fixed-guidance",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/bus-pre-departure-check`,
  },
  {
    key: "bus-responsible-teacher-guidelines",
    category: "הסעות",
    title: "הנחיות למורה האחראי על האוטובוס",
    description: "נספח י״ג - הנחיות למורה האחראי על האוטובוס: ספירות, ירידה ועלייה, התנהגות בנסיעה, קשר עם הנהג ובקרת נוכחות.",
    sourceKind: "fixed",
    handlingKind: "fixed-guidance",
  },
  {
    key: "student-briefing",
    category: "תדרוכים והודעות",
    title: "תדרוך לחניכים",
    description: "תדרוך חובה לחניכים לפני היציאה: כללי בטיחות, התנהגות, נסיעה, הליכה, משמעת, מצב חירום ודגשים לפי אופי הטיול.",
    sourceKind: "fixed",
    handlingKind: "fixed-guidance",
  },
  {
    key: "student-letter-equipment",
    category: "תדרוכים והודעות",
    title: "מכתב לחניכים",
    description: "מכתב לחניכים ולהורים עם הנחיות, רשימת ציוד, שעות, נקודות איסוף, כללי התנהגות ודגשים מיוחדים לטיול.",
    sourceKind: "manual",
    handlingKind: "internal-form",
  },
  {
    key: "reporting-chain",
    category: "תדרוכים והודעות",
    title: "שרשרת דיווח",
    description: "סדר הדיווח במקרה חירום או שינוי במהלך הטיול: אחראי טיול, מנהל/מזכ״לית, רכז טיולים, חדר מצב, קב״ט וגורמי סיוע.",
    sourceKind: "fixed",
    handlingKind: "fixed-guidance",
  },
  {
    key: "emergency-incident-report",
    category: "חירום ורפואה",
    title: "דוח אירוע חירום",
    description: "טופס לתיעוד אירוע חירום במהלך הטיול: פרטי האירוע, מיקום, מעורבים, פעולות שבוצעו, דיווחים והחלטות המשך.",
    sourceKind: "manual",
    handlingKind: "internal-form",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/emergency-incident-report`,
  },
  {
    key: "medical-referral",
    category: "חירום ורפואה",
    title: "הפניה למיון / טיפול רפואי",
    description: "נספח א״י - טופס הפניה לטיפול רפואי לתלמיד שנפגע בטיול, כולל פרטי תלמיד, נסיבות הפגיעה, טיפול ראשוני ומלווה אחראי.",
    sourceKind: "manual",
    handlingKind: "internal-form",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/medical-referral`,
  },
  {
    key: "casualties-summary",
    category: "חירום ורפואה",
    title: "טבלת ריכוז נפגעים",
    description: "טבלה לריכוז פרטי נפגעים במקרה של כמה נפגעים: סטטוס, מיקום, טיפול, פינוי, בית חולים, קשר עם הורים ודיווחים.",
    sourceKind: "manual",
    handlingKind: "internal-form",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/casualties-summary`,
  },
  {
    key: "emergency-procedure",
    category: "חירום ורפואה",
    title: "התנהלות במצבי חירום",
    description: "נוהל קבוע להתנהלות במצבי חירום: פציעה, פינוי, אירוע ביטחוני, מזג אוויר קיצוני, שינוי מסלול ודיווח לחדר מצב.",
    sourceKind: "fixed",
    handlingKind: "fixed-guidance",
    editUrl: (tripId) => `/dashboard/trip/${tripId}/plan/documents/emergency-procedure`,
  },
];

const documentCategoryTone = (category: string) => {
  if (category.includes("אישור")) return "border-purple-100 bg-purple-50 text-purple-700";
  if (category.includes("חניכים")) return "border-cyan-100 bg-cyan-50 text-cyan-700";
  if (category.includes("הסעות")) return "border-amber-100 bg-amber-50 text-amber-700";
  if (category.includes("תדרוכים")) return "border-blue-100 bg-blue-50 text-blue-700";
  if (category.includes("חירום")) return "border-red-100 bg-red-50 text-red-700";
  if (category.includes("היערכות")) return "border-emerald-100 bg-emerald-50 text-emerald-700";
  return "border-slate-100 bg-slate-50 text-slate-700";
};

const documentCategoryBlockTone = (category: string) => {
  if (category.includes("אישור")) return "bg-purple-50/70 text-purple-900";
  if (category.includes("חניכים")) return "bg-cyan-50/70 text-cyan-900";
  if (category.includes("הסעות")) return "bg-amber-50/70 text-amber-900";
  if (category.includes("תדרוכים")) return "bg-blue-50/70 text-blue-900";
  if (category.includes("חירום")) return "bg-red-50/70 text-red-900";
  if (category.includes("היערכות")) return "bg-emerald-50/70 text-emerald-900";
  return "bg-slate-50/70 text-slate-900";
};

const normalizeDocumentStatus = (status?: string | null) => {
  const value = String(status || "").trim();
  if (!value || value === "להכנה") return "לטיפול";
  if (value === "בטיפול" || value === "מוכן לעריכה") return "בעבודה";
  if (value === "נבדק") return "מוכן PDF";
  return value;
};

const documentStatusDisplay = (status: string) => {
  const normalized = normalizeDocumentStatus(status);
  return normalized === "מוכן PDF" ? "מוכן" : normalized;
};

const documentStatusToneClasses = (status: string, variant: "badge" | "border" | "select" = "badge") => {
  const displayStatus = documentStatusDisplay(status);
  if (displayStatus === "לטיפול דחוף") {
    return variant === "border"
      ? "border-red-300 shadow-[0_0_0_1px_rgba(239,68,68,0.18)]"
      : variant === "select"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-red-100 bg-red-50 text-red-700";
  }
  if (displayStatus === "לטיפול") {
    return variant === "border"
      ? "border-pink-300 shadow-[0_0_0_1px_rgba(244,114,182,0.18)]"
      : variant === "select"
        ? "border-pink-200 bg-pink-50 text-pink-700"
        : "border-pink-100 bg-pink-50 text-pink-700";
  }
  if (displayStatus === "בעבודה") {
    return variant === "border"
      ? "border-orange-300 shadow-[0_0_0_1px_rgba(249,115,22,0.18)]"
      : variant === "select"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : "border-orange-100 bg-orange-50 text-orange-700";
  }
  if (displayStatus === "מוכן") {
    return variant === "border"
      ? "border-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]"
      : variant === "select"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-emerald-100 bg-emerald-50 text-emerald-700";
  }
  if (displayStatus === "לא נדרש") {
    return variant === "border"
      ? "border-gray-300 shadow-[0_0_0_1px_rgba(107,114,128,0.14)]"
      : variant === "select"
        ? "border-gray-200 bg-gray-50 text-gray-700"
        : "border-gray-100 bg-gray-50 text-gray-700";
  }
  return variant === "border" ? "border-pink-300 shadow-[0_0_0_1px_rgba(244,114,182,0.18)]" : "";
};

const SAFETY_DEPARTMENT_OWNER = "מחלקת בטיחות ומפעלים";
const MOKED_TEVA_DOCUMENT_KEY = "moked-teva-approval";
const UPLOADABLE_DOCUMENT_KEYS = new Set([MOKED_TEVA_DOCUMENT_KEY, "police-approvals", "business-license-insurance", "medic-security-certificates"]);
const EMPTY_OWNER_UPLOAD_DOCUMENT_KEYS = new Set(["police-approvals", "business-license-insurance", "medic-security-certificates"]);

const isDocumentCompleted = (document: { status: string; pdfUrl: string }) =>
  normalizeDocumentStatus(document.status) === "מוכן PDF" || normalizeDocumentStatus(document.status) === "לא נדרש";

const shouldShowDocumentPdfLink = (document: { status: string; pdfUrl: string }) =>
  normalizeDocumentStatus(document.status) === "מוכן PDF" || Boolean(document.pdfUrl.trim());

const isInternalDocumentUrl = (url: string) => url.includes("/plan/documents/");

const documentOwnerValue = (documentKey: string, owner?: string | null) => {
  const trimmed = String(owner || "").trim();
  if (EMPTY_OWNER_UPLOAD_DOCUMENT_KEYS.has(documentKey) && trimmed === SAFETY_DEPARTMENT_OWNER) return "";
  return trimmed;
};

function StyledStatusSelect({
  value,
  options,
  onChange,
  disabled,
  tone = "cyan",
}: {
  value: string;
  options: StyledStatusOption[];
  onChange: (next: string) => void;
  disabled?: boolean;
  tone?: "cyan" | "emerald" | "purple";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = options.find((option) => option.value === value) || options[0];
  const toneClass =
    tone === "emerald"
      ? "focus:ring-emerald-100 data-[open=true]:border-emerald-300 data-[open=true]:ring-emerald-100"
      : tone === "purple"
        ? "focus:ring-purple-100 data-[open=true]:border-purple-300 data-[open=true]:ring-purple-100"
        : "focus:ring-cyan-100 data-[open=true]:border-cyan-300 data-[open=true]:ring-cyan-100";
  const selectedClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "purple"
        ? "bg-purple-50 text-purple-700"
        : "bg-cyan-50 text-cyan-700";
  const isDocumentStatusSelect = options === documentStatusOptions;
  const statusToneClass = documentStatusToneClasses(active?.value || "", "select");

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className={`relative ${isDocumentStatusSelect ? "flex justify-center" : ""}`} ref={rootRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        data-open={isOpen}
        className={
          isDocumentStatusSelect
            ? `relative inline-flex h-9 min-w-28 items-center justify-center rounded-full border px-4 pl-9 text-center text-xs font-black shadow-sm outline-none transition-all hover:shadow disabled:cursor-not-allowed disabled:opacity-60 data-[open=true]:ring-2 ${statusToneClass} ${toneClass}`
            : `relative h-10 w-full rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-slate-50 px-3 pl-9 text-center text-xs font-black text-gray-700 shadow-sm outline-none transition-all hover:border-gray-300 hover:shadow disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 data-[open=true]:ring-2 ${toneClass}`
        }
      >
        {active?.label || "בחר סטטוס"}
        <ChevronDown
          size={14}
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen ? (
        <div className={`absolute top-full z-50 mt-1.5 min-w-48 overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 text-center shadow-2xl ${isDocumentStatusSelect ? "right-1/2 translate-x-1/2" : "right-0 w-full"}`}>
          {options.map((option) => {
            const selected = option.value === value;
            const optionToneClass = documentStatusToneClasses(option.value, "select");
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-center text-xs font-black transition-colors ${
                  isDocumentStatusSelect ? `${optionToneClass} ${selected ? "ring-1 ring-inset ring-current/20" : "opacity-85 hover:opacity-100"}` : selected ? selectedClass : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Check size={13} className={selected ? "opacity-100" : "opacity-0"} />
                <span className="flex-1">{option.label}</span>
                <span className="w-[13px]" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, icon, tone = "cyan" }: { label: string; value: number | string; icon?: React.ReactNode; tone?: "cyan" | "amber" | "red" }) {
  const toneClass =
    tone === "red"
      ? "border-red-100 bg-red-50 text-red-700"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : "border-cyan-100 bg-cyan-50 text-cyan-700";
  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-black">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}

const parseMoneyNumber = (value: string | number | null | undefined) => {
  const normalized = String(value ?? "").replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(value);

const formatRiskScore = (level?: number | null, likelihood?: number | null) => {
  if (typeof level !== "number" || typeof likelihood !== "number") return "לא דורג";
  return `רמה ${level} · שכיחות ${likelihood} · ציון ${level * likelihood}`;
};

const riskScoreToneClass = (level?: number | null, likelihood?: number | null) => {
  if (typeof level !== "number" || typeof likelihood !== "number") return "border-gray-200 bg-white/65 text-gray-500";
  if (level === 5 || likelihood === 5) return "border-red-200 bg-white/65 text-red-800";
  if (level <= 2 && likelihood <= 2) return "border-emerald-200 bg-white/65 text-emerald-800";
  return "border-amber-200 bg-white/65 text-amber-800";
};

const riskRowToneClass = (
  levelBefore?: number | null,
  likelihoodBefore?: number | null,
  levelAfter?: number | null,
  likelihoodAfter?: number | null,
) => {
  const hasAfterScore = typeof levelAfter === "number" && typeof likelihoodAfter === "number";
  const level = hasAfterScore ? levelAfter : levelBefore;
  const likelihood = hasAfterScore ? likelihoodAfter : likelihoodBefore;
  if (typeof level !== "number" || typeof likelihood !== "number") return "border-gray-100 bg-white hover:bg-gray-50";
  if (level === 5 || likelihood === 5) return "border-red-100 bg-red-50/70 hover:bg-red-50";
  if (level <= 2 && likelihood <= 2) return "border-emerald-100 bg-emerald-50/70 hover:bg-emerald-50";
  return "border-amber-100 bg-amber-50/70 hover:bg-amber-50";
};

export default function TripPlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quickActionParam = searchParams.get("quickAction");
  const focusParam = searchParams.get("focus");
  const { user, profile, loading: userLoading } = useUser("/");
  const [loading, setLoading] = useState(true);
  const [tripName, setTripName] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripAutofillMeta, setTripAutofillMeta] = useState<TripAutofillMeta | null>(null);
  const [activeTab, setActiveTab] = useState<PlanTab>("schedule");
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [occurrenceSchemaMissing, setOccurrenceSchemaMissing] = useState(false);
  const [instructionsSchemaMissing, setInstructionsSchemaMissing] = useState(false);
  const [staffRoster, setStaffRoster] = useState<StaffRosterEntry[]>([]);
  const [hasApprovedStaffPlan, setHasApprovedStaffPlan] = useState(false);
  const [responsibilityDialogRowId, setResponsibilityDialogRowId] = useState<string | null>(null);
  const [rowFollowUp, setRowFollowUp] = useState<{ rowId: string; action: PlanRowFollowUpActionId } | null>(null);
  const [printQuickDialogRowId, setPrintQuickDialogRowId] = useState<string | null>(null);
  const [printDialogSavePrompt, setPrintDialogSavePrompt] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [uploadingRowId, setUploadingRowId] = useState<string | null>(null);
  const [expandedCols, setExpandedCols] = useState<Record<string, ExpandedColsState>>({});
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [tablePanDragging, setTablePanDragging] = useState(false);
  const [tablePanStart, setTablePanStart] = useState<{ x: number; y: number; left: number; top: number } | null>(null);
  const [rowDragId, setRowDragId] = useState<string | null>(null);
  const [rowDropTargetId, setRowDropTargetId] = useState<string | null>(null);
  const [reorderingRows, setReorderingRows] = useState(false);
  const reorderingRowsRef = useRef(false);
  const [planTourForceOpen, setPlanTourForceOpen] = useState(false);
  const [tourPickerOpen, setTourPickerOpen] = useState(false);
  const [activeTourSteps, setActiveTourSteps] = useState<PlanTableTourStep[] | null>(null);
  const [tourPeopleSection, setTourPeopleSection] = useState<PlanTableTourPeopleSection | null>(null);
  const [timeErrors, setTimeErrors] = useState<Record<string, string>>({});
  const pendingPatchesRef = useRef<Set<Promise<void>>>(new Set());
  const autosaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const rowAbortControllersRef = useRef<Record<string, AbortController>>({});
  const rowsRef = useRef<PlanRow[]>([]);
  const lastSavedSignatureRef = useRef<Record<string, string>>({});
  const draftRowsRef = useRef<PlanRow[] | null>(null);
  const mitigationRiskPromptShownRef = useRef<Record<string, boolean>>({});
  const [confirmDeleteRowId, setConfirmDeleteRowId] = useState<string | null>(null);
  const [insertDialog, setInsertDialog] = useState<{
    open: boolean;
    position: "before" | "after";
    relativeRowId: string;
    dayIndex: number;
    customDate: string;
    minDayIndex: number;
    maxDayIndex: number | null;
  }>({
    open: false,
    position: "after",
    relativeRowId: "",
    dayIndex: 1,
    customDate: "",
    minDayIndex: 1,
    maxDayIndex: null,
  });
  const [activeQuantityUnitPicker, setActiveQuantityUnitPicker] = useState<string | null>(null);
  const [customQuantityUnitKey, setCustomQuantityUnitKey] = useState<string | null>(null);
  const [customQuantityUnitValue, setCustomQuantityUnitValue] = useState("");
  const [activeSourceSuggestionKey, setActiveSourceSuggestionKey] = useState<string | null>(null);
  const [activePrintLocationSuggestionKey, setActivePrintLocationSuggestionKey] = useState<string | null>(null);
  const [printDrafts, setPrintDrafts] = useState<
    Record<
      string,
      {
        file: File | null;
        quantity: string;
        print_size: string;
        page_type: string;
        print_location: string;
      }
    >
  >({});
  const [riskDialog, setRiskDialog] = useState<{
    open: boolean;
    rowId: string;
    safetyIndex: number;
    stage: "before" | "after";
    riskText: string;
    mitigationText: string;
    riskLevel: number | null;
    likelihood: number | null;
  }>({
    open: false,
    rowId: "",
    safetyIndex: -1,
    stage: "before",
    riskText: "",
    mitigationText: "",
    riskLevel: null,
    likelihood: null,
  });
  const [sensitiveDialog, setSensitiveDialog] = useState<{
    rowId: string;
    matchedLabel?: string;
    onConfirm: () => void;
  } | null>(null);
  const [riskSummaryDialog, setRiskSummaryDialog] = useState<{
    open: boolean;
    riskText: string;
    mitigationText: string;
    riskLevelBefore: number | null;
    likelihoodBefore: number | null;
    riskLevelAfter: number | null;
    likelihoodAfter: number | null;
  }>({
    open: false,
    riskText: "",
    mitigationText: "",
    riskLevelBefore: null,
    likelihoodBefore: null,
    riskLevelAfter: null,
    likelihoodAfter: null,
  });
  const [activeQuickAction, setActiveQuickAction] = useState<QuickActionId | null>(null);
  const [rolesQuickActionTab, setRolesQuickActionTab] = useState<"assignees" | "staffing">("assignees");
  const [requiredStaffRows, setRequiredStaffRows] = useState<RequiredStaffPlanRow[]>([]);
  const [requiredStaffContext, setRequiredStaffContext] = useState<RequiredStaffContext | null>(null);
  const [requiredStaffLoading, setRequiredStaffLoading] = useState(false);
  const [requiredStaffError, setRequiredStaffError] = useState("");
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState("");
  const [contactRows, setContactRows] = useState<TripContactRow[]>([]);
  const [fullscreenQuickActions, setFullscreenQuickActions] = useState<Partial<Record<QuickActionSurfaceId, boolean>>>({});
  const [purchaseMetaLoading, setPurchaseMetaLoading] = useState(false);
  const [purchaseMetaError, setPurchaseMetaError] = useState("");
  const [purchaseSchemaMissing, setPurchaseSchemaMissing] = useState(false);
  const [purchaseOverrides, setPurchaseOverrides] = useState<PurchaseOverride[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [showSuppliersDialog, setShowSuppliersDialog] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceSchemaMissing, setInvoiceSchemaMissing] = useState(false);
  const [invoices, setInvoices] = useState<TripInvoiceRecord[]>([]);
  const [invoiceUploading, setInvoiceUploading] = useState(false);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [invoiceDraft, setInvoiceDraft] = useState({
    amount: "",
    equipmentId: "",
    supplierName: "",
    invoiceNumber: "",
    notes: "",
  });
  const [printShopsLoading, setPrintShopsLoading] = useState(false);
  const [printShopsError, setPrintShopsError] = useState("");
  const [printUploadError, setPrintUploadError] = useState("");
  const [printShopsSchemaMissing, setPrintShopsSchemaMissing] = useState(false);
  const [printShops, setPrintShops] = useState<PrintShopRecord[]>([]);
  const [showPrintShopsDialog, setShowPrintShopsDialog] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState("");
  const [documentsSchemaMissing, setDocumentsSchemaMissing] = useState(false);
  const [documentOverrides, setDocumentOverrides] = useState<TripDocumentOverride[]>([]);
  const [documentParticipantsPayload, setDocumentParticipantsPayload] = useState<AutofillParticipantsPayload>(defaultAutofillParticipantsPayload);
  const [expandedDocumentDetails, setExpandedDocumentDetails] = useState<Set<string>>(new Set());
  const [expandedDocumentNotes, setExpandedDocumentNotes] = useState<Set<string>>(new Set());
  const [uploadingDocumentKey, setUploadingDocumentKey] = useState<string | null>(null);
  const purchaseSaveTimersRef = useRef<Record<string, number>>({});
  const invoiceSaveTimersRef = useRef<Record<string, number>>({});
  const printShopSaveTimersRef = useRef<Record<string, number>>({});
  const printStatusSaveTimersRef = useRef<Record<string, number>>({});
  const documentSaveTimersRef = useRef<Record<string, number>>({});

  const tripId = String(params.id || "");
  const draftStorageKey = `trip-plan-draft:${tripId}`;
  const documentsReturnStorageKey = `trip-documents-return:${tripId}`;
  const quickActionFullscreenStorageKey = `trip-quick-action-fullscreen:${tripId}`;
  const rowSignature = useCallback(
    (row: PlanRow) =>
      JSON.stringify({
        day_index: row.day_index ?? null,
        time_text: row.time_text ?? null,
        location_text: row.location_text ?? null,
        location_sensitive: Boolean(row.location_sensitive),
        event_text: row.event_text ?? null,
        occurrence_details: row.occurrence_details ?? null,
        staff_instructions: row.staff_instructions ?? null,
        participant_instructions: row.participant_instructions ?? null,
        notes: row.notes ?? null,
        owner_name: row.owner_name ?? null,
        owner_participant_id: row.owner_participant_id ?? null,
        owner_role_key: row.owner_role_key ?? null,
        safety_done: Boolean(row.safety_done),
        equipment_done: Boolean(row.equipment_done),
        prints_done: Boolean(row.prints_done),
        notes_done: Boolean(row.notes_done),
        details_done: Boolean(row.details_done),
        responsibilities_done: Boolean(row.responsibilities_done),
        safety: row.safety,
        equipment: row.equipment,
        tasks: row.tasks || [],
      }),
    [],
  );

  const mergeServerRowWithLocal = useCallback((localRow: PlanRow, serverRow: PlanRow): PlanRow => {
    const safety = localRow.safety.map((localItem, idx) => {
      const serverItem = serverRow.safety?.[idx];
      if (!serverItem) return localItem;
      return {
        ...localItem,
        ...serverItem,
        id: serverItem.id || localItem.id,
        risk: serverItem.risk ?? localItem.risk,
        mitigation: serverItem.mitigation ?? localItem.mitigation,
        owner: serverItem.owner ?? localItem.owner,
        risk_level_before: serverItem.risk_level_before ?? localItem.risk_level_before,
        likelihood_before: serverItem.likelihood_before ?? localItem.likelihood_before,
        risk_level_after: serverItem.risk_level_after ?? localItem.risk_level_after,
        likelihood_after: serverItem.likelihood_after ?? localItem.likelihood_after,
      };
    });
    const equipment = localRow.equipment.map((localItem, idx) => {
      const serverItem = serverRow.equipment?.[idx];
      if (!serverItem) return localItem;
      return {
        ...localItem,
        ...serverItem,
        id: serverItem.id || localItem.id,
        item: serverItem.item ?? localItem.item,
        quantity: serverItem.quantity ?? localItem.quantity,
        quantity_unit: serverItem.quantity_unit ?? localItem.quantity_unit,
        source_type: serverItem.source_type ?? localItem.source_type,
        source_details: serverItem.source_details ?? localItem.source_details,
      };
    });
    const tasks = localRow.tasks?.map((localItem, idx) => {
      const serverItem = serverRow.tasks?.[idx];
      if (!serverItem) return localItem;
      return {
        ...localItem,
        ...serverItem,
        id: serverItem.id || localItem.id,
        phase: serverItem.phase ?? localItem.phase,
        task_text: serverItem.task_text ?? localItem.task_text,
        assignee_name: serverItem.assignee_name ?? localItem.assignee_name,
        assignee_participant_id: serverItem.assignee_participant_id ?? localItem.assignee_participant_id,
        assignee_role_key: serverItem.assignee_role_key ?? localItem.assignee_role_key,
      };
    }) || serverRow.tasks || [];
    const prints = (serverRow.prints || localRow.prints).map((serverPrint, idx) => {
      const localPrint = localRow.prints[idx];
      if (!localPrint) return serverPrint;
      return {
        ...localPrint,
        ...serverPrint,
        print_size: serverPrint.print_size ?? localPrint.print_size,
        page_type: serverPrint.page_type ?? localPrint.page_type,
        print_location: serverPrint.print_location ?? localPrint.print_location,
      };
    });

    return {
      ...localRow,
      ...serverRow,
      order_index: localRow.order_index,
      day_index: localRow.day_index ?? serverRow.day_index,
      safety_done: serverRow.safety_done ?? localRow.safety_done,
      equipment_done: serverRow.equipment_done ?? localRow.equipment_done,
      prints_done: serverRow.prints_done ?? localRow.prints_done,
      notes_done: serverRow.notes_done ?? localRow.notes_done,
      details_done: serverRow.details_done ?? localRow.details_done,
      responsibilities_done: serverRow.responsibilities_done ?? localRow.responsibilities_done,
      safety,
      equipment,
      prints,
      tasks,
    };
  }, []);

  const mergeServerPersistentFieldsIntoLocal = useCallback((localRow: PlanRow, serverRow: PlanRow): PlanRow => {
    const safety = localRow.safety.map((localItem, idx) => {
      const serverItem = serverRow.safety?.[idx];
      if (!serverItem) return localItem;
      return {
        ...localItem,
        id: localItem.id || serverItem.id,
        risk_level_before: localItem.risk_level_before ?? serverItem.risk_level_before,
        likelihood_before: localItem.likelihood_before ?? serverItem.likelihood_before,
        risk_level_after: localItem.risk_level_after ?? serverItem.risk_level_after,
        likelihood_after: localItem.likelihood_after ?? serverItem.likelihood_after,
      };
    });
    return {
      ...localRow,
      safety_done: localRow.safety_done ?? serverRow.safety_done,
      equipment_done: localRow.equipment_done ?? serverRow.equipment_done,
      prints_done: localRow.prints_done ?? serverRow.prints_done,
      notes_done: localRow.notes_done ?? serverRow.notes_done,
      details_done: localRow.details_done ?? serverRow.details_done,
      responsibilities_done: localRow.responsibilities_done ?? serverRow.responsibilities_done,
      safety,
      equipment: localRow.equipment.map((localItem, idx) => ({
        ...localItem,
        id: localItem.id || serverRow.equipment?.[idx]?.id,
        quantity_unit: localItem.quantity_unit ?? serverRow.equipment?.[idx]?.quantity_unit,
      })),
      tasks: (localRow.tasks || []).map((localItem, idx) => ({
        ...localItem,
        id: localItem.id || serverRow.tasks?.[idx]?.id,
      })),
      prints: localRow.prints.length ? localRow.prints : serverRow.prints,
    };
  }, []);

  useEffect(() => {
    if (!tripId) return;
    try {
      const raw = sessionStorage.getItem(draftStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { rows?: PlanRow[]; savedAt?: number };
      if (!Array.isArray(parsed?.rows) || parsed.rows.length === 0) return;
      draftRowsRef.current = parsed.rows;
    } catch {
      // Ignore malformed local draft
    }
  }, [tripId, draftStorageKey]);

  const loadPlan = useCallback(async (allowReseed = true) => {
    const res = await fetch(`/api/trips/${tripId}/plan`, { credentials: "include" });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(payload?.error || "טעינת תכנון נכשלה"));

    setTripName(String(payload?.trip?.name || "תכנון טיול"));
    setTripStartDate(String(payload?.trip?.start_date || ""));
    setTripAutofillMeta((payload?.trip as TripAutofillMeta | null) || null);
    const schemaMissing = payload?.schemaMissing as
      | { occurrenceDetails?: boolean; instructions?: boolean; tasks?: boolean }
      | undefined;
    setOccurrenceSchemaMissing(Boolean(schemaMissing?.occurrenceDetails || schemaMissing?.tasks));
    setInstructionsSchemaMissing(Boolean(schemaMissing?.instructions));
    const existingRows = Array.isArray(payload?.rows) ? (payload.rows as PlanRow[]) : [];
    const timeline = Array.isArray(payload?.trip?.details?.timeline) ? payload.trip.details.timeline : [];
    const rowsLookEmpty =
      existingRows.length > 0 &&
      existingRows.every(
        (r) =>
          !r.time_text &&
          !r.location_text &&
          !r.event_text &&
          !r.notes &&
          !r.owner_name &&
          (r.safety?.length || 0) === 0 &&
          (r.equipment?.length || 0) === 0 &&
          (r.prints?.length || 0) === 0,
      );

    if (existingRows.length === 0) {
      await fetch(`/api/trips/${tripId}/plan/seed`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await loadPlan(false);
      return;
    }
    if (allowReseed && rowsLookEmpty && timeline.length > 0) {
      await fetch(`/api/trips/${tripId}/plan/seed`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      await loadPlan(false);
      return;
    }
    const normalized = existingRows.map((r, idx) => ({
      ...r,
      day_index: r.day_index ?? idx + 1,
      tasks: normalizePlanRowTasks(r.tasks),
    }));
    const localPrior =
      rowsRef.current.length > 0
        ? rowsRef.current
        : Array.isArray(draftRowsRef.current) && draftRowsRef.current.length > 0
          ? draftRowsRef.current
          : [];
    const localById = new Map(localPrior.map((r) => [r.id, r]));
    const merged = normalized.map((serverRow) => {
      const localRow = localById.get(serverRow.id);
      if (!localRow) return serverRow;
      const serverSig = rowSignature(serverRow);
      const localSig = rowSignature(localRow);
      if (localSig === serverSig) return serverRow;
      const baseline = lastSavedSignatureRef.current[serverRow.id];
      if (baseline === undefined && localSig !== serverSig) return mergeServerPersistentFieldsIntoLocal(localRow, serverRow);
      if (baseline !== undefined && localSig !== baseline) return mergeServerPersistentFieldsIntoLocal(localRow, serverRow);
      return serverRow;
    });
    const nextBaseline: Record<string, string> = { ...lastSavedSignatureRef.current };
    for (const serverRow of normalized) {
      const chosen = merged.find((r) => r.id === serverRow.id);
      if (!chosen) continue;
      if (rowSignature(chosen) === rowSignature(serverRow)) {
        nextBaseline[serverRow.id] = rowSignature(serverRow);
      }
    }
    lastSavedSignatureRef.current = nextBaseline;
    setRows(merged);
    rowsRef.current = merged;
    Object.values(autosaveTimersRef.current).forEach((timer) => clearTimeout(timer));
    autosaveTimersRef.current = {};
    setExpandedCols((prev) => {
      const next = { ...prev };
      for (const row of normalized) {
        const key = String(row.id);
        if (!next[key]) next[key] = emptyExpandedCols();
      }
      return next;
    });
  }, [tripId, rowSignature, mergeServerPersistentFieldsIntoLocal]);

  const loadStaffRoster = useCallback(async () => {
    if (!tripId) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/plan/participants`, { credentials: "include", cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const staff = Array.isArray(payload?.staff) ? payload.staff : [];
      setStaffRoster(
        buildStaffRoster(
          staff.map((person: { id: string; name?: string; role?: string; raw?: Record<string, unknown> }) => ({
            id: person.id,
            name: person.name,
            role: person.role,
            raw: person.raw,
          })),
        ),
      );
    } catch {
      setStaffRoster([]);
    }
  }, [tripId]);

  useEffect(() => {
    void loadStaffRoster();
  }, [loadStaffRoster]);

  const planningRoles = useMemo(() => buildPlanningRoleOptions(requiredStaffRows), [requiredStaffRows]);
  const staffAssigneeMode = hasApprovedStaffPlan ? "roster" : "planning";

  const loadPurchaseMeta = useCallback(async () => {
    if (!tripId) return;
    setPurchaseMetaLoading(true);
    setPurchaseMetaError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/plan/purchases`, { credentials: "include" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(payload?.error || "טעינת נתוני רכש נכשלה"));
      setPurchaseSchemaMissing(Boolean(payload?.schemaMissing));
      setPurchaseOverrides(Array.isArray(payload?.overrides) ? payload.overrides : []);
      setSuppliers(Array.isArray(payload?.suppliers) ? payload.suppliers : []);
    } catch (err) {
      setPurchaseMetaError(err instanceof Error ? err.message : "טעינת נתוני רכש נכשלה");
    } finally {
      setPurchaseMetaLoading(false);
    }
  }, [tripId]);

  const loadPrintShopsMeta = useCallback(async () => {
    if (!tripId) return;
    setPrintShopsLoading(true);
    setPrintShopsError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/plan/print-shops`, { credentials: "include" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(payload?.error || "טעינת פרטי בתי דפוס נכשלה"));
      setPrintShopsSchemaMissing(Boolean(payload?.schemaMissing));
      setPrintShops(Array.isArray(payload?.printShops) ? payload.printShops : []);
    } catch (err) {
      setPrintShopsError(err instanceof Error ? err.message : "טעינת פרטי בתי דפוס נכשלה");
    } finally {
      setPrintShopsLoading(false);
    }
  }, [tripId]);

  const loadDocumentsMeta = useCallback(async () => {
    if (!tripId) return;
    setDocumentsLoading(true);
    setDocumentsError("");
    try {
      const [res, participantsRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/plan/documents`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/trips/${tripId}/plan/participants`, { credentials: "include", cache: "no-store" }),
      ]);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(payload?.error || "טעינת נתוני מסמכים נכשלה"));
      setDocumentsSchemaMissing(Boolean(payload?.schemaMissing));
      setDocumentOverrides(Array.isArray(payload?.documents) ? payload.documents : []);
      const participantsPayload = await participantsRes.json().catch(() => ({}));
      if (participantsRes.ok) {
        setDocumentParticipantsPayload({
          participants: Array.isArray(participantsPayload?.participants) ? participantsPayload.participants : [],
          staff: Array.isArray(participantsPayload?.staff) ? participantsPayload.staff : [],
          buses: Array.isArray(participantsPayload?.buses) ? participantsPayload.buses : [],
          assignmentSets: Array.isArray(participantsPayload?.assignmentSets) ? participantsPayload.assignmentSets : [],
        });
      } else {
        setDocumentParticipantsPayload(defaultAutofillParticipantsPayload);
      }
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : "טעינת נתוני מסמכים נכשלה");
    } finally {
      setDocumentsLoading(false);
    }
  }, [tripId]);

  const loadRequiredStaffPlan = useCallback(async () => {
    setRequiredStaffLoading(true);
    setRequiredStaffError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/required-staff`, { cache: "no-store", credentials: "include" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(payload?.error || "טעינת מצבת הצוות נכשלה"));
      const rows = Array.isArray(payload.approvedRows) && payload.approvedRows.length ? payload.approvedRows : payload.preview?.rows;
      setRequiredStaffRows(Array.isArray(rows) ? rows : []);
      setHasApprovedStaffPlan(Array.isArray(payload.approvedRows) && payload.approvedRows.length > 0);
      setRequiredStaffContext(payload.preview?.context || null);
    } catch (err) {
      setRequiredStaffError(err instanceof Error ? err.message : "טעינת מצבת הצוות נכשלה");
    } finally {
      setRequiredStaffLoading(false);
    }
  }, [tripId]);

  const loadContacts = useCallback(async () => {
    setContactsLoading(true);
    setContactsError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/contacts`, { cache: "no-store", credentials: "include" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(payload?.error || "טעינת רשימת הקשר נכשלה"));
      setContactRows(Array.isArray(payload.contacts) ? payload.contacts : []);
    } catch (err) {
      setContactsError(err instanceof Error ? err.message : "טעינת רשימת הקשר נכשלה");
    } finally {
      setContactsLoading(false);
    }
  }, [tripId]);

  const loadInvoices = useCallback(async () => {
    setInvoiceLoading(true);
    setInvoiceError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/plan/invoices`, { cache: "no-store", credentials: "include" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(payload?.error || "טעינת החשבוניות נכשלה"));
      setInvoiceSchemaMissing(Boolean(payload?.schemaMissing));
      setInvoices(Array.isArray(payload?.invoices) ? payload.invoices : []);
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : "טעינת החשבוניות נכשלה");
    } finally {
      setInvoiceLoading(false);
    }
  }, [tripId]);

  const openQuickAction = (actionId: QuickActionId) => {
    if (actionId !== "documents" && actionId !== "emergency" && actionId !== "purchases" && actionId !== "risks" && actionId !== "equipment" && actionId !== "prints" && actionId !== "roles" && actionId !== "contacts" && actionId !== "refunds") return;
    const savedFullscreenState = window.sessionStorage.getItem(quickActionFullscreenStorageKey);
    if (savedFullscreenState) {
      try {
        setFullscreenQuickActions((prev) => ({ ...prev, ...JSON.parse(savedFullscreenState) }));
      } catch {
        window.sessionStorage.removeItem(quickActionFullscreenStorageKey);
      }
    }
    setActiveQuickAction(actionId);
    if (actionId === "documents") void loadDocumentsMeta();
    if (actionId === "purchases" || actionId === "equipment") void loadPurchaseMeta();
    if (actionId === "refunds") {
      void loadPurchaseMeta();
      void loadInvoices();
    }
    if (actionId === "prints") void loadPrintShopsMeta();
    if (actionId === "roles") {
      setRolesQuickActionTab("assignees");
      void loadRequiredStaffPlan();
    }
    if (actionId === "contacts") void loadContacts();
  };

  useEffect(() => {
    if (!activeQuickAction) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeQuickAction]);

  useEffect(() => {
    if (quickActionParam !== "documents" && quickActionParam !== "contacts") return;
    const savedFullscreenState = window.sessionStorage.getItem(quickActionFullscreenStorageKey);
    if (savedFullscreenState) {
      try {
        setFullscreenQuickActions((prev) => ({ ...prev, ...JSON.parse(savedFullscreenState) }));
      } catch {
        window.sessionStorage.removeItem(quickActionFullscreenStorageKey);
      }
    }
    setActiveQuickAction(quickActionParam);
    if (quickActionParam === "documents") void loadDocumentsMeta();
    if (quickActionParam === "contacts") void loadContacts();
  }, [quickActionParam, loadContacts, loadDocumentsMeta, quickActionFullscreenStorageKey]);

  const patchPurchaseMeta = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/trips/${tripId}/plan/purchases`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(payload?.error || "השמירה נכשלה"));
    return payload;
  };

  const updatePurchaseOverride = (equipmentId: string, patch: { status?: string; owner?: string; unitPrice?: string }) => {
    setPurchaseOverrides((prev) => {
      const current = prev.find((override) => override.equipment_id === equipmentId);
      const next = current
        ? { ...current, status: patch.status ?? current.status, owner: patch.owner ?? current.owner, unit_price: patch.unitPrice ?? current.unit_price }
        : { equipment_id: equipmentId, status: patch.status ?? "", owner: patch.owner ?? "", unit_price: patch.unitPrice ?? "" };
      return current ? prev.map((override) => (override.equipment_id === equipmentId ? next : override)) : [...prev, next];
    });
    window.clearTimeout(purchaseSaveTimersRef.current[equipmentId]);
    purchaseSaveTimersRef.current[equipmentId] = window.setTimeout(() => {
      const latest = purchaseOverrides.find((override) => override.equipment_id === equipmentId);
      const status = patch.status ?? latest?.status ?? "";
      const owner = patch.owner ?? latest?.owner ?? "";
      const unitPrice = patch.unitPrice ?? latest?.unit_price ?? "";
      void patchPurchaseMeta({ action: "updatePurchaseOverride", equipmentId, status, owner, unitPrice })
        .then(() => loadPurchaseMeta())
        .catch((err) => setPurchaseMetaError(err instanceof Error ? err.message : "השמירה נכשלה"));
    }, 700);
  };

  const updateSupplier = (name: string, patch: { phone?: string; email?: string; address?: string }) => {
    setSuppliers((prev) => {
      const current = prev.find((supplier) => supplier.name === name);
      const next = current ? { ...current, ...patch } : { name, phone: "", email: "", address: "", ...patch };
      return current ? prev.map((supplier) => (supplier.name === name ? next : supplier)) : [...prev, next];
    });
    window.clearTimeout(purchaseSaveTimersRef.current[`supplier:${name}`]);
    purchaseSaveTimersRef.current[`supplier:${name}`] = window.setTimeout(() => {
      const current = suppliers.find((supplier) => supplier.name === name);
      const phone = patch.phone ?? current?.phone ?? "";
      const email = patch.email ?? current?.email ?? "";
      const address = patch.address ?? current?.address ?? "";
      void patchPurchaseMeta({ action: "updateSupplier", name, phone, email, address })
        .then(() => loadPurchaseMeta())
        .catch((err) => setPurchaseMetaError(err instanceof Error ? err.message : "השמירה נכשלה"));
    }, 700);
  };

  const patchInvoice = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/trips/${tripId}/plan/invoices`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(payload?.error || "שמירת החשבונית נכשלה"));
    return payload;
  };

  const updateInvoice = (invoiceId: string, patch: Partial<TripInvoiceRecord>) => {
    setInvoices((prev) => prev.map((invoice) => (invoice.id === invoiceId ? { ...invoice, ...patch } : invoice)));
    window.clearTimeout(invoiceSaveTimersRef.current[invoiceId]);
    invoiceSaveTimersRef.current[invoiceId] = window.setTimeout(() => {
      const body: Record<string, unknown> = { id: invoiceId };
      if ("equipment_id" in patch) body.equipmentId = patch.equipment_id ?? "";
      if ("amount" in patch) body.amount = patch.amount ?? "";
      if ("supplier_name" in patch) body.supplierName = patch.supplier_name ?? "";
      if ("invoice_number" in patch) body.invoiceNumber = patch.invoice_number ?? "";
      if ("notes" in patch) body.notes = patch.notes ?? "";
      if ("submission_status" in patch) body.submissionStatus = patch.submission_status ?? "draft";
      void patchInvoice(body)
        .then(() => loadInvoices())
        .catch((err) => setInvoiceError(err instanceof Error ? err.message : "שמירת החשבונית נכשלה"));
    }, 700);
  };

  const uploadInvoice = async (file: File) => {
    setInvoiceUploading(true);
    setInvoiceError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("amount", invoiceDraft.amount.trim());
      fd.append("equipmentId", invoiceDraft.equipmentId);
      fd.append("supplierName", invoiceDraft.supplierName.trim());
      fd.append("invoiceNumber", invoiceDraft.invoiceNumber.trim());
      fd.append("notes", invoiceDraft.notes.trim());
      const res = await fetch(`/api/trips/${tripId}/plan/invoices`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(payload?.error || "העלאת החשבונית נכשלה"));
      setInvoiceDraft({ amount: "", equipmentId: "", supplierName: "", invoiceNumber: "", notes: "" });
      await loadInvoices();
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : "העלאת החשבונית נכשלה");
    } finally {
      setInvoiceUploading(false);
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    setDeletingInvoiceId(invoiceId);
    setInvoiceError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/plan/invoices`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoiceId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(payload?.error || "מחיקת החשבונית נכשלה"));
      setInvoices((prev) => prev.filter((invoice) => invoice.id !== invoiceId));
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : "מחיקת החשבונית נכשלה");
    } finally {
      setDeletingInvoiceId(null);
    }
  };

  const openInvoiceFile = async (fileUrl: string) => {
    try {
      const url = await getDocumentFileUrl(fileUrl);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : "פתיחת החשבונית נכשלה");
    }
  };

  const patchPrintShopMeta = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/trips/${tripId}/plan/print-shops`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(payload?.error || "שמירת בית דפוס נכשלה"));
    return payload;
  };

  const updatePrintShop = (name: string, patch: { phone?: string; email?: string; address?: string }) => {
    setPrintShops((prev) => {
      const current = prev.find((printShop) => printShop.name === name);
      const next = current ? { ...current, ...patch } : { name, phone: "", email: "", address: "", ...patch };
      return current ? prev.map((printShop) => (printShop.name === name ? next : printShop)) : [...prev, next];
    });
    window.clearTimeout(printShopSaveTimersRef.current[name]);
    printShopSaveTimersRef.current[name] = window.setTimeout(() => {
      const current = printShops.find((printShop) => printShop.name === name);
      const phone = patch.phone ?? current?.phone ?? "";
      const email = patch.email ?? current?.email ?? "";
      const address = patch.address ?? current?.address ?? "";
      void patchPrintShopMeta({ action: "updatePrintShop", name, phone, email, address })
        .then(() => loadPrintShopsMeta())
        .catch((err) => setPrintShopsError(err instanceof Error ? err.message : "שמירת בית דפוס נכשלה"));
    }, 700);
  };

  const updatePrintStatus = (rowId: string, printId: string, status: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              prints: row.prints.map((print) => (print.id === printId ? { ...print, status } : print)),
            }
          : row,
      ),
    );
    window.clearTimeout(printStatusSaveTimersRef.current[printId]);
    printStatusSaveTimersRef.current[printId] = window.setTimeout(() => {
      void fetch(`/api/trips/${tripId}/plan/rows/${rowId}/prints/${printId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            throw new Error(String(payload?.error || "שמירת סטטוס הדפסה נכשלה"));
          }
        })
        .catch((err) => setPrintShopsError(err instanceof Error ? err.message : "שמירת סטטוס הדפסה נכשלה"));
    }, 500);
  };

  const patchDocumentMeta = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/trips/${tripId}/plan/documents`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(payload?.error || "שמירת מסמך נכשלה"));
    return payload;
  };

  const updateDocumentOverride = (
    documentKey: string,
    patch: { status?: string; owner?: string; note?: string; editUrl?: string; pdfUrl?: string },
  ) => {
    setDocumentOverrides((prev) => {
      const current = prev.find((override) => override.document_key === documentKey);
      const next = current
        ? {
            ...current,
            status: patch.status ?? current.status,
            owner: patch.owner ?? current.owner,
            note: patch.note ?? current.note,
            edit_url: patch.editUrl ?? current.edit_url,
            pdf_url: patch.pdfUrl ?? current.pdf_url,
          }
        : {
            document_key: documentKey,
            status: patch.status ?? "",
            owner: patch.owner ?? "",
            note: patch.note ?? "",
            edit_url: patch.editUrl ?? "",
            pdf_url: patch.pdfUrl ?? "",
          };
      return current ? prev.map((override) => (override.document_key === documentKey ? next : override)) : [...prev, next];
    });
    window.clearTimeout(documentSaveTimersRef.current[documentKey]);
    documentSaveTimersRef.current[documentKey] = window.setTimeout(() => {
      const latest = documentOverrides.find((override) => override.document_key === documentKey);
      void patchDocumentMeta({
        action: "updateDocument",
        documentKey,
        status: patch.status ?? latest?.status ?? "",
        owner: patch.owner ?? latest?.owner ?? "",
        note: patch.note ?? latest?.note ?? "",
        editUrl: patch.editUrl ?? latest?.edit_url ?? "",
        pdfUrl: patch.pdfUrl ?? latest?.pdf_url ?? "",
      })
        .then(() => loadDocumentsMeta())
        .catch((err) => setDocumentsError(err instanceof Error ? err.message : "שמירת מסמך נכשלה"));
    }, 700);
  };

  const getDocumentFileUrl = async (pdfUrl: string) => {
    const trimmed = pdfUrl.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const normalizedPath = trimmed.startsWith("trip-files/") ? trimmed.slice("trip-files/".length) : trimmed;
    const { data, error } = await supabase.storage.from("trip-files").createSignedUrl(normalizedPath, 3600);
    if (error) throw error;
    return data.signedUrl;
  };

  const openDocumentFile = async (pdfUrl: string) => {
    try {
      const url = await getDocumentFileUrl(pdfUrl);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : "פתיחת הקובץ נכשלה");
    }
  };

  const downloadDocumentFile = async (pdfUrl: string) => {
    try {
      const url = await getDocumentFileUrl(pdfUrl);
      if (!url) return;
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : "הורדת הקובץ נכשלה");
    }
  };

  const deleteDocumentFile = async (documentKey: string, fileUrl?: string) => {
    setUploadingDocumentKey(documentKey);
    setDocumentsError("");
    try {
      await patchDocumentMeta({
        action: "deleteDocumentFile",
        documentKey,
        fileUrl: fileUrl || "",
        owner: documentKey === MOKED_TEVA_DOCUMENT_KEY ? SAFETY_DEPARTMENT_OWNER : documentOwnerValue(documentKey, ""),
      });
      await loadDocumentsMeta();
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : "מחיקת הקובץ נכשלה");
    } finally {
      setUploadingDocumentKey(null);
    }
  };

  const uploadDocumentFile = async (documentKey: string, file: File) => {
    setUploadingDocumentKey(documentKey);
    setDocumentsError("");
    try {
      const fd = new FormData();
      fd.append("action", "uploadDocumentFile");
      fd.append("documentKey", documentKey);
      fd.append("file", file);
      const res = await fetch(`/api/trips/${tripId}/plan/documents`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(payload?.error || "העלאת המסמך נכשלה"));
      const uploadedPdfUrl = String(payload?.pdfUrl || "");
      const uploadedFile = payload?.uploadedFile && typeof payload.uploadedFile === "object" ? (payload.uploadedFile as UploadedDocumentFile) : null;
      if (uploadedPdfUrl) {
        setDocumentOverrides((prev) => {
          const current = prev.find((override) => override.document_key === documentKey);
          const currentFiles = getUploadedDocumentFiles(current?.form_data, current?.pdf_url);
          const nextFiles = uploadedFile ? [...currentFiles.filter((file) => file.url !== uploadedFile.url), uploadedFile] : currentFiles;
          const next: TripDocumentOverride = {
            ...(current || { document_key: documentKey }),
            document_key: documentKey,
            status: "מוכן PDF",
            owner: documentKey === MOKED_TEVA_DOCUMENT_KEY ? SAFETY_DEPARTMENT_OWNER : documentOwnerValue(documentKey, current?.owner),
            note: current?.note || "",
            edit_url: "",
            pdf_url: nextFiles[0]?.url || uploadedPdfUrl,
            form_data: { ...((current?.form_data && typeof current.form_data === "object" ? current.form_data : {}) as Record<string, unknown>), uploadedFiles: nextFiles },
          };
          return current ? prev.map((override) => (override.document_key === documentKey ? next : override)) : [...prev, next];
        });
      }
      await loadDocumentsMeta();
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : "העלאת המסמך נכשלה");
    } finally {
      setUploadingDocumentKey(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      const { data: trip } = await supabase.from("trips").select("user_id").eq("id", tripId).single();
      if (!trip) {
        router.push("/dashboard/my-trips");
        return;
      }
      const manager = isManagerUser(user, profile);
      if (!manager && String(trip.user_id) !== user.id) {
        router.push("/dashboard");
        return;
      }
      await loadPlan();
      setLoading(false);
    };
    if (!userLoading && user && tripId) void init();
  }, [userLoading, user, profile, tripId, router, loadPlan]);

  const patchRow = useCallback(
    async (row: PlanRow) => {
      if (timeErrors[row.id]) return;
      const task = (async () => {
        setSavingRowId(row.id);
        const prevController = rowAbortControllersRef.current[row.id];
        if (prevController) prevController.abort();
        const controller = new AbortController();
        rowAbortControllersRef.current[row.id] = controller;
        try {
          const res = await fetch(`/api/trips/${tripId}/plan/rows/${row.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            signal: controller.signal,
            body: JSON.stringify({
              day_index: row.day_index ?? null,
              time_text: row.time_text ?? null,
              location_text: row.location_text ?? null,
              location_sensitive: Boolean(row.location_sensitive),
              event_text: row.event_text ?? null,
              occurrence_details: row.occurrence_details ?? null,
              staff_instructions: row.staff_instructions ?? null,
              participant_instructions: row.participant_instructions ?? null,
              notes: row.notes ?? null,
              owner_name: row.owner_name ?? null,
              owner_participant_id: row.owner_participant_id ?? null,
              owner_role_key: row.owner_role_key ?? null,
              safety_done: Boolean(row.safety_done),
              equipment_done: Boolean(row.equipment_done),
              prints_done: Boolean(row.prints_done),
              notes_done: Boolean(row.notes_done),
              details_done: Boolean(row.details_done),
              responsibilities_done: Boolean(row.responsibilities_done),
              safety: row.safety,
              equipment: row.equipment,
              tasks: row.tasks || [],
            }),
          });
          if (!res.ok) return;
          const payload = await res.json().catch(() => ({}));
          const serverRow = payload?.row as PlanRow | undefined;
          if (!serverRow) {
            lastSavedSignatureRef.current[row.id] = rowSignature(row);
            return;
          }
          const currentBeforeMerge = rowsRef.current.find((current) => current.id === row.id);
          const shouldApplyFullServerRow = currentBeforeMerge ? rowSignature(currentBeforeMerge) === rowSignature(row) : true;
          const mergedServerRow = mergeServerRowWithLocal(row, serverRow);
          const orderIndexFromUi = rowsRef.current.find((current) => current.id === row.id)?.order_index;
          setRows((prev) =>
            prev.map((current) => {
              if (current.id !== row.id) return current;
              if (shouldApplyFullServerRow) {
                return {
                  ...mergedServerRow,
                  order_index: orderIndexFromUi ?? mergedServerRow.order_index,
                };
              }
              return {
                ...current,
                safety: current.safety.map((item, idx) => ({
                  ...item,
                  id: item.id || serverRow.safety?.[idx]?.id,
                })),
                equipment: current.equipment.map((item, idx) => ({
                  ...item,
                  id: item.id || serverRow.equipment?.[idx]?.id,
                })),
                tasks: (current.tasks || []).map((item, idx) => ({
                  ...item,
                  id: item.id || serverRow.tasks?.[idx]?.id,
                })),
                prints: serverRow.prints || current.prints,
              };
            }),
          );
          if (shouldApplyFullServerRow) {
            lastSavedSignatureRef.current[row.id] = rowSignature(mergedServerRow);
          }
        } catch (err) {
          if (!(err instanceof DOMException && err.name === "AbortError")) {
            throw err;
          }
        } finally {
          if (rowAbortControllersRef.current[row.id] === controller) {
            delete rowAbortControllersRef.current[row.id];
          }
          setSavingRowId(null);
        }
      })();
      pendingPatchesRef.current.add(task);
      await task.finally(() => {
        pendingPatchesRef.current.delete(task);
      });
    },
    [mergeServerRowWithLocal, timeErrors, tripId, rowSignature],
  );

  const flushPendingEdits = async () => {
    const active = document.activeElement as HTMLElement | null;
    active?.blur();
    await Promise.resolve();
    const pending = [...pendingPatchesRef.current];
    if (pending.length > 0) await Promise.allSettled(pending);
  };

  const saveRowById = useCallback(
    async (rowId: string) => {
      if (rowId.startsWith("temp-")) return;
      const latest = rowsRef.current.find((r) => r.id === rowId);
      if (!latest) return;
      await patchRow(latest);
    },
    [patchRow],
  );

  const handleRowLocationBlur = useCallback(
    (rowId: string) => {
      const row = rowsRef.current.find((r) => r.id === rowId);
      if (!row) return;
      const detection = detectSensitiveLocation(row.location_text || "");
      if (detection.sensitive && !row.location_sensitive) {
        setSensitiveDialog({
          rowId,
          matchedLabel: detection.matchedLabel,
          onConfirm: () => {
            setSensitiveDialog(null);
            setRows((prev) => {
              const next = prev.map((r) => (r.id === rowId ? { ...r, location_sensitive: true } : r));
              const updated = next.find((r) => r.id === rowId);
              if (updated) void patchRow(updated);
              return next;
            });
          },
        });
        return;
      }
      void saveRowById(rowId);
    },
    [patchRow, saveRowById],
  );

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    reorderingRowsRef.current = reorderingRows;
  }, [reorderingRows]);

  useEffect(() => {
    if (!tripId) return;
    if (!rows.length) return;
    try {
      sessionStorage.setItem(draftStorageKey, JSON.stringify({ rows, savedAt: Date.now() }));
    } catch {
      // Ignore storage quota/unavailable
    }
    const allSaved = rows.every((r) => rowSignature(r) === lastSavedSignatureRef.current[r.id]);
    if (allSaved) {
      try {
        sessionStorage.removeItem(draftStorageKey);
      } catch {
        // Ignore storage errors
      }
    }
  }, [rows, tripId, draftStorageKey, rowSignature]);

  useEffect(() => {
    const activeIds = new Set(rows.map((r) => r.id));
    for (const [id, timer] of Object.entries(autosaveTimersRef.current)) {
      if (!activeIds.has(id)) {
        clearTimeout(timer);
        delete autosaveTimersRef.current[id];
      }
    }
    for (const row of rows) {
      if (row.id.startsWith("temp-")) continue;
      const sig = rowSignature(row);
      const savedSig = lastSavedSignatureRef.current[row.id];
      if (sig === savedSig) {
        if (autosaveTimersRef.current[row.id]) {
          clearTimeout(autosaveTimersRef.current[row.id]);
          delete autosaveTimersRef.current[row.id];
        }
        continue;
      }
      if (autosaveTimersRef.current[row.id]) clearTimeout(autosaveTimersRef.current[row.id]);
      autosaveTimersRef.current[row.id] = setTimeout(() => {
        delete autosaveTimersRef.current[row.id];
        if (reorderingRowsRef.current) return;
        const latest = rowsRef.current.find((r) => r.id === row.id);
        if (!latest) return;
        const latestSig = rowSignature(latest);
        const latestSavedSig = lastSavedSignatureRef.current[row.id];
        if (latestSig === latestSavedSig) return;
        void patchRow(latest);
      }, 700);
    }
    return () => {
      for (const timer of Object.values(autosaveTimersRef.current)) clearTimeout(timer);
      autosaveTimersRef.current = {};
    };
  }, [rows, rowSignature, patchRow]);

  const openInsertDialog = (position: "before" | "after", relativeRowId: string) => {
    const sorted = [...rowsRef.current].sort((a, b) => a.order_index - b.order_index);
    const relativeIndex = sorted.findIndex((row) => row.id === relativeRowId);
    const insertAt = relativeIndex >= 0 ? (position === "before" ? relativeIndex : relativeIndex + 1) : sorted.length;
    const prevRow = sorted[insertAt - 1];
    const nextRow = sorted[insertAt];
    const minDayIndex = Math.max(1, prevRow?.day_index ?? 1);
    const maxDayIndex = nextRow?.day_index ?? null;
    const relativeRow = sorted[relativeIndex];
    const defaultDayIndex = relativeRow?.day_index ?? relativeRow?.order_index ?? 1;
    const dayIndex = Math.max(minDayIndex, maxDayIndex ? Math.min(defaultDayIndex, maxDayIndex) : defaultDayIndex);
    setInsertDialog({
      open: true,
      position,
      relativeRowId,
      dayIndex,
      customDate: dayIndexToIso(dayIndex),
      minDayIndex,
      maxDayIndex,
    });
  };

  const insertRow = async (position: "before" | "after", relativeRowId: string, dayIndex?: number | null) => {
    const previousRows = rowsRef.current;
    const sorted = [...previousRows].sort((a, b) => a.order_index - b.order_index);
    const relativeIndex = sorted.findIndex((row) => row.id === relativeRowId);
    const insertAt = relativeIndex >= 0 ? (position === "before" ? relativeIndex : relativeIndex + 1) : sorted.length;
    const tempId = `temp-${Date.now()}`;
    const minDayIndex = Math.max(1, sorted[insertAt - 1]?.day_index ?? 1);
    const maxDayIndex = sorted[insertAt]?.day_index ?? null;
    const requestedDayIndex = dayIndex || sorted[Math.max(0, insertAt - 1)]?.day_index || sorted[insertAt]?.day_index || 1;
    const fallbackDayIndex = Math.max(minDayIndex, maxDayIndex ? Math.min(requestedDayIndex, maxDayIndex) : requestedDayIndex);
    const optimisticRow: PlanRow = {
      id: tempId,
      order_index: insertAt,
      day_index: fallbackDayIndex,
      time_text: null,
      location_text: null,
      event_text: null,
      occurrence_details: null,
      staff_instructions: null,
      participant_instructions: null,
      notes: null,
      owner_name: null,
      safety_done: false,
      equipment_done: false,
      prints_done: false,
      notes_done: false,
      details_done: false,
      responsibilities_done: false,
      safety: [],
      equipment: [],
      prints: [],
      tasks: [],
    };
    const optimisticRows = [
      ...sorted.slice(0, insertAt),
      optimisticRow,
      ...sorted.slice(insertAt).map((row) => ({ ...row, order_index: row.order_index + 1 })),
    ];
    setRows(optimisticRows);
    rowsRef.current = optimisticRows;
    setExpandedCols((prev) => ({ ...prev, [tempId]: emptyExpandedCols() }));
    setInsertDialog((prev) => ({ ...prev, open: false }));

    try {
      await flushPendingEdits();
      const res = await fetch(`/api/trips/${tripId}/plan/rows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ position, relative_row_id: relativeRowId, day_index: fallbackDayIndex }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.row) throw new Error(String(payload?.error || "Failed to create row"));
      const serverRow = { ...(payload.row as PlanRow), safety: [], equipment: [], prints: [], tasks: [] };
      lastSavedSignatureRef.current[serverRow.id] = rowSignature(serverRow);
      setRows((prev) => prev.map((row) => (row.id === tempId ? serverRow : row)));
      rowsRef.current = rowsRef.current.map((row) => (row.id === tempId ? serverRow : row));
      setExpandedCols((prev) => {
        const { [tempId]: temp, ...rest } = prev;
        return { ...rest, [serverRow.id]: temp || emptyExpandedCols() };
      });
    } catch {
      setRows(previousRows);
      rowsRef.current = previousRows;
      setExpandedCols((prev) => {
        const next = { ...prev };
        delete next[tempId];
        const rest = next;
        return rest;
      });
    }
  };

  const reorderPlanRows = useCallback(
    async (draggedRowId: string, targetRowId: string) => {
      if (reorderingRows || draggedRowId === targetRowId || draggedRowId.startsWith("temp-")) return;
      const sorted = [...rowsRef.current].sort((a, b) => a.order_index - b.order_index);
      const fromIdx = sorted.findIndex((row) => row.id === draggedRowId);
      const toIdx = sorted.findIndex((row) => row.id === targetRowId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

      const reordered = [...sorted];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      const persistedReordered = reordered.filter((row) => !row.id.startsWith("temp-"));
      const orderById = new Map(reordered.map((row, index) => [row.id, index]));
      const previousRows = rowsRef.current;
      const optimisticRows = previousRows.map((row) =>
        orderById.has(row.id) ? { ...row, order_index: orderById.get(row.id)! } : row,
      );

      setRows(optimisticRows);
      rowsRef.current = optimisticRows;
      setReorderingRows(true);
      try {
        const res = await fetch(`/api/trips/${tripId}/plan/rows/reorder`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ row_ids: persistedReordered.map((row) => row.id) }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(String((payload as { error?: string }).error || "Failed to reorder rows"));
        }
        await flushPendingEdits();
      } catch {
        setRows(previousRows);
        rowsRef.current = previousRows;
      } finally {
        setReorderingRows(false);
        setRowDragId(null);
        setRowDropTargetId(null);
      }
    },
    [reorderingRows, tripId],
  );

  const deleteRow = async (rowId: string) => {
    const previousRows = rowsRef.current;
    const previousSavedSignature = lastSavedSignatureRef.current[rowId];
    const optimisticRows = previousRows
      .filter((row) => row.id !== rowId)
      .sort((a, b) => a.order_index - b.order_index)
      .map((row, idx) => ({ ...row, order_index: idx }));
    setRows(optimisticRows);
    rowsRef.current = optimisticRows;
    delete lastSavedSignatureRef.current[rowId];
    setConfirmDeleteRowId(null);

    try {
      await flushPendingEdits();
      const res = await fetch(`/api/trips/${tripId}/plan/rows/${rowId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete row");
    } catch {
      setRows(previousRows);
      rowsRef.current = previousRows;
      if (previousSavedSignature) lastSavedSignatureRef.current[rowId] = previousSavedSignature;
    }
  };

  const getPrintDraft = (rowId: string) =>
    printDrafts[rowId] || {
      file: null,
      quantity: "",
      print_size: "",
      page_type: "",
      print_location: "",
    };

  const updatePrintDraft = (rowId: string, patch: Partial<ReturnType<typeof getPrintDraft>>) => {
    setPrintDrafts((prev) => ({
      ...prev,
      [rowId]: {
        ...getPrintDraft(rowId),
        ...patch,
      },
    }));
  };

  const addPrintFile = async (rowId: string, options?: { showFollowUpPrompt?: boolean }) => {
    const draft = getPrintDraft(rowId);
    const file = draft.file;
    if (!file) return;
    if (rowId.startsWith("temp-")) {
      setPrintUploadError("יש לשמור את שורת הלו״ז לפני העלאת הדפסה.");
      return;
    }
    await flushPendingEdits();
    setUploadingRowId(rowId);
    setPrintUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("quantity", draft.quantity.trim());
      fd.append("print_size", draft.print_size);
      fd.append("page_type", draft.page_type);
      fd.append("print_location", draft.print_location);
      const res = await authFetch(`/api/trips/${tripId}/plan/rows/${rowId}/prints`, {
        method: "POST",
        body: fd,
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPrintUploadError(payload.error || "העלאת ההדפסה נכשלה");
        return;
      }
      setPrintDrafts((prev) => ({
        ...prev,
        [rowId]: {
          file: null,
          quantity: "",
          print_size: "",
          page_type: "",
          print_location: "",
        },
      }));
      await loadPlan();
      if (options?.showFollowUpPrompt) {
        setPrintQuickDialogRowId(rowId);
        setPrintDialogSavePrompt(true);
      }
    } catch (err) {
      setPrintUploadError(err instanceof Error ? err.message : "העלאת ההדפסה נכשלה");
    } finally {
      setUploadingRowId(null);
    }
  };

  const removePrintFile = async (rowId: string, printId: string) => {
    await flushPendingEdits();
    await fetch(`/api/trips/${tripId}/plan/rows/${rowId}/prints/${printId}`, {
      method: "DELETE",
      credentials: "include",
    });
    await loadPlan();
  };

  const rowsSorted = useMemo(() => [...rows].sort((a, b) => a.order_index - b.order_index), [rows]);
  const documentOverridesByKey = useMemo(
    () => new Map(documentOverrides.map((override) => [override.document_key, override])),
    [documentOverrides],
  );
  const uploadedFilesByDocumentKey = useMemo(
    () =>
      Object.fromEntries(
        documentCatalog.map((document) => {
          const override = documentOverridesByKey.get(document.key);
          return [document.key, getUploadedDocumentFiles(override?.form_data, override?.pdf_url)];
        }),
      ),
    [documentOverridesByKey],
  );
  const documentItems = useMemo(
    () =>
      documentCatalog.map((document) => {
        const override = documentOverridesByKey.get(document.key);
        const uploadedFiles = uploadedFilesByDocumentKey[document.key] || [];
        const readiness = getDocumentReadiness(
          document,
          {
            trip: tripAutofillMeta,
            rows: rowsSorted,
            participantsPayload: documentParticipantsPayload,
            uploadedFilesByDocumentKey,
          },
          override?.form_data,
        );
        const overrideStatus = override?.status === "לא נדרש" ? "לא נדרש" : readiness.status;
        return {
          ...document,
          status: normalizeDocumentStatus(overrideStatus),
          owner: documentOwnerValue(document.key, override?.owner) || (document.key === MOKED_TEVA_DOCUMENT_KEY ? SAFETY_DEPARTMENT_OWNER : ""),
          dataSource: getDocumentDataSourceLabel(document),
          readiness,
          missingFields: readiness.missing,
          note: override?.note || "",
          editUrl: override?.edit_url || document.editUrl?.(tripId) || "",
          pdfUrl: uploadedFiles[0]?.url || override?.pdf_url || "",
          uploadedFiles,
        };
      }),
    [documentOverridesByKey, documentParticipantsPayload, rowsSorted, tripAutofillMeta, tripId, uploadedFilesByDocumentKey],
  );
  const documentSummary = useMemo(
    () => ({
      total: documentItems.length,
      readyPdf: documentItems.filter((item) => item.status === "מוכן PDF" || item.status === "לא נדרש").length,
      inProgress: documentItems.filter((item) => item.status === "לטיפול דחוף" || item.status === "לטיפול" || item.status === "בעבודה").length,
      autoSources: documentItems.filter((item) => item.sourceKind === "auto").length,
    }),
    [documentItems],
  );

  useEffect(() => {
    if (activeQuickAction !== "documents" || !documentItems.length) return;
    const documentKey = window.sessionStorage.getItem(documentsReturnStorageKey);
    if (!documentKey) return;
    const timer = window.setTimeout(() => {
      const row = document.getElementById(`trip-document-row-${documentKey}`);
      row?.scrollIntoView({ block: "center", inline: "nearest" });
      window.sessionStorage.removeItem(documentsReturnStorageKey);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [activeQuickAction, documentItems.length, documentsReturnStorageKey]);

  const openTripDocument = (documentKey: string, editUrl: string) => {
    window.sessionStorage.setItem(documentsReturnStorageKey, documentKey);
    window.sessionStorage.setItem(quickActionFullscreenStorageKey, JSON.stringify(fullscreenQuickActions));
    router.push(editUrl);
  };
  const isColumnOpen = useCallback(
    (col: PlanSection) => rowsSorted.some((row) => Boolean(expandedCols[row.id]?.[col])),
    [expandedCols, rowsSorted],
  );
  const doneKeyBySection: Record<PlanSectionWithDone, keyof PlanRow> = {
    safety: "safety_done",
    equipment: "equipment_done",
    prints: "prints_done",
    notes: "notes_done",
    details: "details_done",
    responsibilities: "responsibilities_done",
  };
  const isSectionDone = (row: PlanRow, section: PlanSectionWithDone) => Boolean(row[doneKeyBySection[section]]);
  const scrollSectionIntoView = useCallback((section: PlanSection) => {
    window.setTimeout(() => {
      const target = tableScrollRef.current?.querySelector<HTMLElement>(`[data-plan-section="${section}"]`);
      target?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }, 80);
  }, []);

  const handleRowFollowUp = useCallback(
    (rowId: string, action: PlanRowFollowUpActionId, meta?: PlanRowFollowUpMeta) => {
      if (action === "responsibility") {
        setPrintQuickDialogRowId(null);
        setPrintDialogSavePrompt(false);
        setExpandedCols((prev) => ({
          ...prev,
          [rowId]: { ...emptyExpandedCols(), ...prev[rowId], responsibilities: true },
        }));
        setResponsibilityDialogRowId(rowId);
        scrollSectionIntoView("responsibilities");
        return;
      }
      if (action === "print") {
        setExpandedCols((prev) => ({
          ...prev,
          [rowId]: { ...emptyExpandedCols(), ...prev[rowId], prints: true },
        }));
        setPrintQuickDialogRowId(rowId);
        setPrintDialogSavePrompt(false);
        if (meta?.taskText) {
          updatePrintDraft(rowId, { page_type: meta.taskText });
        }
        scrollSectionIntoView("prints");
        return;
      }
      setPrintQuickDialogRowId(null);
      setPrintDialogSavePrompt(false);
      setExpandedCols((prev) => ({
        ...prev,
        [rowId]: { ...emptyExpandedCols(), ...prev[rowId], details: true },
      }));
      setRowFollowUp({ rowId, action });
      scrollSectionIntoView("details");
    },
    // updatePrintDraft is stable for the page lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scrollSectionIntoView],
  );

  const goToSafetyColumn = useCallback(() => {
    setActiveQuickAction(null);
    setActiveTab("schedule");
    setExpandedCols((prev) => {
      const targetRow = rowsSorted.find((row) => !row.safety_done) || rowsSorted[0];
      if (!targetRow) return prev;
      const next = { ...prev };
      next[targetRow.id] = { ...next[targetRow.id], safety: true };
      return next;
    });
    scrollSectionIntoView("safety");
  }, [rowsSorted, scrollSectionIntoView]);

  useEffect(() => {
    if (focusParam !== "safety" || !rowsSorted.length) return;
    goToSafetyColumn();
    router.replace(`/dashboard/trip/${tripId}/plan`, { scroll: false });
  }, [focusParam, goToSafetyColumn, router, rowsSorted.length, tripId]);

  const markSectionDone = (rowId: string, section: PlanSectionWithDone, done = true) => {
    const doneKey = doneKeyBySection[section];
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, [doneKey]: done } : row)));
    setTimeout(() => {
      void saveRowById(rowId);
    }, 0);
  };
  const equipmentQuantityUnits = ["יחידה", "חבילה", "ארגז", "מטר", "קילו", "ליטר", "אחר"];
  const equipmentSourceSuggestions = useMemo(() => {
    const existing = new Set<string>();
    const purchase = new Set<string>();
    const all = new Set<string>();
    for (const row of rows) {
      for (const item of row.equipment || []) {
        const value = String(item.source_details || "").trim();
        if (!value) continue;
        all.add(value);
        const sourceType = item.source_type === "מקור" ? "קיים" : item.source_type;
        if (sourceType === "רכש") purchase.add(value);
        if (sourceType === "קיים") existing.add(value);
      }
    }
    return {
      existing: [...existing].sort((a, b) => a.localeCompare(b, "he")),
      purchase: [...purchase].sort((a, b) => a.localeCompare(b, "he")),
      all: [...all].sort((a, b) => a.localeCompare(b, "he")),
    };
  }, [rows]);
  const printLocationSuggestions = useMemo(() => {
    const values = new Set<string>();
    for (const row of rows) {
      for (const item of row.prints || []) {
        const value = String(item.print_location || "").trim();
        if (value) values.add(value);
      }
    }
    for (const draft of Object.values(printDrafts)) {
      const value = String(draft.print_location || "").trim();
      if (value) values.add(value);
    }
    return [...values].sort((a, b) => a.localeCompare(b, "he"));
  }, [rows, printDrafts]);
  const getDayDisplay = useCallback(
    (dayIndex?: number | null) => {
      if (!tripStartDate || !dayIndex) return { greg: "", heb: "" };
      const start = new Date(tripStartDate);
      if (Number.isNaN(start.getTime())) return { greg: "", heb: "" };
      const target = new Date(start);
      target.setDate(start.getDate() + dayIndex - 1);
      const yyyy = target.getFullYear();
      const mm = String(target.getMonth() + 1).padStart(2, "0");
      const dd = String(target.getDate()).padStart(2, "0");
      const iso = `${yyyy}-${mm}-${dd}`;
      return {
        greg: target.toLocaleDateString("he-IL"),
        heb: formatHebrewDate(iso),
      };
    },
    [tripStartDate],
  );
  const assigneeBoards = useMemo(
    () => buildAssigneeBoards(rowsSorted, (dayIndex) => getDayDisplay(dayIndex)),
    [rowsSorted, getDayDisplay],
  );
  const riskItems = useMemo(() => {
    const items: Array<{
      key: string;
      occurrence: string;
      rowLabel: string;
      risk: string;
      riskLevelBefore: number | null;
      likelihoodBefore: number | null;
      mitigation: string;
      riskLevelAfter: number | null;
      likelihoodAfter: number | null;
      owner: string;
    }> = [];
    for (const row of rowsSorted) {
      const day = getDayDisplay(row.day_index ?? row.order_index + 1);
      const rowLabel = [day.greg, row.time_text, row.location_text].map((part) => String(part || "").trim()).filter(Boolean).join(" · ");
      for (const [idx, safety] of (row.safety || []).entries()) {
        const hasContent = Boolean(
          String(safety.risk || "").trim() ||
            String(safety.mitigation || "").trim() ||
            String(safety.owner || "").trim() ||
            safety.risk_level_before ||
            safety.likelihood_before ||
            safety.risk_level_after ||
            safety.likelihood_after,
        );
        if (!hasContent) continue;
        items.push({
          key: safety.id || `${row.id}-${idx}`,
          occurrence: row.event_text || row.location_text || "התרחשות ללא פירוט",
          rowLabel,
          risk: safety.risk || "",
          riskLevelBefore: safety.risk_level_before ?? null,
          likelihoodBefore: safety.likelihood_before ?? null,
          mitigation: safety.mitigation || "",
          riskLevelAfter: safety.risk_level_after ?? null,
          likelihoodAfter: safety.likelihood_after ?? null,
          owner: safety.owner || "",
        });
      }
    }
    return items;
  }, [getDayDisplay, rowsSorted]);
  const riskSummary = useMemo(
    () => ({
      total: riskItems.length,
      high: riskItems.filter((item) => item.riskLevelAfter === 5 || item.likelihoodAfter === 5 || item.riskLevelBefore === 5 || item.likelihoodBefore === 5).length,
      withoutMitigation: riskItems.filter((item) => !item.mitigation.trim()).length,
      withoutOwner: riskItems.filter((item) => !item.owner.trim()).length,
    }),
    [riskItems],
  );
  const equipmentItems = useMemo(() => {
    const items: Array<{
      key: string;
      equipmentId?: string;
      occurrence: string;
      rowLabel: string;
      item: string;
      quantity: string;
      quantityUnit: string;
      sourceType: string;
      sourceDetails: string;
      status: string;
    }> = [];
    const overrideByEquipment = new Map(purchaseOverrides.map((override) => [override.equipment_id, override]));
    for (const row of rowsSorted) {
      const day = getDayDisplay(row.day_index ?? row.order_index + 1);
      const rowLabel = [day.greg, row.time_text, row.location_text].map((part) => String(part || "").trim()).filter(Boolean).join(" · ");
      for (const [idx, equipment] of (row.equipment || []).entries()) {
        const hasContent = Boolean(
          String(equipment.item || "").trim() ||
            String(equipment.quantity || "").trim() ||
            String(equipment.quantity_unit || "").trim() ||
            String(equipment.source_type || "").trim() ||
            String(equipment.source_details || "").trim(),
        );
        if (!hasContent) continue;
        const sourceType = equipment.source_type === "מקור" ? "קיים" : equipment.source_type || "";
        const override = equipment.id ? overrideByEquipment.get(equipment.id) : undefined;
        items.push({
          key: equipment.id || `${row.id}-${idx}`,
          equipmentId: equipment.id,
          occurrence: row.event_text || row.location_text || "התרחשות ללא פירוט",
          rowLabel,
          item: equipment.item || "",
          quantity: equipment.quantity || "",
          quantityUnit: equipment.quantity_unit || "",
          sourceType,
          sourceDetails: equipment.source_details || "",
          status: override?.status || "",
        });
      }
    }
    return items;
  }, [getDayDisplay, purchaseOverrides, rowsSorted]);
  const equipmentSummary = useMemo(
    () => ({
      total: equipmentItems.length,
      existing: equipmentItems.filter((item) => item.sourceType === "קיים").length,
      purchase: equipmentItems.filter((item) => item.sourceType === "רכש").length,
      missingSource: equipmentItems.filter((item) => !item.sourceType.trim() || !item.sourceDetails.trim()).length,
    }),
    [equipmentItems],
  );
  const printItems = useMemo(() => {
    const items: Array<{
      key: string;
      rowId: string;
      occurrence: string;
      rowLabel: string;
      fileName: string;
      quantity: number | null;
      printSize: string;
      pageType: string;
      printLocation: string;
      fileSize: string;
      notes: string;
      status: string;
    }> = [];
    for (const row of rowsSorted) {
      const day = getDayDisplay(row.day_index ?? row.order_index + 1);
      const rowLabel = [day.greg, row.time_text, row.location_text].map((part) => String(part || "").trim()).filter(Boolean).join(" · ");
      for (const print of row.prints || []) {
        items.push({
          key: print.id,
          rowId: row.id,
          occurrence: row.event_text || row.location_text || "התרחשות ללא פירוט",
          rowLabel,
          fileName: print.file_name || "קובץ ללא שם",
          quantity: print.quantity ?? null,
          printSize: print.print_size || "",
          pageType: print.page_type || "",
          printLocation: print.print_location || "",
          fileSize: bytesLabel(print.file_size_bytes),
          notes: print.notes || "",
          status: print.status || "",
        });
      }
    }
    return items;
  }, [getDayDisplay, rowsSorted]);
  const printSummary = useMemo(
    () => ({
      total: printItems.length,
      copies: printItems.reduce((total, item) => total + (typeof item.quantity === "number" ? item.quantity : 0), 0),
      locations: new Set(printItems.map((item) => item.printLocation.trim()).filter(Boolean)).size,
      missingLocation: printItems.filter((item) => !item.printLocation.trim()).length,
    }),
    [printItems],
  );
  const printShopNamesFromPrints = useMemo(
    () => Array.from(new Set(printItems.map((item) => item.printLocation.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "he")),
    [printItems],
  );
  const printShopsByName = useMemo(() => new Map(printShops.map((printShop) => [printShop.name, printShop])), [printShops]);
  const printShopStats = useMemo(() => {
    const stats = new Map<string, { files: number; copies: number }>();
    for (const item of printItems) {
      const name = item.printLocation.trim();
      if (!name) continue;
      const current = stats.get(name) || { files: 0, copies: 0 };
      stats.set(name, { files: current.files + 1, copies: current.copies + (typeof item.quantity === "number" ? item.quantity : 0) });
    }
    return stats;
  }, [printItems]);
  const purchaseItems = useMemo(() => {
    const items: Array<{
      key: string;
      equipmentId?: string;
      item: string;
      quantity: string;
      quantityUnit: string;
      supplier: string;
      rowLabel: string;
      status: string;
      owner: string;
      unitPrice: string;
      totalPrice: number;
    }> = [];
    const overrideByEquipment = new Map(purchaseOverrides.map((override) => [override.equipment_id, override]));
    for (const row of rowsSorted) {
      const day = getDayDisplay(row.day_index ?? row.order_index + 1);
      const rowLabel = [day.greg, row.time_text, row.location_text].map((part) => String(part || "").trim()).filter(Boolean).join(" · ");
      for (const [idx, equipment] of (row.equipment || []).entries()) {
        const sourceType = equipment.source_type === "מקור" ? "קיים" : equipment.source_type;
        if (sourceType !== "רכש") continue;
        const override = equipment.id ? overrideByEquipment.get(equipment.id) : undefined;
        const quantityNumber = parseMoneyNumber(equipment.quantity || "");
        const unitPrice = override?.unit_price ?? "";
        const unitPriceNumber = parseMoneyNumber(unitPrice);
        items.push({
          key: equipment.id || `${row.id}-${idx}`,
          equipmentId: equipment.id,
          item: equipment.item || "",
          quantity: equipment.quantity || "",
          quantityUnit: equipment.quantity_unit || "",
          supplier: equipment.source_details || "",
          rowLabel,
          status: override?.status || "",
          owner: override?.owner || "",
          unitPrice: unitPrice === null ? "" : String(unitPrice),
          totalPrice: quantityNumber * unitPriceNumber,
        });
      }
    }
    return items;
  }, [getDayDisplay, purchaseOverrides, rowsSorted]);
  const purchaseTotalCost = useMemo(() => purchaseItems.reduce((total, item) => total + item.totalPrice, 0), [purchaseItems]);
  const supplierNamesFromPurchases = useMemo(
    () => Array.from(new Set(purchaseItems.map((item) => item.supplier.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "he")),
    [purchaseItems],
  );
  const suppliersByName = useMemo(() => new Map(suppliers.map((supplier) => [supplier.name, supplier])), [suppliers]);
  const supplierPurchaseStats = useMemo(() => {
    const stats = new Map<string, { count: number; total: number }>();
    for (const item of purchaseItems) {
      const supplier = item.supplier.trim();
      if (!supplier) continue;
      const current = stats.get(supplier) || { count: 0, total: 0 };
      stats.set(supplier, { count: current.count + 1, total: current.total + item.totalPrice });
    }
    return stats;
  }, [purchaseItems]);
  const purchaseItemsByEquipmentId = useMemo(
    () => new Map(purchaseItems.filter((item) => item.equipmentId).map((item) => [String(item.equipmentId), item])),
    [purchaseItems],
  );
  const invoiceTotalAmount = useMemo(() => invoices.reduce((total, invoice) => total + parseMoneyNumber(invoice.amount), 0), [invoices]);
  const unlinkedInvoiceCount = useMemo(() => invoices.filter((invoice) => !String(invoice.equipment_id || "").trim()).length, [invoices]);
  const pendingInvoiceCount = useMemo(() => invoices.filter((invoice) => (invoice.submission_status || "draft") !== "sent").length, [invoices]);
  const fieldClass =
    "rounded-lg border border-gray-200 bg-white px-2 text-center align-middle leading-normal placeholder:text-center [align-content:center] focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100";

  const dateToDayIndex = (dateValue: string) => {
    if (!tripStartDate || !dateValue) return null;
    const start = new Date(tripStartDate);
    const target = new Date(dateValue);
    if (Number.isNaN(start.getTime()) || Number.isNaN(target.getTime())) return null;
    return Math.round((target.getTime() - start.getTime()) / 86_400_000) + 1;
  };
  const dayIndexToIso = (dayIndex?: number | null) => {
    if (!tripStartDate || !dayIndex) return "";
    const start = new Date(tripStartDate);
    if (Number.isNaN(start.getTime())) return "";
    const target = new Date(start);
    target.setDate(start.getDate() + dayIndex - 1);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const dayOptions = useMemo(() => {
    const values = new Set(rowsSorted.map((row) => row.day_index ?? row.order_index + 1).filter((value) => value > 0));
    values.add(1);
    return [...values].sort((a, b) => a - b);
  }, [rowsSorted]);
  const isDayAllowedForInsert = (dayIndex: number) =>
    dayIndex >= insertDialog.minDayIndex && (insertDialog.maxDayIndex === null || dayIndex <= insertDialog.maxDayIndex);
  const clampInsertDayIndex = (dayIndex: number) =>
    Math.max(insertDialog.minDayIndex, insertDialog.maxDayIndex === null ? dayIndex : Math.min(dayIndex, insertDialog.maxDayIndex));

  const toggleRowCol = (rowId: string, col: PlanSection) => {
    const wasOpen = Boolean(expandedCols[rowId]?.[col]);
    setExpandedCols((prev) => ({
      ...prev,
      [rowId]: {
        ...emptyExpandedCols(),
        ...prev[rowId],
        [col]: !prev[rowId]?.[col],
      },
    }));
    if (!wasOpen) scrollSectionIntoView(col);
  };

  const toggleAllInColumn = (col: PlanSection) => {
    const hasRows = rowsSorted.length > 0;
    if (!hasRows) return;
    const allOpen = rowsSorted.every((r) => Boolean(expandedCols[r.id]?.[col]));
    setExpandedCols((prev) => {
      const next = { ...prev };
      for (const row of rowsSorted) {
        const current = next[row.id] || emptyExpandedCols();
        next[row.id] = { ...current, [col]: !allOpen };
      }
      return next;
    });
    if (!allOpen) scrollSectionIntoView(col);
  };

  const toMinutes = (value: string | null | undefined) => {
    const v = String(value || "").trim();
    if (!v) return null;
    const m = /^(\d{2}):(\d{2})$/.exec(v);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };

  const getSafetyToneClass = (s: PlanRow["safety"][number]) => {
    const hasAfterScore = typeof s.risk_level_after === "number" && typeof s.likelihood_after === "number";
    const level = hasAfterScore ? s.risk_level_after : s.risk_level_before;
    const like = hasAfterScore ? s.likelihood_after : s.likelihood_before;
    if (typeof level !== "number" || typeof like !== "number") {
      return s.risk || s.mitigation || s.owner ? "bg-red-50/60 border-red-100" : "bg-white";
    }
    if (level === 5 || like === 5) return "bg-red-50 border-red-200";
    if (level <= 2 && like <= 2) return "bg-emerald-50 border-emerald-200";
    return hasAfterScore ? "bg-amber-50 border-amber-200" : "bg-orange-50 border-orange-200";
  };

  const getRiskScoreButtonClass = (value: number, selected: boolean) => {
    const tones: Record<number, { selected: string; idle: string }> = {
      1: {
        selected: "bg-emerald-500 text-white border-emerald-500 shadow-sm",
        idle: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
      },
      2: {
        selected: "bg-lime-500 text-white border-lime-500 shadow-sm",
        idle: "bg-lime-50 text-lime-700 border-lime-200 hover:bg-lime-100",
      },
      3: {
        selected: "bg-amber-400 text-white border-amber-400 shadow-sm",
        idle: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
      },
      4: {
        selected: "bg-orange-500 text-white border-orange-500 shadow-sm",
        idle: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
      },
      5: {
        selected: "bg-red-500 text-white border-red-500 shadow-sm",
        idle: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
      },
    };
    return selected ? tones[value].selected : tones[value].idle;
  };

  const getEquipmentSourceButtonClass = (option: string, selected: boolean) => {
    if (option === "קיים") {
      return selected
        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
        : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100";
    }
    if (option === "רכש") {
      return selected
        ? "bg-sky-500 text-white border-sky-500 shadow-sm"
        : "bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100";
    }
    return selected ? "bg-brand-cyan text-white border-brand-cyan" : "bg-gray-50 text-gray-600 hover:bg-gray-100";
  };

  const openRiskDialog = (
    rowId: string,
    safetyIndex: number,
    stage: "before" | "after",
    riskText: string,
    mitigationText: string,
    current: PlanRow["safety"][number],
  ) => {
    setRiskDialog({
      open: true,
      rowId,
      safetyIndex,
      stage,
      riskText: riskText || "סיכון ללא תיאור",
      mitigationText: mitigationText || "",
      riskLevel: stage === "before" ? current.risk_level_before ?? null : current.risk_level_after ?? null,
      likelihood: stage === "before" ? current.likelihood_before ?? null : current.likelihood_after ?? null,
    });
  };

  const saveRiskDialog = async () => {
    if (!riskDialog.open || !riskDialog.rowId || riskDialog.safetyIndex < 0) return;
    const row = rows.find((r) => r.id === riskDialog.rowId);
    if (!row) return;
    const nextSafety = row.safety.map((s, idx) => {
      if (idx !== riskDialog.safetyIndex) return s;
      if (riskDialog.stage === "before") {
        return {
          ...s,
          risk_level_before: riskDialog.riskLevel,
          likelihood_before: riskDialog.likelihood,
        };
      }
      return {
        ...s,
        risk_level_after: riskDialog.riskLevel,
        likelihood_after: riskDialog.likelihood,
      };
    });
    const nextRow = { ...row, safety: nextSafety };
    setRows((prev) => prev.map((r) => (r.id === row.id ? nextRow : r)));
    setRiskDialog((prev) => ({ ...prev, open: false }));
    await patchRow(nextRow);
  };

  const normalizeTimeInput = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  };

  const autoResizeRiskTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    const minHeight = 56; // about 2 lines
    const maxHeight = 156; // about 6 lines
    el.style.height = "auto";
    const next = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  const autoResizeNotesTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    const minHeight = 56; // about 2 lines
    const maxHeight = 156; // about 6 lines
    el.style.height = "auto";
    const next = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  const validateRowTime = (row: PlanRow) => {
    const current = toMinutes(row.time_text);
    if (current === null) {
      setTimeErrors((prev) => ({ ...prev, [row.id]: "" }));
      return true;
    }
    const prevSameDay = rowsSorted
      .filter((r) => r.id !== row.id && (r.day_index ?? 1) === (row.day_index ?? 1) && r.order_index < row.order_index)
      .sort((a, b) => b.order_index - a.order_index)[0];
    const prevMinutes = toMinutes(prevSameDay?.time_text);
    if (prevMinutes !== null && current < prevMinutes) {
      setTimeErrors((prev) => ({ ...prev, [row.id]: "השעה חייבת להיות אחרי השורה הקודמת באותו יום" }));
      return false;
    }
    setTimeErrors((prev) => ({ ...prev, [row.id]: "" }));
    return true;
  };

  const isQuickActionFullscreen = (actionId: QuickActionSurfaceId) => Boolean(fullscreenQuickActions[actionId]);
  const toggleQuickActionFullscreen = (actionId: QuickActionSurfaceId) => {
    setFullscreenQuickActions((prev) => {
      const next = { ...prev, [actionId]: !prev[actionId] };
      window.sessionStorage.setItem(quickActionFullscreenStorageKey, JSON.stringify(next));
      return next;
    });
  };
  const quickActionShellClass = (actionId: QuickActionSurfaceId) =>
    `fixed inset-0 z-[220] flex items-stretch justify-center ${
      isQuickActionFullscreen(actionId) ? "p-0" : "p-3 pt-20 md:px-8 md:pb-6"
    }`;
  const quickActionSubDialogShellClass = (actionId: QuickActionSurfaceId) =>
    `absolute inset-0 z-[230] flex items-center justify-center ${isQuickActionFullscreen(actionId) ? "p-0" : "p-4"}`;
  const quickActionPanelClass = (actionId: QuickActionSurfaceId, borderClass: string) =>
    `relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl ${
      isQuickActionFullscreen(actionId) ? "max-w-none rounded-none border-0" : `max-w-7xl rounded-[2rem] border ${borderClass}`
    }`;
  const quickActionSubDialogPanelClass = (actionId: QuickActionSurfaceId, borderClass: string) =>
    `relative flex w-full flex-col overflow-hidden bg-white shadow-2xl ${
      isQuickActionFullscreen(actionId) ? "h-full max-w-none rounded-none border-0" : `max-h-[90%] max-w-5xl rounded-3xl border ${borderClass}`
    }`;
  const renderQuickActionFullscreenButton = (actionId: QuickActionSurfaceId, label: string) => {
    const fullscreen = isQuickActionFullscreen(actionId);
    const Icon = fullscreen ? Minimize2 : Maximize2;
    return (
      <button
        type="button"
        onClick={() => toggleQuickActionFullscreen(actionId)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-800"
        aria-label={fullscreen ? `הקטן ${label}` : `הגדל ${label} למסך מלא`}
      >
        <Icon size={17} />
      </button>
    );
  };

  if (userLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-cyan" size={40} />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 md:p-8 pb-28">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-gray-800">{PLAN_TRIP_PAGE_TITLE}</h1>
            <div className="text-xs text-gray-500">{tripName}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setTourPickerOpen(true)}>
              <Info size={14} />
              הדרכה
            </Button>
            <Button variant="outline" onClick={() => router.push(`/dashboard/trip/${tripId}`)}>
              <ArrowRight size={14} />
              לפרטי טיול
            </Button>
          </div>
        </div>

        <div
          data-plan-tour="planner-tabs"
          className="relative flex flex-col gap-2 overflow-visible rounded-t-3xl bg-slate-100/70 px-2 pt-3 md:flex-row md:items-end md:justify-between"
        >
          <div className="flex min-w-0 overflow-visible pr-3">
            {plannerTabs.map(({ id, label, Icon }, index) => {
              const active = activeTab === id;
              const tabText = active ? "text-brand-cyan" : "text-gray-500 hover:text-gray-800";
              return (
                <button
                  key={id}
                  type="button"
                  data-plan-tour={`planner-tab-${id}`}
                  onClick={() => setActiveTab(id)}
                  style={{ zIndex: active ? 30 : 10 - index }}
                  className={`relative -mb-[2px] -mr-5 inline-flex h-12 shrink-0 items-center justify-center px-9 text-sm font-black transition-all first:mr-0 ${tabText}`}
                >
                  <svg
                    aria-hidden="true"
                    className={`absolute inset-0 h-full w-full overflow-visible ${active ? "" : "drop-shadow-[0_8px_16px_rgba(15,23,42,0.10)]"}`}
                    preserveAspectRatio="none"
                    viewBox="0 0 220 48"
                  >
                    <path
                      d="M24 1 C14 1 9 6 7 16 L0 48 H220 L213 16 C211 6 206 1 196 1 Z"
                      fill={active ? "#ffffff" : "rgba(255,255,255,0.68)"}
                      stroke={active ? "#ffffff" : "rgba(255,255,255,0.8)"}
                      strokeWidth="1"
                    />
                  </svg>
                  <span className="relative z-10 inline-flex items-center gap-2">
                    <Icon size={16} />
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
          <div data-plan-tour="quick-actions" className="flex flex-wrap justify-end gap-1 pb-2 md:pb-3">
            {quickActionButtons.map(({ id, label, Icon }) => (
              <Tooltip key={label} label={label}>
                <button
                  type="button"
                  data-plan-tour={`quick-action-${id}`}
                  onClick={() => openQuickAction(id)}
                  aria-label={label}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:border-cyan-200 hover:bg-cyan-50 hover:text-brand-cyan"
                >
                  <Icon size={16} />
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        {activeTab === "schedule" ? (
        <div
          data-plan-tour="schedule-table"
          className="relative z-20 -mt-px overflow-visible rounded-b-2xl border border-t-0 border-gray-200 bg-white shadow-[0_-14px_28px_rgba(15,23,42,0.16),0_20px_45px_rgba(15,23,42,0.10)]"
        >
        <div
          ref={tableScrollRef}
          className={`max-w-full overflow-x-auto overflow-y-visible overscroll-x-contain rounded-b-2xl ${
            tablePanDragging ? "cursor-grabbing select-none" : "cursor-grab"
          }`}
          onMouseDown={(e) => {
            if (!tableScrollRef.current) return;
            const target = e.target as HTMLElement;
            if (target.closest("input,textarea,button,label,a")) return;
            e.preventDefault();
            setTablePanDragging(true);
            setTablePanStart({
              x: e.clientX,
              y: e.clientY,
              left: tableScrollRef.current.scrollLeft,
              top: 0,
            });
          }}
          onMouseMove={(e) => {
            if (!tablePanDragging || !tablePanStart || !tableScrollRef.current) return;
            e.preventDefault();
            tableScrollRef.current.scrollLeft = tablePanStart.left - (e.clientX - tablePanStart.x);
          }}
          onMouseUp={() => {
            setTablePanDragging(false);
            setTablePanStart(null);
          }}
          onMouseLeave={() => {
            setTablePanDragging(false);
            setTablePanStart(null);
          }}
        >
          <table
            className={`w-full text-center text-xs ${
              isColumnOpen("details") ||
              isColumnOpen("responsibilities") ||
              isColumnOpen("safety") ||
              isColumnOpen("equipment") ||
              isColumnOpen("prints") ||
              isColumnOpen("notes")
                ? "min-w-[2060px]"
                : "min-w-[1180px]"
            }`}
          >
            <thead className="sticky top-0 z-30 border-b border-gray-200 bg-gradient-to-b from-slate-50 to-slate-100 shadow-sm">
              <tr className="font-black text-gray-700">
                <th
                  data-plan-tour="col-date"
                  className="sticky top-0 z-30 bg-slate-100 p-2 text-center"
                  title="גרור בעמודה זו לשינוי סדר השורות"
                >
                  תאריך
                </th>
                <th data-plan-tour="col-time" className="sticky top-0 z-30 bg-slate-100 p-2 text-center">
                  שעה
                </th>
                <th data-plan-tour="col-location" className="sticky top-0 z-30 bg-slate-100 p-2 text-center">
                  מיקום מפורט
                </th>
                <th data-plan-tour="col-event" className="sticky top-0 z-30 bg-slate-100 p-2 text-center">
                  התרחשות
                </th>
                <th
                  data-plan-tour="col-details"
                  data-plan-section="details"
                  className={`sticky top-0 z-30 bg-slate-100 p-2 text-center ${
                    isColumnOpen("details") ? "min-w-[320px] w-[320px]" : "min-w-[64px] w-[64px]"
                  }`}
                >
                  <Tooltip label="פתח/סגור את עמודת פירוט התרחשות" side="bottom">
                    <button
                      type="button"
                      onClick={() => toggleAllInColumn("details")}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/70"
                    >
                      <FileText size={14} className="inline-block" />
                      פירוט
                    </button>
                  </Tooltip>
                </th>
                <th
                  data-plan-tour="col-safety"
                  data-plan-section="safety"
                  className={`sticky top-0 z-30 bg-slate-100 p-2 text-center ${
                    isColumnOpen("safety") ? "min-w-[440px] w-[440px]" : "min-w-[64px] w-[64px]"
                  }`}
                >
                  <Tooltip label="פתח/סגור את כל עמודת בטיחות" side="bottom">
                    <button
                      type="button"
                      onClick={() => toggleAllInColumn("safety")}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/70"
                    >
                      <ShieldAlert size={14} className="inline-block" />
                      בטיחות
                    </button>
                  </Tooltip>
                </th>
                <th
                  data-plan-tour="col-equipment"
                  data-plan-section="equipment"
                  className={`sticky top-0 z-30 bg-slate-100 p-2 text-center ${
                    isColumnOpen("equipment") ? "min-w-[620px] w-[620px]" : "min-w-[64px] w-[64px]"
                  }`}
                >
                  <Tooltip label="פתח/סגור את כל עמודת ציוד" side="bottom">
                    <button
                      type="button"
                      onClick={() => toggleAllInColumn("equipment")}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/70"
                    >
                      <Backpack size={14} className="inline-block" />
                      ציוד
                    </button>
                  </Tooltip>
                </th>
                <th
                  data-plan-tour="col-prints"
                  data-plan-section="prints"
                  className={`sticky top-0 z-30 bg-slate-100 p-2 text-center ${
                    isColumnOpen("prints") ? "min-w-[440px] w-[440px]" : "min-w-[64px] w-[64px]"
                  }`}
                >
                  <Tooltip label="פתח/סגור את כל עמודת הדפסות" side="bottom">
                    <button
                      type="button"
                      onClick={() => toggleAllInColumn("prints")}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/70"
                    >
                      <Printer size={14} className="inline-block" />
                      הדפסות
                    </button>
                  </Tooltip>
                </th>
                <th
                  data-plan-tour="col-notes"
                  data-plan-section="notes"
                  className={`sticky top-0 z-30 bg-slate-100 p-2 text-center ${
                    isColumnOpen("notes") ? "min-w-[190px] w-[190px]" : "min-w-[64px] w-[64px]"
                  }`}
                >
                  <Tooltip label="פתח/סגור את כל עמודת הערות" side="bottom">
                    <button
                      type="button"
                      onClick={() => toggleAllInColumn("notes")}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/70"
                    >
                      <StickyNote size={14} className="inline-block" />
                      הערות
                    </button>
                  </Tooltip>
                </th>
                <th
                  data-plan-tour="col-responsibilities"
                  data-plan-section="responsibilities"
                  className={`sticky top-0 z-30 bg-slate-100 p-2 text-center ${
                    isColumnOpen("responsibilities") ? "min-w-[260px] w-[260px]" : "min-w-[64px] w-[64px]"
                  }`}
                >
                  <Tooltip label="פתח/סגור את עמודת באחריות" side="bottom">
                    <button
                      type="button"
                      onClick={() => toggleAllInColumn("responsibilities")}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/70"
                    >
                      <UserRound size={14} className="inline-block" />
                      באחריות
                    </button>
                  </Tooltip>
                </th>
                <th data-plan-tour="col-actions" className="sticky top-0 z-30 bg-slate-100 p-2 text-center">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody>
              {rowsSorted.length > 0 ? (
                <tr className="bg-transparent">
                  <td className="h-4 p-0 align-middle text-center">
                    <div className="relative h-4 group/day-gap">
                      <span className="pointer-events-none absolute left-3 right-3 top-1/2 -translate-y-1/2 border-t border-gray-200" />
                      <button
                        type="button"
                        onClick={() => openInsertDialog("before", rowsSorted[0].id)}
                        className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm opacity-0 pointer-events-none transition-opacity duration-150 hover:bg-gray-50 hover:border-gray-300 group-hover/day-gap:opacity-100 group-hover/day-gap:pointer-events-auto group-focus-within/day-gap:opacity-100 group-focus-within/day-gap:pointer-events-auto"
                        data-tooltip="הוסף שורה לפני השורה הראשונה"
                        aria-label="הוסף שורה לפני השורה הראשונה"
                      >
                        <Plus size={12} className="mx-auto" />
                      </button>
                    </div>
                  </td>
                  <td colSpan={10} className="py-1" />
                </tr>
              ) : null}
              {rowsSorted.map((row, idx) => (
                <React.Fragment key={row.id}>
                <tr
                  className={`group align-middle border-b border-gray-100 odd:bg-white even:bg-slate-50/50 ${
                    rowDragId === row.id ? "opacity-60" : ""
                  } ${rowDropTargetId === row.id ? "bg-cyan-50/80" : ""}`}
                >
                  <td
                    className="p-2 align-middle"
                    onDragOver={(event) => {
                      if (!rowDragId || rowDragId === row.id || row.id.startsWith("temp-")) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setRowDropTargetId(row.id);
                    }}
                    onDragLeave={() => {
                      if (rowDropTargetId === row.id) setRowDropTargetId(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!rowDragId) return;
                      void reorderPlanRows(rowDragId, row.id);
                    }}
                  >
                    <div
                      draggable={!row.id.startsWith("temp-") && !reorderingRows}
                      onMouseDown={(event) => event.stopPropagation()}
                      onDragStart={(event) => {
                        if (row.id.startsWith("temp-") || reorderingRows) {
                          event.preventDefault();
                          return;
                        }
                        event.stopPropagation();
                        setRowDragId(row.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", row.id);
                      }}
                      onDragEnd={() => {
                        setRowDragId(null);
                        setRowDropTargetId(null);
                      }}
                      className={`mt-1 rounded-xl px-1 py-1 text-center text-xs font-bold text-gray-600 ${
                        row.id.startsWith("temp-") ? "" : "cursor-grab active:cursor-grabbing hover:bg-slate-100/80"
                      }`}
                      title={row.id.startsWith("temp-") ? undefined : "גרור לשינוי מיקום השורה"}
                    >
                      {(() => {
                        const day = getDayDisplay(row.day_index ?? row.order_index + 1);
                        return (
                          <>
                            <div className="inline-flex items-center justify-center gap-1 font-black text-gray-800">
                              {!row.id.startsWith("temp-") ? <GripVertical size={12} className="text-gray-400" /> : null}
                              <CalendarDays size={10} />
                              {day.greg || "—"}
                            </div>
                            <div>{day.heb || "—"}</div>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="p-2 align-middle">
                    <div className="relative w-28 mx-auto">
                      <input
                        type="text"
                        value={row.time_text || ""}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, time_text: normalizeTimeInput(e.target.value) } : r,
                            ),
                          )
                        }
                        onBlur={() => {
                          const latest = rowsRef.current.find((r) => r.id === row.id);
                          if (!latest) return;
                          if (validateRowTime(latest)) void saveRowById(row.id);
                        }}
                        className={`h-9 w-28 mx-auto block text-sm font-bold ${fieldClass} ${timeErrors[row.id] ? "border-red-300 ring-1 ring-red-100" : ""}`}
                        placeholder="HH:MM"
                        inputMode="numeric"
                      />
                      {!row.time_text ? (
                        <Clock3 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      ) : null}
                    </div>
                    {timeErrors[row.id] ? <div className="text-[10px] text-red-600 mt-1">{timeErrors[row.id]}</div> : null}
                  </td>
                  <td className="p-2 align-middle">
                    <div className="space-y-1">
                      <textarea
                        value={row.location_text || ""}
                        onChange={(e) => {
                          const location_text = e.target.value;
                          const detection = detectSensitiveLocation(location_text);
                          setRows((prev) =>
                            prev.map((r) =>
                              r.id === row.id
                                ? {
                                    ...r,
                                    location_text,
                                    ...(detection.sensitive ? {} : { location_sensitive: false }),
                                  }
                                : r,
                            ),
                          );
                        }}
                        onBlur={() => handleRowLocationBlur(row.id)}
                        className={`w-36 min-h-[70px] p-2 resize-none text-sm font-bold ${fieldClass}`}
                      />
                      {row.location_sensitive ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-black text-orange-800">
                          <AlertTriangle size={10} />
                          אזור רגיש
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-2 align-middle">
                    <textarea
                      value={row.event_text || ""}
                      onChange={(e) =>
                        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, event_text: e.target.value } : r)))
                      }
                      onBlur={() => void saveRowById(row.id)}
                      className={`w-36 min-h-[70px] p-2 resize-none text-sm font-bold ${fieldClass}`}
                      placeholder="כותרת קצרה"
                    />
                  </td>
                  <td
                    data-plan-section="details"
                    className={`p-2 align-middle bg-fuchsia-50/40 ${
                      isColumnOpen("details") ? "min-w-[320px] w-[320px]" : "min-w-[64px] w-[64px]"
                    }`}
                  >
                    {!expandedCols[row.id]?.details ? (
                      <button
                        type="button"
                        onClick={() => toggleRowCol(row.id, "details")}
                        className={`relative mx-auto block h-9 w-9 rounded-lg border ${
                          isSectionDone(row, "details")
                            ? "border-fuchsia-600 bg-fuchsia-600 text-white hover:bg-fuchsia-700"
                            : "border-fuchsia-200 bg-white text-fuchsia-700 hover:bg-fuchsia-50"
                        }`}
                        data-tooltip="פתח פירוט התרחשות"
                        aria-label="פתח פירוט התרחשות"
                      >
                        <FileText size={14} className="mx-auto" />
                        {isSectionDone(row, "details") ? (
                          <CheckCircle2
                            size={11}
                            className="absolute -left-1 -top-1 rounded-full bg-white text-fuchsia-600"
                          />
                        ) : null}
                      </button>
                    ) : (
                      <>
                        <OccurrenceDetailsCell
                          occurrenceDetails={row.occurrence_details || ""}
                          eventText={row.event_text}
                          staffInstructions={row.staff_instructions || ""}
                          participantInstructions={row.participant_instructions || ""}
                          summaryCounts={computeRowDetailsSummaryCounts({
                            tasks: row.tasks,
                            equipment: row.equipment,
                            prints: row.prints,
                            staff_instructions: row.staff_instructions,
                            participant_instructions: row.participant_instructions,
                          })}
                          fieldClass={fieldClass}
                          disabled={row.id.startsWith("temp-")}
                          schemaMissing={occurrenceSchemaMissing}
                          instructionsSchemaMissing={instructionsSchemaMissing}
                          onOccurrenceDetailsChange={(value) =>
                            setRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, occurrence_details: value } : r)),
                            )
                          }
                          onOccurrenceDetailsBlur={() => void saveRowById(row.id)}
                          onSaveInstructions={(audience, text) => {
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? {
                                      ...r,
                                      staff_instructions: audience === "staff" ? text : r.staff_instructions,
                                      participant_instructions:
                                        audience === "participants" ? text : r.participant_instructions,
                                    }
                                  : r,
                              ),
                            );
                            setTimeout(() => void saveRowById(row.id), 0);
                          }}
                          onOpenResponsibilities={() => {
                            setExpandedCols((prev) => ({
                              ...prev,
                              [row.id]: { ...emptyExpandedCols(), ...prev[row.id], responsibilities: true },
                            }));
                            setResponsibilityDialogRowId(row.id);
                            scrollSectionIntoView("responsibilities");
                          }}
                          onFollowUpAction={(action, meta) => handleRowFollowUp(row.id, action, meta)}
                          followUpRequest={
                            rowFollowUp?.rowId === row.id &&
                            (rowFollowUp.action === "purchase" ||
                              rowFollowUp.action === "equipment" ||
                              rowFollowUp.action === "guidelines")
                              ? rowFollowUp.action
                              : null
                          }
                          onFollowUpConsumed={() =>
                            setRowFollowUp((current) => (current?.rowId === row.id ? null : current))
                          }
                          onAddEquipment={(item) => {
                            const nextEquipment = [
                              ...(row.equipment || []).filter(
                                (eq) =>
                                  String(eq.item || "").trim() ||
                                  String(eq.quantity || "").trim() ||
                                  String(eq.source_type || "").trim(),
                              ),
                              {
                                item: item.item,
                                quantity: item.quantity,
                                quantity_unit: item.quantity_unit,
                                source_type: item.source_type,
                                source_details: item.source_details,
                              },
                            ];
                            setRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, equipment: nextEquipment } : r)),
                            );
                            setExpandedCols((prev) => ({
                              ...prev,
                              [row.id]: { ...emptyExpandedCols(), ...prev[row.id], equipment: true },
                            }));
                            setTimeout(() => {
                              void saveRowById(row.id);
                            }, 0);
                          }}
                        />
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => markSectionDone(row.id, "details", !isSectionDone(row, "details"))}
                            className={`h-7 px-2 rounded border text-[10px] font-bold ${
                              isSectionDone(row, "details")
                                ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100"
                                : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            }`}
                          >
                            {isSectionDone(row, "details") ? "בטל סימון" : "סיימתי"}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleRowCol(row.id, "details")}
                            className="h-7 rounded border border-gray-200 px-2 text-[10px] font-bold hover:bg-white ms-auto"
                          >
                            סגור
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                  <td
                    data-plan-section="safety"
                    className={`p-2 align-middle bg-red-50/40 ${
                      isColumnOpen("safety") ? "min-w-[440px] w-[440px]" : "min-w-[64px] w-[64px]"
                    }`}
                  >
                    {!expandedCols[row.id]?.safety ? (
                      <button
                        type="button"
                        onClick={() => toggleRowCol(row.id, "safety")}
                        className={`relative h-9 w-9 rounded-lg border mx-auto block ${
                          isSectionDone(row, "safety")
                            ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                            : "border-red-200 bg-white text-red-600 hover:bg-red-50"
                        }`}
                        data-tooltip="פתח בטיחות"
                        aria-label="פתח בטיחות"
                      >
                        <ShieldAlert size={14} className="mx-auto" />
                        {isSectionDone(row, "safety") ? (
                          <CheckCircle2 size={11} className="absolute -left-1 -top-1 rounded-full bg-white text-red-600" />
                        ) : null}
                      </button>
                    ) : (
                      <>
                        {(row.safety.length ? row.safety : [{ risk: "", mitigation: "", owner: "" }]).map((s, idx) => (
                      <div
                        key={`${row.id}-s-${idx}`}
                        className={`mb-1 grid grid-cols-[minmax(150px,1.35fr)_minmax(150px,1.35fr)_minmax(130px,1fr)_auto_auto] gap-1 items-start border rounded-lg p-1 ${getSafetyToneClass(s)}`}
                      >
                        <textarea
                          rows={2}
                          ref={(el) => autoResizeRiskTextarea(el)}
                          className={`min-h-[56px] max-h-[156px] p-2 resize-none ${fieldClass}`}
                          placeholder="סיכון"
                          value={s.risk || ""}
                          onInput={(e) => autoResizeRiskTextarea(e.currentTarget)}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? {
                                      ...r,
                                      safety: (r.safety.length ? r.safety : [{ risk: "", mitigation: "", owner: "" }]).map(
                                        (x, i) => (i === idx ? { ...x, risk: e.target.value } : x),
                                      ),
                                    }
                                  : r,
                              ),
                            )
                          }
                          onBlur={() => {
                            void saveRowById(row.id);
                            const latest = rowsRef.current.find((r) => r.id === row.id);
                            const latestSafety = latest?.safety?.[idx];
                            if (!latestSafety) return;
                            if ((latestSafety.risk || "").trim()) {
                              openRiskDialog(
                                row.id,
                                idx,
                                "before",
                                latestSafety.risk || "",
                                latestSafety.mitigation || "",
                                latestSafety,
                              );
                            }
                          }}
                        />
                        <textarea
                          rows={2}
                          ref={(el) => autoResizeRiskTextarea(el)}
                          className={`min-h-[56px] max-h-[156px] p-2 resize-none ${fieldClass}`}
                          placeholder="צמצום סיכון"
                          value={s.mitigation || ""}
                          onInput={(e) => autoResizeRiskTextarea(e.currentTarget)}
                          onFocus={() => {
                            const latest = rowsRef.current.find((r) => r.id === row.id);
                            const latestSafety = latest?.safety?.[idx];
                            if (!latestSafety || !(latestSafety.risk || "").trim()) return;
                            const promptKey = `${row.id}:${idx}:${latestSafety.risk || ""}`;
                            if (mitigationRiskPromptShownRef.current[promptKey]) return;
                            mitigationRiskPromptShownRef.current[promptKey] = true;
                            openRiskDialog(
                              row.id,
                              idx,
                              "before",
                              latestSafety.risk || "",
                              latestSafety.mitigation || "",
                              latestSafety,
                            );
                          }}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? {
                                      ...r,
                                      safety: (r.safety.length ? r.safety : [{ risk: "", mitigation: "", owner: "" }]).map(
                                        (x, i) => (i === idx ? { ...x, mitigation: e.target.value } : x),
                                      ),
                                    }
                                  : r,
                              ),
                            )
                          }
                          onBlur={() => {
                            void saveRowById(row.id);
                            const latest = rowsRef.current.find((r) => r.id === row.id);
                            const latestSafety = latest?.safety?.[idx];
                            if (!latestSafety) return;
                            if ((latestSafety.mitigation || "").trim()) {
                              openRiskDialog(
                                row.id,
                                idx,
                                "after",
                                latestSafety.risk || "",
                                latestSafety.mitigation || "",
                                latestSafety,
                              );
                            }
                          }}
                        />
                        <StaffAssigneePicker
                          mode={staffAssigneeMode}
                          value={resolveStaffAssigneeFromFields({
                            participantId: s.owner_participant_id,
                            roleKey: s.owner_role_key,
                            displayName: s.owner || row.owner_name,
                            roster: staffRoster,
                          })}
                          onChange={(assignee: StaffAssigneeValue) =>
                            setRows((prev) =>
                              prev.map((r) => {
                                if (r.id !== row.id) return r;
                                const safety = (r.safety.length ? r.safety : [{ risk: "", mitigation: "", owner: "" }]).map(
                                  (item, safetyIdx) =>
                                    safetyIdx === idx
                                      ? {
                                          ...item,
                                          owner: assignee.displayName,
                                          owner_participant_id: assignee.participantId ?? null,
                                          owner_role_key: assignee.roleKey ?? null,
                                        }
                                      : item,
                                );
                                return syncRowOwnerFields({ ...r, safety }, assignee);
                              }),
                            )
                          }
                          onPersonCreated={() => void loadStaffRoster()}
                          roster={staffRoster}
                          planningRoles={planningRoles}
                          tripId={tripId}
                          fieldClass={fieldClass}
                          placeholder="אחראי"
                          className="min-w-[120px]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setRiskSummaryDialog({
                              open: true,
                              riskText: s.risk || "",
                              mitigationText: s.mitigation || "",
                              riskLevelBefore: s.risk_level_before ?? null,
                              likelihoodBefore: s.likelihood_before ?? null,
                              riskLevelAfter: s.risk_level_after ?? null,
                              likelihoodAfter: s.likelihood_after ?? null,
                            })
                          }
                          className="h-[56px] w-8 rounded border border-sky-100 text-sky-700 hover:bg-sky-50 inline-flex items-center justify-center"
                          data-tooltip="מידע על הערכת הסיכון"
                          aria-label="מידע על הערכת הסיכון"
                        >
                          <Info size={12} className="mx-auto" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, safety: r.safety.filter((_, i) => i !== idx) } : r,
                              ),
                            )
                          }
                          className="h-[56px] w-8 rounded border border-red-100 text-red-600 hover:bg-red-50 inline-flex items-center justify-center"
                          data-tooltip="מחק שורת בטיחות"
                          aria-label="מחק שורת בטיחות"
                        >
                          <Trash2 size={12} className="mx-auto" />
                        </button>
                      </div>
                    ))}
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id && r.safety.length < 100
                                    ? {
                                        ...r,
                                        safety: [
                                          ...r.safety,
                                          {
                                            risk: "",
                                            mitigation: "",
                                            owner: r.owner_name || "",
                                            risk_level_before: null,
                                            likelihood_before: null,
                                            risk_level_after: null,
                                            likelihood_after: null,
                                          },
                                        ],
                                      }
                                    : r,
                                ),
                              )
                            }
                            className="h-7 w-7 rounded border border-gray-200 text-[10px] font-bold hover:bg-white"
                          >
                            <Plus size={12} className="mx-auto" />
                          </button>
                          <button
                            type="button"
                            onClick={() => markSectionDone(row.id, "safety", !isSectionDone(row, "safety"))}
                            className={`h-7 px-2 rounded border text-[10px] font-bold ${
                              isSectionDone(row, "safety")
                                ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            }`}
                          >
                            {isSectionDone(row, "safety") ? "בטל סימון" : "סיימתי"}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleRowCol(row.id, "safety")}
                            className="h-7 px-2 rounded border border-gray-200 text-[10px] font-bold hover:bg-white ms-auto"
                          >
                            סגור
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                  <td
                    data-plan-section="equipment"
                    className={`p-2 align-middle bg-emerald-50/40 ${
                      isColumnOpen("equipment") ? "min-w-[620px] w-[620px]" : "min-w-[64px] w-[64px]"
                    }`}
                  >
                    {!expandedCols[row.id]?.equipment ? (
                      <button
                        type="button"
                        onClick={() => toggleRowCol(row.id, "equipment")}
                        className={`relative h-9 w-9 rounded-lg border mx-auto block ${
                          isSectionDone(row, "equipment")
                            ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                            : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                        }`}
                        data-tooltip="פתח ציוד"
                        aria-label="פתח ציוד"
                      >
                        <Backpack size={14} className="mx-auto" />
                        {isSectionDone(row, "equipment") ? (
                          <CheckCircle2 size={11} className="absolute -left-1 -top-1 rounded-full bg-white text-emerald-600" />
                        ) : null}
                      </button>
                    ) : (
                      <>
                    {(row.equipment.length
                      ? row.equipment
                      : [{ item: "", quantity: "", quantity_unit: "", source_type: "", source_details: "" }]
                    ).map((eq, idx) => (
                      <div
                        key={`${row.id}-e-${idx}`}
                        className="mb-1 grid gap-1 items-center grid-cols-[minmax(120px,1.1fr)_minmax(48px,3.75rem)_minmax(72px,5rem)_max-content_minmax(160px,2.2fr)_auto]"
                      >
                        <input
                          className={`h-9 w-full min-w-[120px] ${fieldClass}`}
                          placeholder="פריט"
                          value={eq.item || ""}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? {
                                      ...r,
                                      equipment: (
                                        r.equipment.length
                                          ? r.equipment
                                          : [{ item: "", quantity: "", quantity_unit: "", source_type: "", source_details: "" }]
                                      ).map((x, i) => (i === idx ? { ...x, item: e.target.value } : x)),
                                    }
                                  : r,
                              ),
                            )
                          }
                          onBlur={() => void saveRowById(row.id)}
                        />
                        <div className="relative h-9">
                          <input
                            className={`h-9 w-full min-w-[48px] max-w-[3.75rem] mx-auto shrink-0 ${fieldClass}`}
                            placeholder="כמות"
                            value={eq.quantity || ""}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id
                                    ? {
                                        ...r,
                                        equipment: (
                                          r.equipment.length
                                            ? r.equipment
                                            : [{ item: "", quantity: "", quantity_unit: "", source_type: "", source_details: "" }]
                                        ).map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)),
                                      }
                                    : r,
                                ),
                              )
                            }
                            onBlur={() => void saveRowById(row.id)}
                          />
                        </div>
                        <div className="relative h-9">
                          <button
                            type="button"
                            onClick={() => setActiveQuantityUnitPicker(`${row.id}-${idx}`)}
                            className={`h-9 w-full min-w-[72px] ${fieldClass}`}
                            data-tooltip="סוג כמות"
                            aria-label="סוג כמות"
                          >
                            {eq.quantity_unit || "סוג"}
                          </button>
                          {activeQuantityUnitPicker === `${row.id}-${idx}` ? (
                            <div className="absolute right-0 top-1/2 z-50 flex min-w-[6rem] -translate-y-1/2 flex-col gap-1 rounded-2xl border border-cyan-200 bg-cyan-50/95 p-1.5 shadow-2xl ring-2 ring-cyan-100">
                              {equipmentQuantityUnits.map((unit) => (
                                <button
                                  key={unit}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    if (unit === "אחר") {
                                      setCustomQuantityUnitKey(`${row.id}-${idx}`);
                                      setCustomQuantityUnitValue("");
                                      return;
                                    }
                                    setRows((prev) =>
                                      prev.map((r) =>
                                        r.id === row.id
                                          ? {
                                              ...r,
                                              equipment: (
                                                r.equipment.length
                                                  ? r.equipment
                                                  : [{ item: "", quantity: "", quantity_unit: "", source_type: "", source_details: "" }]
                                              ).map((x, i) => (i === idx ? { ...x, quantity_unit: unit } : x)),
                                            }
                                          : r,
                                      ),
                                    );
                                    setActiveQuantityUnitPicker(null);
                                    setTimeout(() => {
                                      void saveRowById(row.id);
                                    }, 0);
                                  }}
                                  className={`h-8 min-w-[72px] rounded-xl px-2 text-xs font-bold transition-colors ${
                                    eq.quantity_unit === unit
                                      ? "bg-brand-cyan text-white shadow-sm"
                                      : "bg-white text-gray-700 hover:bg-cyan-100 hover:text-brand-cyan"
                                  }`}
                                >
                                  {unit}
                                </button>
                              ))}
                              {customQuantityUnitKey === `${row.id}-${idx}` ? (
                                <input
                                  autoFocus
                                  value={customQuantityUnitValue}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onChange={(e) => setCustomQuantityUnitValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key !== "Enter") return;
                                    const value = customQuantityUnitValue.trim();
                                    if (!value) return;
                                    setRows((prev) =>
                                      prev.map((r) =>
                                        r.id === row.id
                                          ? {
                                              ...r,
                                              equipment: (
                                                r.equipment.length
                                                  ? r.equipment
                                                  : [{ item: "", quantity: "", quantity_unit: "", source_type: "", source_details: "" }]
                                              ).map((x, i) => (i === idx ? { ...x, quantity_unit: value } : x)),
                                            }
                                          : r,
                                      ),
                                    );
                                    setCustomQuantityUnitKey(null);
                                    setCustomQuantityUnitValue("");
                                    setActiveQuantityUnitPicker(null);
                                    setTimeout(() => {
                                      void saveRowById(row.id);
                                    }, 0);
                                  }}
                                  onBlur={() => {
                                    const value = customQuantityUnitValue.trim();
                                    if (!value) {
                                      setCustomQuantityUnitKey(null);
                                      return;
                                    }
                                    setRows((prev) =>
                                      prev.map((r) =>
                                        r.id === row.id
                                          ? {
                                              ...r,
                                              equipment: (
                                                r.equipment.length
                                                  ? r.equipment
                                                  : [{ item: "", quantity: "", quantity_unit: "", source_type: "", source_details: "" }]
                                              ).map((x, i) => (i === idx ? { ...x, quantity_unit: value } : x)),
                                            }
                                          : r,
                                      ),
                                    );
                                    setCustomQuantityUnitKey(null);
                                    setCustomQuantityUnitValue("");
                                    setActiveQuantityUnitPicker(null);
                                    setTimeout(() => {
                                      void saveRowById(row.id);
                                    }, 0);
                                  }}
                                  className={`h-8 w-28 bg-white ${fieldClass}`}
                                  placeholder="כתוב..."
                                />
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        <div className="h-9 shrink-0 rounded-lg border border-gray-200 bg-white p-1 flex gap-1 items-center justify-center box-border">
                          {(eq.source_type ? [eq.source_type] : ["קיים", "רכש"]).map((optRaw) => {
                            const opt = optRaw === "מקור" ? "קיים" : optRaw;
                            const selected = (eq.source_type === "מקור" ? "קיים" : eq.source_type || "") === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  const nextType = selected ? "" : opt;
                                  setRows((prev) =>
                                    prev.map((r) =>
                                      r.id === row.id
                                        ? {
                                            ...r,
                                            equipment: (
                                              r.equipment.length
                                                ? r.equipment
                                                : [{ item: "", quantity: "", quantity_unit: "", source_type: "", source_details: "" }]
                                            ).map((x, i) =>
                                              i === idx
                                                ? {
                                                    ...x,
                                                    source_type: nextType,
                                                    source_details:
                                                      nextType === x.source_type || (nextType === "קיים" && x.source_type === "מקור")
                                                        ? x.source_details
                                                        : "",
                                                  }
                                                : x,
                                            ),
                                          }
                                        : r,
                                    ),
                                  );
                                  setTimeout(() => {
                                    void saveRowById(row.id);
                                  }, 0);
                                }}
                                className={`h-7 flex-1 min-w-[52px] rounded-md px-2 text-[10px] font-bold transition-colors inline-flex items-center justify-center ${getEquipmentSourceButtonClass(
                                  opt,
                                  selected,
                                )}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        <div className="relative min-w-0">
                          {(() => {
                            const sourceKey = `${row.id}-${idx}`;
                            const suggestions =
                              eq.source_type === "רכש"
                                ? equipmentSourceSuggestions.purchase
                                : eq.source_type === "קיים" || eq.source_type === "מקור"
                                  ? equipmentSourceSuggestions.existing
                                  : equipmentSourceSuggestions.all;
                            return (
                              <>
                                <input
                                  type="text"
                                  className={`h-9 min-w-0 w-full ${fieldClass}`}
                                  placeholder={
                                    (eq.source_type === "רכש"
                                      ? "ספק"
                                      : eq.source_type === "קיים" || eq.source_type === "מקור"
                                        ? "מקור"
                                        : "מקור / ספק")
                                  }
                                  value={eq.source_details || ""}
                                  onFocus={() => setActiveSourceSuggestionKey(sourceKey)}
                                  onChange={(e) => {
                                    setActiveSourceSuggestionKey(sourceKey);
                                    setRows((prev) =>
                                      prev.map((r) =>
                                        r.id === row.id
                                          ? {
                                              ...r,
                                              equipment: (
                                                r.equipment.length
                                                  ? r.equipment
                                                  : [{ item: "", quantity: "", quantity_unit: "", source_type: "", source_details: "" }]
                                              ).map((x, i) => (i === idx ? { ...x, source_details: e.target.value } : x)),
                                            }
                                          : r,
                                      ),
                                    );
                                  }}
                                  onBlur={() => {
                                    void saveRowById(row.id);
                                    setTimeout(() => {
                                      setActiveSourceSuggestionKey((current) => (current === sourceKey ? null : current));
                                    }, 120);
                                  }}
                                />
                                {activeSourceSuggestionKey === sourceKey && suggestions.length > 0 ? (
                                  <div className="absolute right-0 top-full z-50 mt-1 max-h-44 min-w-full overflow-auto rounded-2xl border border-cyan-200 bg-cyan-50/95 p-1.5 shadow-2xl ring-2 ring-cyan-100">
                                    {suggestions.map((value) => (
                                      <button
                                        key={value}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          setRows((prev) =>
                                            prev.map((r) =>
                                              r.id === row.id
                                                ? {
                                                    ...r,
                                                    equipment: (
                                                      r.equipment.length
                                                        ? r.equipment
                                                        : [
                                                            {
                                                              item: "",
                                                              quantity: "",
                                                              quantity_unit: "",
                                                              source_type: "",
                                                              source_details: "",
                                                            },
                                                          ]
                                                    ).map((x, i) => (i === idx ? { ...x, source_details: value } : x)),
                                                  }
                                                : r,
                                            ),
                                          );
                                          setActiveSourceSuggestionKey(null);
                                          setTimeout(() => {
                                            void saveRowById(row.id);
                                          }, 0);
                                        }}
                                        className="block h-8 w-full rounded-xl px-3 text-center text-xs font-bold text-gray-700 transition-colors hover:bg-white hover:text-brand-cyan"
                                      >
                                        {value}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, equipment: r.equipment.filter((_, i) => i !== idx) } : r,
                              ),
                            )
                          }
                          className="h-9 w-9 shrink-0 rounded border border-red-100 text-red-600 hover:bg-red-50 inline-flex items-center justify-center"
                          data-tooltip="מחק שורת ציוד"
                          aria-label="מחק שורת ציוד"
                        >
                          <Trash2 size={12} className="mx-auto" />
                        </button>
                      </div>
                    ))}
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id && r.equipment.length < 100
                                    ? {
                                        ...r,
                                        equipment: [
                                          ...r.equipment,
                                          { item: "", quantity: "", quantity_unit: "", source_type: "", source_details: "" },
                                        ],
                                      }
                                    : r,
                                ),
                              )
                            }
                            className="h-7 w-7 rounded border border-gray-200 text-[10px] font-bold hover:bg-white"
                          >
                            <Plus size={12} className="mx-auto" />
                          </button>
                          <button
                            type="button"
                            onClick={() => markSectionDone(row.id, "equipment", !isSectionDone(row, "equipment"))}
                            className={`h-7 px-2 rounded border text-[10px] font-bold ${
                              isSectionDone(row, "equipment")
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            }`}
                          >
                            {isSectionDone(row, "equipment") ? "בטל סימון" : "סיימתי"}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleRowCol(row.id, "equipment")}
                            className="h-7 px-2 rounded border border-gray-200 text-[10px] font-bold hover:bg-white ms-auto"
                          >
                            סגור
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                  <td
                    data-plan-section="prints"
                    className={`p-2 align-middle bg-cyan-50/40 ${
                      isColumnOpen("prints") ? "min-w-[440px] w-[440px]" : "min-w-[64px] w-[64px]"
                    }`}
                  >
                    {!expandedCols[row.id]?.prints ? (
                      <button
                        type="button"
                        onClick={() => toggleRowCol(row.id, "prints")}
                        className={`relative h-9 w-9 rounded-lg border mx-auto block ${
                          isSectionDone(row, "prints")
                            ? "border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700"
                            : "border-cyan-200 bg-white text-cyan-700 hover:bg-cyan-50"
                        }`}
                        data-tooltip="פתח הדפסות"
                        aria-label="פתח הדפסות"
                      >
                        <Printer size={14} className="mx-auto" />
                        {isSectionDone(row, "prints") ? (
                          <CheckCircle2 size={11} className="absolute -left-1 -top-1 rounded-full bg-white text-cyan-600" />
                        ) : null}
                      </button>
                    ) : (
                      <>
                    {(() => {
                      const draft = getPrintDraft(row.id);
                      const inputId = `print-file-${row.id}`;
                      return (
                        <div className="rounded-xl border border-cyan-100 bg-white/80 p-2">
                          <div className="grid grid-cols-[56px_70px_80px_1fr] gap-1">
                            <input
                              className={`h-9 ${fieldClass}`}
                              placeholder="כמות"
                              inputMode="numeric"
                              value={draft.quantity}
                              onChange={(e) => updatePrintDraft(row.id, { quantity: e.target.value })}
                            />
                            <input
                              className={`h-9 ${fieldClass}`}
                              placeholder="גודל"
                              value={draft.print_size}
                              onChange={(e) => updatePrintDraft(row.id, { print_size: e.target.value })}
                            />
                            <input
                              className={`h-9 ${fieldClass}`}
                              placeholder="סוג דף"
                              value={draft.page_type}
                              onChange={(e) => updatePrintDraft(row.id, { page_type: e.target.value })}
                            />
                            <div className="relative min-w-0">
                              <input
                                className={`h-9 min-w-0 w-full ${fieldClass}`}
                                placeholder="מקום הדפסה"
                                value={draft.print_location}
                                onFocus={() => setActivePrintLocationSuggestionKey(row.id)}
                                onChange={(e) => {
                                  setActivePrintLocationSuggestionKey(row.id);
                                  updatePrintDraft(row.id, { print_location: e.target.value });
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    setActivePrintLocationSuggestionKey((current) => (current === row.id ? null : current));
                                  }, 120);
                                }}
                              />
                              {activePrintLocationSuggestionKey === row.id && printLocationSuggestions.length > 0 ? (
                                <div className="absolute right-0 top-full z-50 mt-1 max-h-44 min-w-full overflow-auto rounded-2xl border border-cyan-200 bg-cyan-50/95 p-1.5 shadow-2xl ring-2 ring-cyan-100">
                                  {printLocationSuggestions.map((value) => (
                                    <button
                                      key={value}
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => {
                                        updatePrintDraft(row.id, { print_location: value });
                                        setActivePrintLocationSuggestionKey(null);
                                      }}
                                      className="block h-8 w-full rounded-xl px-3 text-center text-xs font-bold text-gray-700 transition-colors hover:bg-white hover:text-brand-cyan"
                                    >
                                      {value}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-1">
                            <input
                              id={inputId}
                              type="file"
                              className="sr-only"
                              onChange={(e) => updatePrintDraft(row.id, { file: e.target.files?.[0] || null })}
                            />
                            <label
                              htmlFor={inputId}
                              className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 text-xs font-bold text-brand-cyan hover:bg-cyan-100"
                            >
                              <Upload size={12} />
                              בחר קובץ
                            </label>
                            <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-gray-600">
                              {draft.file?.name || "לא נבחר קובץ"}
                            </span>
                            {printUploadError && expandedCols[row.id]?.prints ? (
                              <p className="mb-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
                                {printUploadError}
                              </p>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => void addPrintFile(row.id)}
                              disabled={!draft.file || uploadingRowId === row.id || row.id.startsWith("temp-")}
                              className="h-8 rounded-lg bg-brand-cyan px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                            >
                              {uploadingRowId === row.id ? "מעלה..." : "העלה"}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="space-y-1 mt-1">
                      {row.prints.map((p) => (
                        <div key={p.id} className="text-[11px] border border-gray-100 rounded p-1">
                          <div className="font-bold text-gray-700 truncate">{p.file_name || "קובץ"}</div>
                          <div className="text-gray-500">
                            כמות: {p.quantity ?? "—"} | גודל: {bytesLabel(p.file_size_bytes)}
                          </div>
                          <div className="text-gray-500">
                            גודל הדפסה: {p.print_size || "—"} | סוג דף: {p.page_type || "—"} | מקום: {p.print_location || "—"}
                          </div>
                          <button
                            type="button"
                            onClick={() => void removePrintFile(row.id, p.id)}
                            className="text-red-600 font-bold mt-1 inline-flex items-center gap-1"
                          >
                            <Trash2 size={11} />
                            הסר
                          </button>
                        </div>
                      ))}
                    </div>
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => markSectionDone(row.id, "prints", !isSectionDone(row, "prints"))}
                            className={`h-7 px-2 rounded border text-[10px] font-bold ${
                              isSectionDone(row, "prints")
                                ? "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                                : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            }`}
                          >
                            {isSectionDone(row, "prints") ? "בטל סימון" : "סיימתי"}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleRowCol(row.id, "prints")}
                            className="h-7 px-2 rounded border border-gray-200 text-[10px] font-bold hover:bg-white ms-auto"
                          >
                            סגור
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                  <td
                    data-plan-section="notes"
                    className={`p-2 align-middle bg-amber-50/40 ${
                      isColumnOpen("notes") ? "min-w-[190px] w-[190px]" : "min-w-[64px] w-[64px]"
                    }`}
                  >
                    {!expandedCols[row.id]?.notes ? (
                      <button
                        type="button"
                        onClick={() => toggleRowCol(row.id, "notes")}
                        className={`relative h-9 w-9 rounded-lg border mx-auto block ${
                          isSectionDone(row, "notes")
                            ? "border-amber-500 bg-amber-500 text-white hover:bg-amber-600"
                            : "border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
                        }`}
                        data-tooltip="פתח הערות"
                        aria-label="פתח הערות"
                      >
                        <StickyNote size={14} className="mx-auto" />
                        {isSectionDone(row, "notes") ? (
                          <CheckCircle2 size={11} className="absolute -left-1 -top-1 rounded-full bg-white text-amber-600" />
                        ) : null}
                      </button>
                    ) : (
                      <>
                        <textarea
                          rows={2}
                          ref={(el) => autoResizeNotesTextarea(el)}
                          onInput={(e) => autoResizeNotesTextarea(e.currentTarget)}
                          value={row.notes || ""}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? {
                                      ...r,
                                      notes: e.target.value,
                                    }
                                  : r,
                              ),
                            )
                          }
                          onBlur={() => void saveRowById(row.id)}
                          className={`w-40 min-h-[56px] max-h-[156px] resize-none mb-1 p-2 ${fieldClass}`}
                        />
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id && (r.notes ? r.notes.split("\n").length : 1) < 100
                                    ? { ...r, notes: `${r.notes || ""}\n` }
                                    : r,
                                ),
                              )
                            }
                            className="h-7 w-7 rounded border border-gray-200 text-[10px] font-bold hover:bg-white"
                          >
                            <Plus size={12} className="mx-auto" />
                          </button>
                          <button
                            type="button"
                            onClick={() => markSectionDone(row.id, "notes", !isSectionDone(row, "notes"))}
                            className={`h-7 px-2 rounded border text-[10px] font-bold ${
                              isSectionDone(row, "notes")
                                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            }`}
                          >
                            {isSectionDone(row, "notes") ? "בטל סימון" : "סיימתי"}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleRowCol(row.id, "notes")}
                            className="h-7 px-2 rounded border border-gray-200 text-[10px] font-bold hover:bg-white ms-auto"
                          >
                            סגור
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                  <td
                    data-plan-section="responsibilities"
                    className={`p-2 align-middle bg-violet-50/40 ${
                      isColumnOpen("responsibilities") ? "min-w-[260px] w-[260px]" : "min-w-[64px] w-[64px]"
                    }`}
                  >
                    {!expandedCols[row.id]?.responsibilities ? (
                      <button
                        type="button"
                        onClick={() => toggleRowCol(row.id, "responsibilities")}
                        className={`relative mx-auto block h-9 w-9 rounded-lg border ${
                          isSectionDone(row, "responsibilities")
                            ? "border-violet-600 bg-violet-600 text-white hover:bg-violet-700"
                            : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                        }`}
                        data-tooltip="פתח באחריות"
                        aria-label="פתח באחריות"
                      >
                        <UserRound size={14} className="mx-auto" />
                        {isSectionDone(row, "responsibilities") ? (
                          <CheckCircle2
                            size={11}
                            className="absolute -left-1 -top-1 rounded-full bg-white text-violet-600"
                          />
                        ) : null}
                      </button>
                    ) : (
                      <>
                        <RowResponsibilitiesCell
                          ownerValue={resolveStaffAssigneeFromFields({
                            participantId: row.owner_participant_id,
                            roleKey: row.owner_role_key,
                            displayName: row.owner_name,
                            roster: staffRoster,
                          })}
                          tasks={row.tasks || []}
                          assigneeMode={staffAssigneeMode}
                          roster={staffRoster}
                          planningRoles={planningRoles}
                          tripId={tripId}
                          fieldClass={fieldClass}
                          disabled={row.id.startsWith("temp-")}
                          autoOpenTaskDialog={responsibilityDialogRowId === row.id}
                          onAutoOpenTaskDialogConsumed={() => setResponsibilityDialogRowId(null)}
                          onOwnerChange={(value) =>
                            setRows((prev) => prev.map((r) => (r.id === row.id ? syncRowOwnerFields(r, value) : r)))
                          }
                          onOwnerBlur={() => void saveRowById(row.id)}
                          onTasksChange={(tasks) =>
                            setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, tasks } : r)))
                          }
                          onSave={() => void saveRowById(row.id)}
                          onStaffRosterRefresh={() => void loadStaffRoster()}
                          onFollowUpAction={(action, meta) => handleRowFollowUp(row.id, action, meta)}
                        />
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => markSectionDone(row.id, "responsibilities", !isSectionDone(row, "responsibilities"))}
                            className={`h-7 px-2 rounded border text-[10px] font-bold ${
                              isSectionDone(row, "responsibilities")
                                ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                                : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            }`}
                          >
                            {isSectionDone(row, "responsibilities") ? "בטל סימון" : "סיימתי"}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleRowCol(row.id, "responsibilities")}
                            className="h-7 rounded border border-gray-200 px-2 text-[10px] font-bold hover:bg-white ms-auto"
                          >
                            סגור
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                  <td className="w-20 min-w-20 p-2 align-middle">
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteRowId(row.id)}
                        className="h-8 w-8 rounded border border-red-100 text-red-600 hover:bg-red-50"
                        data-tooltip="מחק שורה"
                        aria-label="מחק שורה"
                      >
                        <Trash2 size={12} className="mx-auto" />
                      </button>
                    </div>
                    <div className="mx-auto mt-1 flex h-4 w-14 items-center justify-center overflow-hidden">
                      {savingRowId === row.id || uploadingRowId === row.id ? (
                        <span className="inline-flex w-full items-center justify-center gap-1 whitespace-nowrap text-[10px] text-gray-500">
                          <Loader2 size={10} className="shrink-0 animate-spin" />
                          <span className="inline-block w-9 text-center">שומר...</span>
                        </span>
                      ) : (
                        <span className="inline-flex w-full items-center justify-center gap-1 whitespace-nowrap text-[10px] text-emerald-600">
                          <Save size={10} className="shrink-0" />
                          <span className="inline-block w-9 text-center">נשמר</span>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
                {idx < rowsSorted.length - 1 ? (
                  <tr className="bg-transparent">
                    <td className="h-4 p-0 align-middle text-center">
                      <div className="relative h-4 group/day-gap">
                        <span className="pointer-events-none absolute left-3 right-3 top-1/2 -translate-y-1/2 border-t border-gray-200" />
                        <button
                          type="button"
                          onClick={() => openInsertDialog("after", row.id)}
                          className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm opacity-0 pointer-events-none transition-opacity duration-150 hover:bg-gray-50 hover:border-gray-300 group-hover/day-gap:opacity-100 group-hover/day-gap:pointer-events-auto group-focus-within/day-gap:opacity-100 group-focus-within/day-gap:pointer-events-auto"
                          data-tooltip="הוסף שורה בין השורות"
                          aria-label="הוסף שורה בין השורות"
                        >
                          <Plus size={12} className="mx-auto" />
                        </button>
                      </div>
                    </td>
                    <td colSpan={10} className="py-1" />
                  </tr>
                ) : null}
                </React.Fragment>
              ))}
              {rowsSorted.length > 0 ? (
                <tr className="bg-transparent">
                  <td className="h-5 p-0 align-middle text-center">
                    <div className="relative h-5 group/day-gap">
                      <span className="pointer-events-none absolute left-3 right-3 top-1/2 -translate-y-1/2 border-t border-gray-200" />
                      <button
                        type="button"
                        onClick={() => openInsertDialog("after", rowsSorted[rowsSorted.length - 1].id)}
                        className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm opacity-0 pointer-events-none transition-opacity duration-150 hover:bg-gray-50 hover:border-gray-300 group-hover/day-gap:opacity-100 group-hover/day-gap:pointer-events-auto group-focus-within/day-gap:opacity-100 group-focus-within/day-gap:pointer-events-auto"
                        data-tooltip="הוסף שורה אחרי השורה האחרונה"
                        aria-label="הוסף שורה אחרי השורה האחרונה"
                      >
                        <Plus size={12} className="mx-auto" />
                      </button>
                    </div>
                  </td>
                  <td colSpan={10} className="py-1" />
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </div>
        ) : activeTab === "participants" ? (
          <ParticipantsTab
            tripId={tripId}
            active={activeTab === "participants"}
            mode="participants"
            tourPeopleSection={tourPeopleSection}
          />
        ) : (
          <ParticipantsTab tripId={tripId} active={activeTab === "transport"} mode="transport" />
        )}

      </div>
      {activeQuickAction === "documents" ? (
        <div className={quickActionShellClass("documents")}>
          <div className="absolute inset-0 bg-slate-500/25 backdrop-blur-sm" onClick={() => setActiveQuickAction(null)} />
          <div className={quickActionPanelClass("documents", "border-cyan-100")}>
            <div className="flex flex-col gap-3 border-b border-cyan-100 bg-gradient-to-l from-cyan-50 to-white px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-black text-gray-900">
                  <FileText size={24} className="text-brand-cyan" />
                  מסמכי תיק הטיול
                </h2>
                <p className="mt-1 text-xs font-bold text-gray-500">רשימת המסמכים הראשונית לתיק הטיול, מחולקת לקטגוריות ומוכנה לדייק מסמך־מסמך בהמשך.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => void loadDocumentsMeta()} disabled={documentsLoading}>
                  {documentsLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  רענן
                </Button>
                {renderQuickActionFullscreenButton("documents", "מסמכי תיק הטיול")}
                <button
                  type="button"
                  onClick={() => setActiveQuickAction(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-800"
                  aria-label="סגור מסמכי תיק הטיול"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {documentsSchemaMissing ? (
              <div className="m-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                יש להריץ את המיגרציה `20260510_add_trip_plan_documents.sql` כדי לשמור סטטוס, אחראי והערות למסמכים.
              </div>
            ) : null}
            {documentsError ? <div className="m-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{documentsError}</div> : null}

            <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-4">
              <SummaryCard label="סה״כ מסמכים" value={documentSummary.total} icon={<FileText size={16} />} />
              <SummaryCard label="מוכנים" value={documentSummary.readyPdf} icon={<CheckCircle2 size={16} />} />
              <SummaryCard label="לטיפול/בעבודה" value={documentSummary.inProgress} icon={<RefreshCw size={16} />} tone="amber" />
              <SummaryCard label="נשאבים אוטומטית" value={documentSummary.autoSources} tone="cyan" />
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4 pt-0">
              <table className="w-full min-w-[1240px] border-separate border-spacing-y-1 text-center text-sm">
                <thead className="text-gray-800 shadow-sm">
                  <tr>
                    <th className="sticky top-0 z-30 w-56 rounded-r-2xl border-b border-gray-200 bg-gray-200 p-3 font-black shadow-sm">שם המסמך</th>
                    <th className="sticky top-0 z-30 w-16 border-b border-gray-200 bg-gray-200 p-3 font-black shadow-sm">פירוט</th>
                    <th className="sticky top-0 z-30 w-72 border-b border-gray-200 bg-gray-200 p-3 font-black shadow-sm">מסמך</th>
                    <th className="sticky top-0 z-30 w-44 border-b border-gray-200 bg-gray-200 p-3 font-black shadow-sm">סטטוס</th>
                    <th className="sticky top-0 z-30 w-44 border-b border-gray-200 bg-gray-200 p-3 font-black shadow-sm">מקור</th>
                    <th className="sticky top-0 z-30 w-16 rounded-l-2xl border-b border-gray-200 bg-gray-200 p-3 font-black shadow-sm">הערה</th>
                  </tr>
                </thead>
                <tbody>
                  {documentItems.map((document, index) => {
                    const detailsOpen = expandedDocumentDetails.has(document.key);
                    const noteOpen = expandedDocumentNotes.has(document.key);
                    const previous = documentItems[index - 1];
                    const showCategoryDivider = index === 0 || previous.category !== document.category;
                    const internalDocument = isInternalDocumentUrl(document.editUrl);
                    const isRiskManagementDocument = document.key === "risk-management";
                    const isUploadableDocument = UPLOADABLE_DOCUMENT_KEYS.has(document.key);
                    const completed = isDocumentCompleted(document);
                    const showPdfLink = shouldShowDocumentPdfLink(document);
                    const documentModeLabel = documentStatusDisplay(completed ? "מוכן PDF" : document.status || (isRiskManagementDocument ? "בעבודה" : "לטיפול"));
                    const categoryBlockTone = documentCategoryBlockTone(document.category);
                    const rowBorderTone = documentStatusToneClasses(completed && document.status !== "לא נדרש" ? "מוכן PDF" : document.status, "border");
                    const rowCellClass = `${categoryBlockTone} border-y-2 ${rowBorderTone}`;
                    return (
                      <React.Fragment key={document.key}>
                        {showCategoryDivider ? (
                          <tr>
                            <td colSpan={6} className={`rounded-2xl border px-4 py-2 text-right text-xs font-black ${documentCategoryTone(document.category)}`}>
                              {document.category}
                            </td>
                          </tr>
                        ) : null}
                        <tr id={`trip-document-row-${document.key}`}>
                          <td className={`rounded-r-3xl border-r-2 p-3 align-middle ${rowCellClass}`}>
                            <div className="font-black text-gray-800">{document.title}</div>
                          </td>
                          <td className={`p-3 align-middle transition-[width] ${detailsOpen ? "w-[24rem] min-w-[24rem]" : "w-16 min-w-16"} ${rowCellClass}`}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDocumentDetails((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(document.key)) next.delete(document.key);
                                  else next.add(document.key);
                                  return next;
                                })
                              }
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-cyan-700 ${
                                detailsOpen ? "border-cyan-200 bg-cyan-50" : "border-gray-200 bg-white hover:bg-cyan-50"
                              }`}
                              aria-label={`פתח פירוט ${document.title}`}
                            >
                              <Info size={16} />
                            </button>
                            {detailsOpen ? (
                              <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-cyan-100 bg-white/70 p-3 text-center text-xs font-bold text-cyan-900">
                                {document.description}
                              </div>
                            ) : null}
                          </td>
                          <td className={`p-3 align-middle ${rowCellClass}`}>
                            <div className="grid gap-2">
                              {internalDocument ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openTripDocument(document.key, document.editUrl)}
                                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-cyan-100 bg-white px-4 text-xs font-black text-brand-cyan shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-md"
                                  >
                                    מעבר למסמך
                                  </button>
                                  {completed ? (
                                    <button
                                      type="button"
                                      onClick={() => router.push(`${document.editUrl}?print=1`)}
                                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-100 bg-white text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-md"
                                      aria-label={`הורדת PDF עבור ${document.title}`}
                                    >
                                      <Download size={16} />
                                    </button>
                                  ) : null}
                                </div>
                              ) : !isUploadableDocument && showPdfLink && document.pdfUrl ? (
                                <button type="button" onClick={() => void openDocumentFile(document.pdfUrl)} className="text-xs font-black text-brand-cyan underline">
                                  פתיחת קובץ
                                </button>
                              ) : null}
                              {!internalDocument && !isUploadableDocument && !showPdfLink && document.editUrl ? (
                                <a href={document.editUrl} target="_blank" rel="noreferrer" className="text-xs font-black text-purple-700 underline">
                                  פתיחת גרסת עריכה
                                </a>
                              ) : null}
                              {isUploadableDocument ? (
                                <div className="flex items-center justify-center gap-2 overflow-x-auto overscroll-x-contain">
                                  {document.uploadedFiles.length ? (
                                    <>
                                      {document.uploadedFiles.map((file, fileIndex) => (
                                        <div key={`${file.url}-${fileIndex}`} className="flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-emerald-100 bg-white/80 p-1.5">
                                          <span className="max-w-24 truncate text-xs font-black text-gray-700" title={file.name}>
                                            {file.name}
                                          </span>
                                          {file.size ? <span className="text-[10px] font-bold text-gray-400">{bytesLabel(file.size)}</span> : null}
                                          <button
                                            type="button"
                                            onClick={() => void openDocumentFile(file.url)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-100 bg-white text-brand-cyan shadow-sm hover:bg-cyan-50"
                                            aria-label={`צפייה ב${file.name}`}
                                            title="צפייה"
                                          >
                                            <Eye size={13} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => void downloadDocumentFile(file.url)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-100 bg-white text-emerald-700 shadow-sm hover:bg-emerald-50"
                                            aria-label={`הורדת ${file.name}`}
                                            title="הורדה"
                                          >
                                            <Download size={13} />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={uploadingDocumentKey === document.key}
                                            onClick={() => void deleteDocumentFile(document.key, file.url)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-100 bg-white text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-60"
                                            aria-label={`מחיקת ${file.name}`}
                                            title="מחיקה"
                                          >
                                            {uploadingDocumentKey === document.key ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                          </button>
                                        </div>
                                      ))}
                                    </>
                                  ) : null}
                                  <label
                                    className={`inline-flex shrink-0 cursor-pointer items-center justify-center border border-cyan-100 bg-white text-brand-cyan shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-md ${
                                      document.uploadedFiles.length ? "h-8 w-8 rounded-xl" : "h-9 rounded-2xl px-4 text-xs font-black"
                                    }`}
                                    aria-label={document.uploadedFiles.length ? "הוספת קובץ" : "העלאת PDF/תמונה"}
                                    title={document.uploadedFiles.length ? "הוספת קובץ" : "העלאת PDF/תמונה"}
                                  >
                                    {uploadingDocumentKey === document.key ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5">
                                        <Upload size={14} />
                                        {!document.uploadedFiles.length ? <span>העלאת מסמך</span> : null}
                                      </span>
                                    )}
                                    <input
                                      type="file"
                                      multiple
                                      accept="application/pdf,image/*"
                                      className="hidden"
                                      disabled={documentsSchemaMissing || uploadingDocumentKey === document.key}
                                      onChange={(event) => {
                                        const files = Array.from(event.target.files || []);
                                        event.target.value = "";
                                        if (files.length) void Promise.all(files.map((file) => uploadDocumentFile(document.key, file)));
                                      }}
                                    />
                                  </label>
                                </div>
                              ) : !internalDocument ? (
                                <input
                                  value={showPdfLink ? document.pdfUrl : document.editUrl}
                                  onChange={(event) =>
                                    updateDocumentOverride(document.key, showPdfLink ? { pdfUrl: event.target.value } : { editUrl: event.target.value })
                                  }
                                  disabled={documentsSchemaMissing}
                                  placeholder={showPdfLink ? "קישור PDF" : "קישור לגרסת עריכה"}
                                  className="h-9 w-full rounded-2xl border border-gray-200 bg-white px-3 text-center text-xs font-bold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100 disabled:bg-gray-50"
                                />
                              ) : null}
                            </div>
                          </td>
                          <td className={`p-3 align-middle ${rowCellClass}`}>
                            <span
                              className={`inline-flex h-9 min-w-24 items-center justify-center rounded-full border px-4 text-xs font-black ${documentStatusToneClasses(
                                completed && document.status !== "לא נדרש" ? "מוכן PDF" : document.status,
                              )}`}
                            >
                              {documentModeLabel}
                            </span>
                          </td>
                          <td className={`p-3 align-middle ${rowCellClass}`}>
                            <div className="mx-auto flex max-w-48 flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white/85 px-3 py-2 text-center text-xs font-bold leading-5 text-gray-700 shadow-sm">
                              <span>{document.dataSource}</span>
                              {document.missingFields.length ? (
                                <span className="max-w-full truncate text-[10px] font-black text-pink-700" title={`חסר: ${document.missingFields.join(", ")}`}>
                                  חסר: {document.missingFields.slice(0, 2).join(", ")}
                                  {document.missingFields.length > 2 ? "..." : ""}
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-emerald-700">כל שדות החובה מלאים</span>
                              )}
                            </div>
                          </td>
                          <td className={`rounded-l-3xl border-l-2 p-3 align-middle transition-[width] ${noteOpen ? "w-[24rem] min-w-[24rem]" : "w-16 min-w-16"} ${rowCellClass}`}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDocumentNotes((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(document.key)) next.delete(document.key);
                                  else next.add(document.key);
                                  return next;
                                })
                              }
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${
                                document.note.trim() ? "border-amber-500 bg-amber-500 text-white shadow-sm shadow-amber-200" : "border-gray-200 bg-white text-gray-500 hover:bg-amber-50"
                              }`}
                              aria-label={`פתח הערה ${document.title}`}
                            >
                              <StickyNote size={16} />
                            </button>
                            {noteOpen ? (
                              <textarea
                                value={document.note}
                                onChange={(event) => updateDocumentOverride(document.key, { note: event.target.value })}
                                disabled={documentsSchemaMissing}
                                placeholder="הערה למסמך"
                                rows={3}
                                className="mt-2 min-h-20 w-full resize-none rounded-2xl border border-gray-200 bg-white p-3 text-center text-xs font-bold outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100 disabled:bg-gray-50"
                              />
                            ) : null}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
      {activeQuickAction === "emergency" ? (
        <div className={quickActionShellClass("emergency")}>
          <div className="absolute inset-0 bg-slate-500/25 backdrop-blur-sm" onClick={() => setActiveQuickAction(null)} />
          <div className={quickActionPanelClass("emergency", "border-red-100")}>
            <div className="flex flex-col gap-3 border-b border-red-100 bg-gradient-to-l from-red-50 to-white px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-black text-gray-900">
                  <AlertTriangle size={24} className="text-red-500" />
                  הנחיות חירום
                </h2>
                <p className="mt-1 text-xs font-bold text-gray-500">מסמכי חירום, טלפונים חיוניים וקישור להנחיות פיקוד העורף המתעדכנות.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {renderQuickActionFullscreenButton("emergency", "הנחיות חירום")}
                <button
                  type="button"
                  onClick={() => setActiveQuickAction(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-800"
                  aria-label="סגור הנחיות חירום"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                <section className="rounded-3xl border border-red-100 bg-red-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-red-800">
                    <Phone size={17} />
                    טלפוני חירום מיידיים
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "משטרה", phone: "100" },
                      { label: "מד״א", phone: "101" },
                      { label: "כיבוי אש", phone: "102" },
                    ].map((contact) => (
                      <div key={contact.phone} className="rounded-2xl border border-red-100 bg-white p-4 text-center shadow-sm">
                        <div className="text-xs font-black text-red-700">{contact.label}</div>
                        <div className="mt-1 text-3xl font-black text-gray-900">{contact.phone}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-cyan-100 bg-cyan-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-cyan-900">
                    <ExternalLink size={17} />
                    הנחיות פיקוד העורף
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-cyan-900">
                    הנחיות פיקוד העורף משתנות לפי מצב ואזורים. לכן במקום לשמור עותק סטטי במערכת, נכון להפנות למקור הרשמי המתעדכן.
                  </p>
                  <a
                    href="https://www.oref.org.il/heb"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-brand-cyan shadow-sm hover:bg-cyan-100"
                  >
                    <ExternalLink size={16} />
                    פתיחת אתר פיקוד העורף
                  </a>
                </section>
              </div>

              <div className="mt-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="text-xl font-black text-gray-900">התנהלות במצבי חירום</h3>
                <p className="mt-1 text-sm font-bold text-gray-500">תוכן המסמך המלא לקריאה ישירה מתוך חלון הנחיות החירום.</p>
                <div className="mt-5">
                  <EmergencyProcedureContent showContacts={false} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {activeQuickAction === "contacts" ? (
        <div className={quickActionShellClass("contacts")}>
          <div className="absolute inset-0 bg-slate-500/25 backdrop-blur-sm" onClick={() => setActiveQuickAction(null)} />
          <div className={quickActionPanelClass("contacts", "border-cyan-100")}>
            <div className="flex flex-col gap-3 border-b border-cyan-100 bg-gradient-to-l from-cyan-50 to-white px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
                  <Phone size={20} />
                  רשימת קשר חיונית לטיול
                </h2>
                <p className="mt-1 text-xs font-bold text-gray-500">מוקדי חירום, גורמי ארגון ובטיחות, וכל תקני הצוות הרלוונטיים לטיול.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => openTripDocument("essential-contact-list", `/dashboard/trip/${tripId}/plan/documents/essential-contact-list`)}
                  className="h-10 px-3 text-xs"
                >
                  <FileText size={15} />
                  פתח כמסמך
                </Button>
                <Button variant="outline" onClick={() => void loadContacts()} className="h-10 px-3 text-xs">
                  {contactsLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  רענון
                </Button>
                {renderQuickActionFullscreenButton("contacts", "רשימת קשר")}
                <button
                  type="button"
                  onClick={() => setActiveQuickAction(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-800"
                  aria-label="סגור רשימת קשר"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-5">
              {contactsLoading ? (
                <div className="flex h-52 items-center justify-center">
                  <Loader2 className="animate-spin text-brand-cyan" size={34} />
                </div>
              ) : contactsError ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{contactsError}</div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-right text-sm">
                      <thead className="bg-cyan-50 text-xs text-cyan-950">
                        <tr>
                          <th className="p-3 font-black">תפקיד</th>
                          <th className="p-3 font-black">שם פרטי</th>
                          <th className="p-3 font-black">שם משפחה</th>
                          <th className="p-3 font-black">טלפון</th>
                          <th className="p-3 font-black">טלפון נוסף</th>
                          <th className="p-3 font-black">אימייל</th>
                          <th className="p-3 font-black">הערות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contactRows.length ? (
                          contactRows.map((row, index) => (
                            <tr key={`${row.role}-${index}`} className="border-t border-gray-100">
                              <td className="p-3 font-black text-gray-900">{row.role}</td>
                              <td className="p-3 font-bold text-gray-700">{row.firstName || <span className="text-gray-300">-</span>}</td>
                              <td className="p-3 font-bold text-gray-700">{row.lastName || <span className="text-gray-300">-</span>}</td>
                              <td className="p-3 font-black text-cyan-800">{row.phone || <span className="text-gray-300">-</span>}</td>
                              <td className="p-3 font-bold text-gray-700">{row.extraPhone || <span className="text-gray-300">-</span>}</td>
                              <td className="p-3 font-bold text-gray-700">{row.email || <span className="text-gray-300">-</span>}</td>
                              <td className="p-3 text-xs font-bold text-gray-500">{row.notes}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-sm font-bold text-gray-400">
                              לא נמצאו אנשי קשר להצגה.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {activeQuickAction === "guidelines" ? (
        <div className={quickActionShellClass("guidelines")}>
          <div className="absolute inset-0 bg-slate-500/25 backdrop-blur-sm" onClick={() => setActiveQuickAction(null)} />
          <div className={quickActionPanelClass("guidelines", "border-violet-100")}>
            <div className="flex flex-col gap-3 border-b border-violet-100 bg-gradient-to-l from-violet-50 to-white px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-black text-gray-900">
                  <ScrollText size={24} className="text-violet-600" />
                  הנחיות וחוזרי מנכ״ל
                </h2>
                <p className="mt-1 text-xs font-bold text-gray-500">
                  חוזר {circular585.siduri}. מיפוי: מנהל = מזכירות, מורה = רכז/ת.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {renderQuickActionFullscreenButton("guidelines", "הנחיות וחוזרי מנכ״ל")}
                <button type="button" onClick={() => setActiveQuickAction(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" aria-label="סגור">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4 space-y-4">
              <TripRegulationCompliancePanel tripId={tripId} />
            </div>
          </div>
        </div>
      ) : null}
      {activeQuickAction === "roles" ? (
        <div className={quickActionShellClass("roles")}>
          <div className="absolute inset-0 bg-slate-500/25 backdrop-blur-sm" onClick={() => setActiveQuickAction(null)} />
          <div className={quickActionPanelClass("roles", "border-emerald-100")}>
            <div className="flex flex-col gap-3 border-b border-emerald-100 bg-gradient-to-l from-emerald-50 to-white px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
                  <Settings size={20} />
                  הגדרות תפקיד ואחריות
                </h2>
                <p className="mt-1 text-xs font-bold text-gray-500">
                  תצוגת אחריות לפי אחראי מהלו״ז, ומצבת צוות מאושרת לתכנון.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {rolesQuickActionTab === "staffing" ? (
                  <Button variant="outline" onClick={() => void loadRequiredStaffPlan()} className="h-10 px-3 text-xs">
                    {requiredStaffLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                    רענון
                  </Button>
                ) : null}
                {renderQuickActionFullscreenButton("roles", "הגדרות תפקיד")}
                <button
                  type="button"
                  onClick={() => setActiveQuickAction(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-800"
                  aria-label="סגור הגדרות תפקיד"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="border-b border-emerald-100 px-5 pt-4">
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setRolesQuickActionTab("assignees")}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-black ${
                    rolesQuickActionTab === "assignees"
                      ? "border-violet-500 bg-violet-500 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  אחריות לפי אחראי
                </button>
                <button
                  type="button"
                  onClick={() => setRolesQuickActionTab("staffing")}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-black ${
                    rolesQuickActionTab === "staffing"
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  מצבת צוות מאושרת
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {rolesQuickActionTab === "assignees" ? (
                <AssigneeResponsibilitiesBoard boards={assigneeBoards} />
              ) : requiredStaffLoading ? (
                <div className="flex h-52 items-center justify-center">
                  <Loader2 className="animate-spin text-brand-cyan" size={34} />
                </div>
              ) : requiredStaffError ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{requiredStaffError}</div>
              ) : (
                <div className="space-y-4">
                  {requiredStaffContext ? (
                    <div className="grid gap-3 md:grid-cols-4">
                      <SummaryCard label="חניכים" value={requiredStaffContext.participantCount} tone="cyan" />
                      <SummaryCard label="סה״כ משתתפים לחישוב" value={requiredStaffContext.totalPeople} tone="cyan" />
                      <SummaryCard label="אוטובוסים נדרשים" value={requiredStaffContext.busCount} tone={requiredStaffContext.busCount ? "amber" : "cyan"} />
                      <SummaryCard label="לינה" value={requiredStaffContext.hasSleeping ? "כן" : "לא"} tone={requiredStaffContext.hasSleeping ? "amber" : "cyan"} />
                    </div>
                  ) : null}

                  <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
                    <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3">
                      <h3 className="text-base font-black text-emerald-950">מצבת צוות מאושרת</h3>
                      <p className="mt-1 text-xs font-bold text-emerald-800">שינוי דרישת מינימום נעשה על ידי מחלקת מפעלים/בטיחות. בתכנון השוטף משבצים אנשים בפועל לתקנים האלו.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-right text-sm">
                        <thead className="bg-gray-100 text-xs text-gray-700">
                          <tr>
                            <th className="p-3 font-black">תפקיד</th>
                            <th className="p-3 font-black">מקור הדרישה</th>
                            <th className="p-3 font-black">כמות מאושרת</th>
                            <th className="p-3 font-black">מיזוג</th>
                            <th className="p-3 font-black">סטטוס</th>
                          </tr>
                        </thead>
                        <tbody>
                          {requiredStaffRows.length ? (
                            requiredStaffRows.map((row) => (
                              <tr key={row.role_key} className="border-t border-gray-100">
                                <td className="p-3 font-black text-gray-900">{row.role_label}</td>
                                <td className="p-3 text-xs font-bold text-gray-500">{row.source_summary}</td>
                                <td className="p-3 font-black text-gray-800">{row.approved_quantity}</td>
                                <td className="p-3">
                                  <span className={`rounded-full px-2 py-1 text-xs font-black ${row.merge_policy === "exclusive" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                                    {row.merge_policy === "exclusive" ? "בלעדי" : "ניתן למיזוג"}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-black text-cyan-700">מאושר לתכנון</span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-sm font-bold text-gray-400">
                                עדיין לא נשמרה מצבת צוות מאושרת לטיול הזה.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {activeQuickAction === "equipment" ? (
        <div className={quickActionShellClass("equipment")}>
          <div className="absolute inset-0 bg-slate-500/25 backdrop-blur-sm" onClick={() => setActiveQuickAction(null)} />
          <div className={quickActionPanelClass("equipment", "border-emerald-100")}>
            <div className="flex flex-col gap-3 border-b border-emerald-100 bg-gradient-to-l from-emerald-50 to-white px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-black text-gray-900">
                  <Backpack size={24} className="text-emerald-600" />
                  רשימת ציוד
                </h2>
                <p className="mt-1 text-xs font-bold text-gray-500">פירוט מרוכז של כל פריטי הציוד שהוזנו בעמודת הציוד בלו״ז המפורט.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
              {renderQuickActionFullscreenButton("equipment", "רשימת ציוד")}
              <button
                type="button"
                onClick={() => setActiveQuickAction(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-800"
                aria-label="סגור רשימת ציוד"
              >
                <X size={18} />
              </button>
              </div>
            </div>

            <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-4">
              <SummaryCard label="סה״כ פריטי ציוד" value={equipmentSummary.total} icon={<Backpack size={16} />} />
              <SummaryCard label="קיים" value={equipmentSummary.existing} icon={<CheckCircle2 size={16} />} />
              <SummaryCard label="לרכש" value={equipmentSummary.purchase} icon={<ShoppingCart size={16} />} tone="amber" />
              <SummaryCard label="ללא מקור/ספק" value={equipmentSummary.missingSource} tone="red" />
            </div>
            {purchaseSchemaMissing ? (
              <div className="m-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                יש להריץ את המיגרציה `20260509_add_trip_plan_purchase_tracking.sql` כדי לשמור סטטוס פריטי ציוד.
              </div>
            ) : null}
            {purchaseMetaError ? <div className="m-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{purchaseMetaError}</div> : null}

            <div className="min-h-0 flex-1 overflow-auto p-4">
              <table className="w-full min-w-[1120px] overflow-hidden rounded-2xl text-center text-sm">
                <thead className="sticky top-0 z-10 bg-gray-200 text-gray-800 shadow-sm">
                  <tr>
                    <th className="w-64 p-3 font-black">התרחשות</th>
                    <th className="p-3 font-black">פריט</th>
                    <th className="w-28 p-3 font-black">כמות</th>
                    <th className="w-28 p-3 font-black">סוג</th>
                    <th className="w-44 p-3 font-black">סטטוס</th>
                    <th className="w-32 p-3 font-black">מקור</th>
                    <th className="p-3 font-black">פירוט מקור</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentItems.map((item) => (
                    <tr key={item.key} className="border-t border-emerald-50 bg-white hover:bg-emerald-50/30">
                      <td className="p-3 align-middle">
                        <div className="whitespace-pre-wrap text-center font-black text-gray-800">{item.occurrence}</div>
                        {item.rowLabel ? <div className="mt-1 text-center text-[11px] font-bold text-gray-400">{item.rowLabel}</div> : null}
                      </td>
                      <td className="p-3 align-middle font-black text-gray-800">{item.item || "ללא שם פריט"}</td>
                      <td className="p-3 align-middle font-bold text-gray-700">{item.quantity || "-"}</td>
                      <td className="p-3 align-middle font-bold text-gray-700">{item.quantityUnit || "-"}</td>
                      <td className="p-3 align-middle">
                        <StyledStatusSelect
                          value={item.status}
                          onChange={(next) => item.equipmentId && updatePurchaseOverride(item.equipmentId, { status: next })}
                          disabled={!item.equipmentId || purchaseSchemaMissing}
                          options={equipmentStatusOptions}
                          tone="emerald"
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <span
                          className={`inline-flex min-h-9 items-center justify-center rounded-2xl px-3 text-xs font-black ${
                            item.sourceType === "רכש"
                              ? "bg-amber-50 text-amber-700"
                              : item.sourceType === "קיים"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-gray-50 text-gray-500"
                          }`}
                        >
                          {item.sourceType || "לא הוגדר"}
                        </span>
                      </td>
                      <td className="p-3 align-middle">
                        <span className="inline-flex min-h-9 items-center justify-center rounded-2xl bg-slate-50 px-3 text-xs font-black text-slate-700">
                          {item.sourceDetails || "לא הוגדר מקור/ספק"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!equipmentItems.length ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-sm font-bold text-gray-400">
                        אין עדיין פריטי ציוד שהוזנו בלו״ז המפורט.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
      {activeQuickAction === "prints" ? (
        <div className={quickActionShellClass("prints")}>
          <div className="absolute inset-0 bg-slate-500/25 backdrop-blur-sm" onClick={() => setActiveQuickAction(null)} />
          <div className={quickActionPanelClass("prints", "border-cyan-100")}>
            <div className="flex flex-col gap-3 border-b border-cyan-100 bg-gradient-to-l from-cyan-50 to-white px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-black text-gray-900">
                  <Printer size={24} className="text-brand-cyan" />
                  הדפסות
                </h2>
                <p className="mt-1 text-xs font-bold text-gray-500">פירוט מרוכז של כל קבצי ופרטי ההדפסה שהוזנו בעמודת ההדפסות בלו״ז המפורט.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => setShowPrintShopsDialog(true)}>
                  <Building2 size={14} />
                  בתי דפוס
                </Button>
                <Button variant="outline" onClick={() => void loadPrintShopsMeta()} disabled={printShopsLoading}>
                  {printShopsLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  רענן
                </Button>
                {renderQuickActionFullscreenButton("prints", "הדפסות")}
                <button
                  type="button"
                  onClick={() => setActiveQuickAction(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-800"
                  aria-label="סגור הדפסות"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {printShopsSchemaMissing ? (
              <div className="m-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                יש להריץ את המיגרציה `20260510_add_trip_plan_print_shops.sql` כדי לשמור פרטי בתי דפוס.
              </div>
            ) : null}
            {printShopsError ? <div className="m-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{printShopsError}</div> : null}

            <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-4">
              <SummaryCard label="קבצי הדפסה" value={printSummary.total} icon={<Printer size={16} />} />
              <SummaryCard label="סה״כ עותקים" value={printSummary.copies} icon={<FileText size={16} />} />
              <SummaryCard label="מקומות הדפסה" value={printSummary.locations} icon={<Building2 size={16} />} />
              <SummaryCard label="ללא מקום הדפסה" value={printSummary.missingLocation} tone="amber" />
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              <table className="w-full min-w-[1320px] overflow-hidden rounded-2xl text-center text-sm">
                <thead className="sticky top-0 z-10 bg-gray-200 text-gray-800 shadow-sm">
                  <tr>
                    <th className="w-64 p-3 font-black">התרחשות</th>
                    <th className="p-3 font-black">קובץ</th>
                    <th className="w-24 p-3 font-black">כמות</th>
                    <th className="w-36 p-3 font-black">גודל הדפסה</th>
                    <th className="w-36 p-3 font-black">סוג דף</th>
                    <th className="p-3 font-black">מקום הדפסה</th>
                    <th className="w-44 p-3 font-black">סטטוס</th>
                    <th className="w-28 p-3 font-black">גודל קובץ</th>
                    <th className="p-3 font-black">הערות</th>
                  </tr>
                </thead>
                <tbody>
                  {printItems.map((item) => (
                    <tr key={item.key} className="border-t border-cyan-50 bg-white hover:bg-cyan-50/30">
                      <td className="p-3 align-middle">
                        <div className="whitespace-pre-wrap text-center font-black text-gray-800">{item.occurrence}</div>
                        {item.rowLabel ? <div className="mt-1 text-center text-[11px] font-bold text-gray-400">{item.rowLabel}</div> : null}
                      </td>
                      <td className="p-3 align-middle">
                        <div className="font-black text-gray-800">{item.fileName}</div>
                      </td>
                      <td className="p-3 align-middle font-bold text-gray-700">{item.quantity ?? "-"}</td>
                      <td className="p-3 align-middle font-bold text-gray-700">{item.printSize || "-"}</td>
                      <td className="p-3 align-middle font-bold text-gray-700">{item.pageType || "-"}</td>
                      <td className="p-3 align-middle">
                        <span className="inline-flex min-h-9 items-center justify-center rounded-2xl bg-cyan-50 px-3 text-xs font-black text-cyan-700">
                          {item.printLocation || "לא הוגדר מקום"}
                        </span>
                      </td>
                      <td className="p-3 align-middle">
                        <StyledStatusSelect
                          value={item.status}
                          onChange={(next) => updatePrintStatus(item.rowId, item.key, next)}
                          options={printStatusOptions}
                        />
                      </td>
                      <td className="p-3 align-middle font-bold text-gray-700">{item.fileSize || "-"}</td>
                      <td className="p-3 align-middle">
                        <div className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-center text-xs font-bold text-slate-700">
                          {item.notes || "-"}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!printItems.length ? (
                    <tr>
                      <td colSpan={10} className="p-10 text-center text-sm font-bold text-gray-400">
                        אין עדיין קבצי הדפסה שהוזנו בלו״ז המפורט.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {showPrintShopsDialog ? (
            <div className={quickActionSubDialogShellClass("printShops")}>
              <div className="absolute inset-0 bg-slate-500/25 backdrop-blur-sm" onClick={() => setShowPrintShopsDialog(false)} />
              <div className={quickActionSubDialogPanelClass("printShops", "border-cyan-100")}>
                <div className="flex items-center justify-between border-b border-cyan-100 bg-cyan-50 px-5 py-4">
                  <div>
                    <h3 className="text-xl font-black text-cyan-900">בתי דפוס</h3>
                    <p className="text-xs font-bold text-cyan-700">שמות בתי הדפוס נמשכים אוטומטית משדה מקום הדפסה בטבלת הלו״ז.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                  {renderQuickActionFullscreenButton("printShops", "בתי דפוס")}
                  <button
                    type="button"
                    onClick={() => setShowPrintShopsDialog(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-100 bg-white text-cyan-700 shadow-sm hover:bg-cyan-50"
                    aria-label="סגור בתי דפוס"
                  >
                    <X size={18} />
                  </button>
                  </div>
                </div>
                <div className="overflow-auto p-4">
                  <table className="w-full min-w-[980px] text-center text-sm">
                    <thead className="sticky top-0 z-10 bg-gray-200 text-gray-800 shadow-sm">
                      <tr>
                        <th className="p-3 font-black">שם</th>
                        <th className="p-3 font-black">מס׳ קבצים</th>
                        <th className="p-3 font-black">סה״כ עותקים</th>
                        <th className="p-3 font-black">טלפון</th>
                        <th className="p-3 font-black">אימייל</th>
                        <th className="p-3 font-black">כתובת</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printShopNamesFromPrints.map((name) => {
                        const printShop = printShopsByName.get(name);
                        const stats = printShopStats.get(name) || { files: 0, copies: 0 };
                        return (
                          <tr key={name} className="border-t border-cyan-50">
                            <td className="p-3 align-middle font-black text-gray-800">{name}</td>
                            <td className="p-3 align-middle">
                              <span className="inline-flex h-9 min-w-12 items-center justify-center rounded-2xl bg-cyan-50 px-3 text-xs font-black text-cyan-700">{stats.files}</span>
                            </td>
                            <td className="p-3 align-middle font-black text-cyan-700">{stats.copies}</td>
                            <td className="p-3 align-middle">
                              <input
                                value={printShop?.phone || ""}
                                onChange={(event) => updatePrintShop(name, { phone: event.target.value })}
                                disabled={printShopsSchemaMissing}
                                className="h-10 w-full rounded-2xl border border-gray-200 px-3 text-center text-xs font-bold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100 disabled:bg-gray-50"
                              />
                            </td>
                            <td className="p-3 align-middle">
                              <input
                                value={printShop?.email || ""}
                                onChange={(event) => updatePrintShop(name, { email: event.target.value })}
                                disabled={printShopsSchemaMissing}
                                className="h-10 w-full rounded-2xl border border-gray-200 px-3 text-center text-xs font-bold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100 disabled:bg-gray-50"
                              />
                            </td>
                            <td className="p-3 align-middle">
                              <input
                                value={printShop?.address || ""}
                                onChange={(event) => updatePrintShop(name, { address: event.target.value })}
                                disabled={printShopsSchemaMissing}
                                className="h-10 w-full rounded-2xl border border-gray-200 px-3 text-center text-xs font-bold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100 disabled:bg-gray-50"
                              />
                            </td>
                          </tr>
                        );
                      })}
                      {!printShopNamesFromPrints.length ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-sm font-bold text-gray-400">
                            אין עדיין בתי דפוס. מלא מקום הדפסה בפריט הדפסה בלו״ז והוא יופיע כאן.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {activeQuickAction === "risks" ? (
        <div className={quickActionShellClass("risks")}>
          <div className="absolute inset-0 bg-slate-500/25 backdrop-blur-sm" onClick={() => setActiveQuickAction(null)} />
          <div className={quickActionPanelClass("risks", "border-red-100")}>
            <div className="flex flex-col gap-3 border-b border-red-100 bg-gradient-to-l from-red-50 to-white px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-black text-gray-900">
                  <ShieldAlert size={24} className="text-red-500" />
                  ניהול סיכונים
                </h2>
                <p className="mt-1 text-xs font-bold text-gray-500">פירוט מרוכז של כל הסיכונים שהוזנו בעמודת הבטיחות בלו״ז המפורט.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
              {renderQuickActionFullscreenButton("risks", "ניהול סיכונים")}
              <button
                type="button"
                onClick={() => setActiveQuickAction(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-800"
                aria-label="סגור ניהול סיכונים"
              >
                <X size={18} />
              </button>
              </div>
            </div>

            <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-4">
              <SummaryCard label="סה״כ סיכונים" value={riskSummary.total} icon={<ShieldAlert size={16} />} tone="red" />
              <SummaryCard label="דירוג גבוה" value={riskSummary.high} icon={<AlertTriangle size={16} />} tone="red" />
              <SummaryCard label="ללא צמצום" value={riskSummary.withoutMitigation} tone="amber" />
              <SummaryCard label="ללא אחראי" value={riskSummary.withoutOwner} tone="amber" />
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              <table className="w-full min-w-[1180px] overflow-hidden rounded-2xl text-center text-sm">
                <thead className="sticky top-0 z-10 bg-gray-200 text-gray-800 shadow-sm">
                  <tr>
                    <th className="w-64 p-3 font-black">התרחשות</th>
                    <th className="w-64 p-3 font-black">הסיכון</th>
                    <th className="w-44 p-3 font-black">דירוג הסיכון</th>
                    <th className="w-72 p-3 font-black">צמצום הסיכון</th>
                    <th className="w-52 p-3 font-black">דירוג אחרי צמצום</th>
                    <th className="w-40 p-3 font-black">אחראי</th>
                  </tr>
                </thead>
                <tbody>
                  {riskItems.map((item) => (
                    <tr
                      key={item.key}
                      className={`border-t ${riskRowToneClass(
                        item.riskLevelBefore,
                        item.likelihoodBefore,
                        item.riskLevelAfter,
                        item.likelihoodAfter,
                      )} ${!item.mitigation.trim() ? "bg-red-50/40" : ""}`}
                    >
                      <td className="p-3 align-middle">
                        <div className="whitespace-pre-wrap text-center font-black text-gray-800">{item.occurrence}</div>
                        {item.rowLabel ? <div className="mt-1 text-center text-[11px] text-gray-500">{item.rowLabel}</div> : null}
                      </td>
                      <td className="p-3 align-middle">
                        <div className="whitespace-pre-wrap rounded-2xl border border-white/70 bg-white/55 p-3 text-center text-xs text-gray-800">
                          {item.risk || "לא הוזן סיכון"}
                        </div>
                      </td>
                      <td className="p-3 align-middle">
                        <span
                          className={`inline-flex min-h-9 items-center justify-center rounded-2xl border px-3 text-xs ${riskScoreToneClass(
                            item.riskLevelBefore,
                            item.likelihoodBefore,
                          )}`}
                        >
                          {formatRiskScore(item.riskLevelBefore, item.likelihoodBefore)}
                        </span>
                      </td>
                      <td className="p-3 align-middle">
                        <RiskMitigationDisplay mitigation={item.mitigation} variant="table" />
                      </td>
                      <td className="p-3 align-middle">
                        <span
                          className={`inline-flex min-h-9 items-center justify-center rounded-2xl border px-3 text-xs ${riskScoreToneClass(
                            item.riskLevelAfter,
                            item.likelihoodAfter,
                          )}`}
                        >
                          {formatRiskScore(item.riskLevelAfter, item.likelihoodAfter)}
                        </span>
                      </td>
                      <td className="p-3 align-middle">
                        <span className="inline-flex min-h-9 items-center justify-center rounded-2xl border border-white/70 bg-white/55 px-3 text-xs text-gray-800">{item.owner || "לא הוגדר"}</span>
                      </td>
                    </tr>
                  ))}
                  {!riskItems.length ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-sm font-bold text-gray-400">
                        אין עדיין סיכונים שהוזנו בעמודת הבטיחות בלו״ז המפורט.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
      {activeQuickAction === "refunds" ? (
        <div className={quickActionShellClass("refunds")}>
          <div className="absolute inset-0 bg-slate-500/25 backdrop-blur-sm" onClick={() => setActiveQuickAction(null)} />
          <div className={quickActionPanelClass("refunds", "border-cyan-100")}>
            <div className="flex flex-col gap-3 border-b border-cyan-100 bg-gradient-to-l from-cyan-50 to-white px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-black text-gray-900">
                  <ClipboardList size={24} className="text-brand-cyan" />
                  החזר כספים
                </h2>
                <p className="mt-1 text-xs font-bold text-gray-500">העלאת חשבוניות, סכומים ושיוך לפריטי הרכש של הטיול. שליחה למזכירות המטה תתווסף בהמשך.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => { void loadPurchaseMeta(); void loadInvoices(); }} disabled={invoiceLoading || purchaseMetaLoading}>
                  {invoiceLoading || purchaseMetaLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  רענן
                </Button>
                {renderQuickActionFullscreenButton("refunds", "החזר כספים")}
                <button
                  type="button"
                  onClick={() => setActiveQuickAction(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-800"
                  aria-label="סגור החזר כספים"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {invoiceSchemaMissing ? (
              <div className="m-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                יש להריץ את המיגרציה `20260512_add_trip_plan_invoices.sql` כדי לשמור חשבוניות והחזרי כספים.
              </div>
            ) : null}
            {invoiceError ? <div className="m-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{invoiceError}</div> : null}

            <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-4">
              <SummaryCard label="חשבוניות" value={invoices.length} icon={<ClipboardList size={16} />} />
              <SummaryCard label="סה״כ סכומים" value={formatMoney(invoiceTotalAmount)} icon={<CreditCard size={16} />} tone="cyan" />
              <SummaryCard label="לא שויכו לרכש" value={unlinkedInvoiceCount} tone={unlinkedInvoiceCount ? "amber" : "cyan"} />
              <SummaryCard label="ממתינות לשליחה" value={pendingInvoiceCount} tone="amber" />
            </div>

            <div className="border-b border-gray-100 bg-cyan-50/40 p-4">
              <div className="rounded-3xl border border-cyan-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-col gap-1 text-right">
                  <h3 className="text-sm font-black text-gray-900">העלאת חשבונית חדשה</h3>
                  <p className="text-xs font-bold text-gray-500">מומלץ להזין סכום ולשייך לפריט רכש לפני ההעלאה. ניתן לערוך גם לאחר מכן.</p>
                </div>
                <div className="grid gap-2 md:grid-cols-[150px_1.5fr_1fr_1fr_1.5fr_auto]">
                  <input
                    value={invoiceDraft.amount}
                    onChange={(event) => setInvoiceDraft((prev) => ({ ...prev, amount: event.target.value }))}
                    placeholder="סכום"
                    inputMode="decimal"
                    className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-center text-xs font-bold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                  />
                  <select
                    value={invoiceDraft.equipmentId}
                    onChange={(event) => {
                      const equipmentId = event.target.value;
                      const purchase = purchaseItemsByEquipmentId.get(equipmentId);
                      setInvoiceDraft((prev) => ({
                        ...prev,
                        equipmentId,
                        supplierName: prev.supplierName || purchase?.supplier || "",
                      }));
                    }}
                    className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                  >
                    <option value="">ללא שיוך לפריט רכש</option>
                    {purchaseItems
                      .filter((item) => item.equipmentId)
                      .map((item) => (
                        <option key={item.equipmentId} value={item.equipmentId}>
                          {[item.item || "פריט רכש", item.supplier, item.rowLabel].filter(Boolean).join(" · ")}
                        </option>
                      ))}
                  </select>
                  <input
                    value={invoiceDraft.supplierName}
                    onChange={(event) => setInvoiceDraft((prev) => ({ ...prev, supplierName: event.target.value }))}
                    placeholder="ספק"
                    className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-center text-xs font-bold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                  />
                  <input
                    value={invoiceDraft.invoiceNumber}
                    onChange={(event) => setInvoiceDraft((prev) => ({ ...prev, invoiceNumber: event.target.value }))}
                    placeholder="מס׳ חשבונית"
                    className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-center text-xs font-bold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                  />
                  <input
                    value={invoiceDraft.notes}
                    onChange={(event) => setInvoiceDraft((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="הערות"
                    className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-center text-xs font-bold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                  />
                  <label className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 text-xs font-black text-white shadow-sm ${invoiceUploading || invoiceSchemaMissing ? "bg-gray-300" : "bg-brand-cyan hover:bg-cyan-600"}`}>
                    {invoiceUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    העלאה
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      disabled={invoiceUploading || invoiceSchemaMissing}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void uploadInvoice(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              <table className="w-full min-w-[1240px] overflow-hidden rounded-2xl text-center text-sm">
                <thead className="sticky top-0 z-10 bg-gray-200 text-gray-800 shadow-sm">
                  <tr>
                    <th className="p-3 font-black">חשבונית</th>
                    <th className="w-32 p-3 font-black">סכום</th>
                    <th className="w-52 p-3 font-black">שיוך לפריט רכש</th>
                    <th className="w-40 p-3 font-black">ספק</th>
                    <th className="w-36 p-3 font-black">מס׳ חשבונית</th>
                    <th className="w-44 p-3 font-black">סטטוס</th>
                    <th className="p-3 font-black">הערות</th>
                    <th className="w-36 p-3 font-black">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const linkedPurchase = invoice.equipment_id ? purchaseItemsByEquipmentId.get(invoice.equipment_id) : null;
                    return (
                      <tr key={invoice.id} className="border-t border-cyan-50 bg-white hover:bg-cyan-50/30">
                        <td className="p-3 align-middle">
                          <button
                            type="button"
                            onClick={() => void openInvoiceFile(invoice.file_url)}
                            className="inline-flex min-h-10 max-w-56 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 px-3 text-xs font-black text-cyan-800 hover:bg-cyan-100"
                            title={invoice.file_name}
                          >
                            <span className="truncate">{invoice.file_name || "חשבונית"}</span>
                          </button>
                          {invoice.created_at ? <div className="mt-1 text-[11px] font-bold text-gray-400">{new Date(invoice.created_at).toLocaleDateString("he-IL")}</div> : null}
                        </td>
                        <td className="p-3 align-middle">
                          <input
                            value={String(invoice.amount ?? "")}
                            onChange={(event) => updateInvoice(invoice.id, { amount: event.target.value })}
                            placeholder="0"
                            inputMode="decimal"
                            className="h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-center text-xs font-bold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                          />
                        </td>
                        <td className="p-3 align-middle">
                          <select
                            value={invoice.equipment_id || ""}
                            onChange={(event) => {
                              const equipmentId = event.target.value;
                              const purchase = purchaseItemsByEquipmentId.get(equipmentId);
                              updateInvoice(invoice.id, {
                                equipment_id: equipmentId || null,
                                supplier_name: invoice.supplier_name || purchase?.supplier || "",
                              });
                            }}
                            className="h-10 w-full rounded-2xl border border-gray-200 bg-white px-2 text-xs font-bold text-gray-700 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                          >
                            <option value="">ללא שיוך</option>
                            {purchaseItems
                              .filter((item) => item.equipmentId)
                              .map((item) => (
                                <option key={item.equipmentId} value={item.equipmentId}>
                                  {[item.item || "פריט רכש", item.supplier, item.rowLabel].filter(Boolean).join(" · ")}
                                </option>
                              ))}
                          </select>
                          {linkedPurchase ? <div className="mt-1 text-[11px] font-bold text-gray-400">{linkedPurchase.rowLabel}</div> : null}
                        </td>
                        <td className="p-3 align-middle">
                          <input
                            value={invoice.supplier_name || ""}
                            onChange={(event) => updateInvoice(invoice.id, { supplier_name: event.target.value })}
                            placeholder="ספק"
                            className="h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-center text-xs font-bold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                          />
                        </td>
                        <td className="p-3 align-middle">
                          <input
                            value={invoice.invoice_number || ""}
                            onChange={(event) => updateInvoice(invoice.id, { invoice_number: event.target.value })}
                            placeholder="מספר"
                            className="h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-center text-xs font-bold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                          />
                        </td>
                        <td className="p-3 align-middle">
                          <StyledStatusSelect
                            value={invoice.submission_status || "draft"}
                            onChange={(next) => updateInvoice(invoice.id, { submission_status: next })}
                            options={invoiceSubmissionStatusOptions}
                            tone="emerald"
                          />
                          <button
                            type="button"
                            disabled
                            className="mt-1 w-full rounded-xl border border-gray-100 bg-gray-50 px-2 py-1 text-[11px] font-bold text-gray-400"
                            title="יופעל לאחר יצירת משתמש מזכירות המטה"
                          >
                            שליחה למזכירות בהמשך
                          </button>
                        </td>
                        <td className="p-3 align-middle">
                          <input
                            value={invoice.notes || ""}
                            onChange={(event) => updateInvoice(invoice.id, { notes: event.target.value })}
                            placeholder="הערות"
                            className="h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-center text-xs font-bold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                          />
                        </td>
                        <td className="p-3 align-middle">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => void openInvoiceFile(invoice.file_url)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-100 bg-white text-cyan-700 shadow-sm hover:bg-cyan-50"
                              aria-label="פתיחת חשבונית"
                            >
                              <ExternalLink size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteInvoice(invoice.id)}
                              disabled={deletingInvoiceId === invoice.id}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-white text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-60"
                              aria-label="מחיקת חשבונית"
                            >
                              {deletingInvoiceId === invoice.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!invoices.length ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-sm font-bold text-gray-400">
                        עדיין לא הועלו חשבוניות לטיול.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
      {activeQuickAction === "purchases" ? (
        <div className={quickActionShellClass("purchases")}>
          <div className="absolute inset-0 bg-slate-500/25 backdrop-blur-sm" onClick={() => setActiveQuickAction(null)} />
          <div className={quickActionPanelClass("purchases", "border-cyan-100")}>
            <div className="flex flex-col gap-3 border-b border-cyan-100 bg-gradient-to-l from-cyan-50 to-white px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-black text-gray-900">
                  <ShoppingCart size={24} className="text-brand-cyan" />
                  רשימת רכש
                </h2>
                <p className="mt-1 text-xs font-bold text-gray-500">הנתונים נמשכים אוטומטית מפריטי ציוד שסומנו כ־רכש בטבלת הלו״ז המפורט.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => setShowSuppliersDialog(true)}>
                  <Building2 size={14} />
                  ספקים
                </Button>
                <Button variant="outline" onClick={() => void loadPurchaseMeta()} disabled={purchaseMetaLoading}>
                  {purchaseMetaLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  רענן
                </Button>
                {renderQuickActionFullscreenButton("purchases", "רשימת רכש")}
                <button
                  type="button"
                  onClick={() => setActiveQuickAction(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-800"
                  aria-label="סגור רשימת רכש"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {purchaseSchemaMissing ? (
              <div className="m-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                יש להריץ את המיגרציה `20260509_add_trip_plan_purchase_tracking.sql` כדי לשמור סטטוס, אחראי ופרטי ספקים.
              </div>
            ) : null}
            {purchaseMetaError ? <div className="m-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{purchaseMetaError}</div> : null}

            <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-5">
              <SummaryCard label="פריטי רכש" value={purchaseItems.length} icon={<ShoppingCart size={16} />} />
              <SummaryCard label="ספקים" value={supplierNamesFromPurchases.length} icon={<Building2 size={16} />} />
              <SummaryCard label="ללא סטטוס" value={purchaseItems.filter((item) => !item.status.trim()).length} tone="amber" />
              <SummaryCard label="ללא אחראי" value={purchaseItems.filter((item) => !item.owner.trim()).length} tone="red" />
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-700">
                <div className="flex items-center gap-2 text-xs font-black">
                  <CreditCard size={16} />
                  סה״כ עלות
                </div>
                <div className="mt-1 text-2xl font-black">{formatMoney(purchaseTotalCost)}</div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              <table className="w-full min-w-[1120px] overflow-hidden rounded-2xl text-center text-sm">
                <thead className="sticky top-0 z-10 bg-gray-200 text-gray-800 shadow-sm">
                  <tr>
                    <th className="p-3 font-black">פריט</th>
                    <th className="w-28 p-3 font-black">כמות</th>
                    <th className="w-28 p-3 font-black">סוג</th>
                    <th className="p-3 font-black">ספק</th>
                    <th className="w-36 p-3 font-black">מחיר ליח׳</th>
                    <th className="w-36 p-3 font-black">מחיר להכל</th>
                    <th className="w-44 p-3 font-black">סטטוס</th>
                    <th className="w-44 p-3 font-black">אחראי</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseItems.map((purchase) => (
                    <tr key={purchase.key} className="border-t border-cyan-50 bg-white hover:bg-cyan-50/30">
                      <td className="p-3 align-middle">
                        <div className="font-black text-gray-800">{purchase.item || "ללא שם פריט"}</div>
                        {purchase.rowLabel ? <div className="mt-1 text-[11px] font-bold text-gray-400">{purchase.rowLabel}</div> : null}
                      </td>
                      <td className="p-3 align-middle font-bold text-gray-700">{purchase.quantity || "-"}</td>
                      <td className="p-3 align-middle font-bold text-gray-700">{purchase.quantityUnit || "-"}</td>
                      <td className="p-3 align-middle">
                        <span className="inline-flex min-h-9 items-center rounded-2xl bg-purple-50 px-3 text-xs font-black text-purple-700">{purchase.supplier || "לא הוגדר ספק"}</span>
                      </td>
                      <td className="p-3 align-middle">
                        <input
                          value={purchase.unitPrice}
                          onChange={(event) => purchase.equipmentId && updatePurchaseOverride(purchase.equipmentId, { unitPrice: event.target.value })}
                          disabled={!purchase.equipmentId || purchaseSchemaMissing}
                          placeholder="0"
                          inputMode="decimal"
                          className="h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-center text-xs font-bold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </td>
                      <td className="p-3 align-middle font-black text-emerald-700">{formatMoney(purchase.totalPrice)}</td>
                      <td className="p-3 align-middle">
                        <StyledStatusSelect
                          value={purchase.status}
                          onChange={(next) => purchase.equipmentId && updatePurchaseOverride(purchase.equipmentId, { status: next })}
                          disabled={!purchase.equipmentId || purchaseSchemaMissing}
                          options={purchaseStatusOptions}
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <input
                          value={purchase.owner}
                          onChange={(event) => purchase.equipmentId && updatePurchaseOverride(purchase.equipmentId, { owner: event.target.value })}
                          disabled={!purchase.equipmentId || purchaseSchemaMissing}
                          placeholder="אחראי"
                          className="h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-center text-xs font-bold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </td>
                    </tr>
                  ))}
                  {!purchaseItems.length ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-sm font-bold text-gray-400">
                        אין עדיין פריטי ציוד שסומנו כ־רכש בלו״ז המפורט.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
                {purchaseItems.length ? (
                  <tfoot className="border-t border-cyan-100 bg-cyan-50/70">
                    <tr>
                      <td colSpan={5} className="p-4 text-left text-sm font-black text-cyan-900">
                        סה״כ עלות
                      </td>
                      <td className="p-4 text-center text-lg font-black text-emerald-700">{formatMoney(purchaseTotalCost)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </div>

          {showSuppliersDialog ? (
            <div className={quickActionSubDialogShellClass("suppliers")}>
              <div className="absolute inset-0 bg-slate-500/25 backdrop-blur-sm" onClick={() => setShowSuppliersDialog(false)} />
              <div className={quickActionSubDialogPanelClass("suppliers", "border-purple-100")}>
                <div className="flex items-center justify-between border-b border-purple-100 bg-purple-50 px-5 py-4">
                  <div>
                    <h3 className="text-xl font-black text-purple-900">ספקים</h3>
                    <p className="text-xs font-bold text-purple-700">שמות הספקים נמשכים אוטומטית משדה הספק בטבלת הלו״ז.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                  {renderQuickActionFullscreenButton("suppliers", "ספקים")}
                  <button
                    type="button"
                    onClick={() => setShowSuppliersDialog(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-100 bg-white text-purple-700 shadow-sm hover:bg-purple-50"
                    aria-label="סגור ספקים"
                  >
                    <X size={18} />
                  </button>
                  </div>
                </div>
                <div className="overflow-auto p-4">
                  <table className="w-full min-w-[980px] text-center text-sm">
                    <thead className="sticky top-0 z-10 bg-gray-200 text-gray-800 shadow-sm">
                      <tr>
                        <th className="p-3 font-black">שם</th>
                        <th className="p-3 font-black">מס׳ פריטים</th>
                        <th className="p-3 font-black">סה״כ כסף</th>
                        <th className="p-3 font-black">טלפון</th>
                        <th className="p-3 font-black">אימייל</th>
                        <th className="p-3 font-black">כתובת</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierNamesFromPurchases.map((name) => {
                        const supplier = suppliersByName.get(name);
                        const stats = supplierPurchaseStats.get(name) || { count: 0, total: 0 };
                        return (
                          <tr key={name} className="border-t border-purple-50">
                            <td className="p-3 align-middle font-black text-gray-800">{name}</td>
                            <td className="p-3 align-middle">
                              <span className="inline-flex h-9 min-w-12 items-center justify-center rounded-2xl bg-cyan-50 px-3 text-xs font-black text-cyan-700">{stats.count}</span>
                            </td>
                            <td className="p-3 align-middle font-black text-emerald-700">{formatMoney(stats.total)}</td>
                            <td className="p-3 align-middle">
                              <input
                                value={supplier?.phone || ""}
                                onChange={(event) => updateSupplier(name, { phone: event.target.value })}
                                disabled={purchaseSchemaMissing}
                                className="h-10 w-full rounded-2xl border border-gray-200 px-3 text-center text-xs font-bold outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50"
                              />
                            </td>
                            <td className="p-3 align-middle">
                              <input
                                value={supplier?.email || ""}
                                onChange={(event) => updateSupplier(name, { email: event.target.value })}
                                disabled={purchaseSchemaMissing}
                                className="h-10 w-full rounded-2xl border border-gray-200 px-3 text-center text-xs font-bold outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50"
                              />
                            </td>
                            <td className="p-3 align-middle">
                              <input
                                value={supplier?.address || ""}
                                onChange={(event) => updateSupplier(name, { address: event.target.value })}
                                disabled={purchaseSchemaMissing}
                                className="h-10 w-full rounded-2xl border border-gray-200 px-3 text-center text-xs font-bold outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50"
                              />
                            </td>
                          </tr>
                        );
                      })}
                      {!supplierNamesFromPurchases.length ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-sm font-bold text-gray-400">
                            אין עדיין ספקים. מלא ספק בפריט רכש בטבלת הלו״ז והוא יופיע כאן.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {insertDialog.open ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={() => setInsertDialog((prev) => ({ ...prev, open: false }))} />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
            <h3 className="text-xl font-black text-gray-800">הוספת שורה</h3>
            <p className="mt-2 text-sm font-bold text-gray-500">בחר תאריך לשורה החדשה</p>
            <div className="mt-4 grid max-h-52 gap-2 overflow-auto">
              {dayOptions.map((dayIndex) => {
                const day = getDayDisplay(dayIndex);
                const selected = insertDialog.dayIndex === dayIndex;
                const allowed = isDayAllowedForInsert(dayIndex);
                return (
                  <button
                    key={dayIndex}
                    type="button"
                    disabled={!allowed}
                    onClick={() =>
                      setInsertDialog((prev) => ({
                        ...prev,
                        dayIndex,
                        customDate: dayIndexToIso(dayIndex),
                      }))
                    }
                    className={`rounded-2xl border px-3 py-2 text-sm font-black transition-colors ${
                      selected
                        ? "border-brand-cyan bg-cyan-50 text-brand-cyan"
                        : !allowed
                          ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {day.greg || `יום ${dayIndex}`}
                    {day.heb ? <span className="ms-2 text-xs text-gray-500">{day.heb}</span> : null}
                  </button>
                );
              })}
            </div>
            <label className="mt-4 block text-sm font-black text-gray-700">
              תאריך אחר
              <input
                type="date"
                value={insertDialog.customDate}
                min={dayIndexToIso(insertDialog.minDayIndex)}
                max={insertDialog.maxDayIndex ? dayIndexToIso(insertDialog.maxDayIndex) : undefined}
                onChange={(e) => {
                  const rawDayIndex = dateToDayIndex(e.target.value) || insertDialog.dayIndex;
                  const dayIndex = clampInsertDayIndex(rawDayIndex);
                  setInsertDialog((prev) => ({ ...prev, customDate: dayIndexToIso(dayIndex), dayIndex }));
                }}
                className="mt-2 h-10 w-full rounded-xl border border-gray-200 px-3 text-center text-sm font-bold focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
              />
            </label>
            <p className="mt-2 text-xs font-bold text-gray-500">
              ניתן לבחור רק תאריך ששומר על סדר התאריכים בטבלה.
            </p>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setInsertDialog((prev) => ({ ...prev, open: false }))}>
                ביטול
              </Button>
              <Button
                className="flex-1"
                onClick={() => void insertRow(insertDialog.position, insertDialog.relativeRowId, insertDialog.dayIndex)}
              >
                הוסף
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {sensitiveDialog ? (
        <SensitiveLocationDialog
          matchedLabel={sensitiveDialog.matchedLabel}
          onConfirm={sensitiveDialog.onConfirm}
          onClose={() => {
            setSensitiveDialog(null);
            void saveRowById(sensitiveDialog.rowId);
          }}
        />
      ) : null}
      <Modal
        isOpen={Boolean(confirmDeleteRowId)}
        onClose={() => setConfirmDeleteRowId(null)}
        type="confirm"
        title="מחיקת שורה"
        message="האם למחוק את השורה הזו?"
        confirmText="מחק"
        cancelText="ביטול"
        onConfirm={() => {
          if (!confirmDeleteRowId) return;
          void deleteRow(confirmDeleteRowId);
        }}
      />
      {riskDialog.open ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={() => setRiskDialog((p) => ({ ...p, open: false }))} />
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl text-center">
            <h3 className="text-xl font-black text-gray-800">
              ניהול והערכת סיכון
              {riskDialog.stage === "after" ? (
                <span className="mt-1 block text-sm font-bold text-sky-700">אחרי הפעולות לצמצום הסיכון</span>
              ) : null}
            </h3>
            <p className="mt-3 text-sm font-bold text-red-700">פירוט הסכנה</p>
            <p className="mt-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-base font-semibold text-red-800">
              {riskDialog.riskText}
            </p>
            {riskDialog.stage === "after" && riskDialog.mitigationText ? (
              <>
                <p className="mt-3 text-sm font-bold text-sky-700">צמצום</p>
                <p className="mt-1 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">
                  {riskDialog.mitigationText}
                </p>
              </>
            ) : null}

            <div className="mt-4">
              <div className="text-xs font-bold text-gray-600 mb-2">רמת סיכון (1-5)</div>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={`risk-${v}`}
                    type="button"
                    onClick={() => setRiskDialog((p) => ({ ...p, riskLevel: v }))}
                    className={`h-8 w-8 rounded-md border text-xs font-bold transition-colors ${getRiskScoreButtonClass(
                      v,
                      riskDialog.riskLevel === v,
                    )}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-bold text-gray-600 mb-2">שכיחות (1-5)</div>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={`like-${v}`}
                    type="button"
                    onClick={() => setRiskDialog((p) => ({ ...p, likelihood: v }))}
                    className={`h-8 w-8 rounded-md border text-xs font-bold transition-colors ${getRiskScoreButtonClass(
                      v,
                      riskDialog.likelihood === v,
                    )}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" onClick={() => setRiskDialog((p) => ({ ...p, open: false }))} className="h-9 px-3 text-xs">
                ביטול
              </Button>
              <Button
                onClick={() => void saveRiskDialog()}
                className="h-9 px-3 text-xs"
                disabled={riskDialog.riskLevel === null || riskDialog.likelihood === null}
              >
                שמור דירוג
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {riskSummaryDialog.open ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-sm"
            onClick={() => setRiskSummaryDialog((prev) => ({ ...prev, open: false }))}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl text-center">
            <h3 className="text-xl font-black text-gray-800">ניהול והערכת סיכון</h3>
            <p className="mt-3 text-sm font-bold text-red-700">פירוט הסכנה</p>
            <p className="mt-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-base font-semibold text-red-800">
              {riskSummaryDialog.riskText || "לא הוזן"}
            </p>
            <p className="mt-3 text-sm font-bold text-sky-700">צמצום</p>
            <p className="mt-1 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">
              {riskSummaryDialog.mitigationText || "לא הוזן"}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-gray-200 bg-slate-50 p-3">
                <p className="font-black text-gray-700">לפני צמצום</p>
                <p className="mt-1 text-gray-600">רמת סיכון: {riskSummaryDialog.riskLevelBefore ?? "לא הוזן"}</p>
                <p className="text-gray-600">שכיחות: {riskSummaryDialog.likelihoodBefore ?? "לא הוזן"}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-slate-50 p-3">
                <p className="font-black text-gray-700">אחרי צמצום</p>
                <p className="mt-1 text-gray-600">רמת סיכון: {riskSummaryDialog.riskLevelAfter ?? "לא הוזן"}</p>
                <p className="text-gray-600">שכיחות: {riskSummaryDialog.likelihoodAfter ?? "לא הוזן"}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <Button onClick={() => setRiskSummaryDialog((prev) => ({ ...prev, open: false }))} className="h-9 px-4 text-xs">
                סגור
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {printQuickDialogRowId ? (
        <PlanPrintQuickDialog
          draft={getPrintDraft(printQuickDialogRowId)}
          uploading={uploadingRowId === printQuickDialogRowId}
          printLocationSuggestions={printLocationSuggestions}
          fieldClass={fieldClass}
          savePromptOpen={printDialogSavePrompt}
          uploadError={printUploadError}
          onDraftChange={(patch) => updatePrintDraft(printQuickDialogRowId, patch)}
          onUpload={() => void addPrintFile(printQuickDialogRowId, { showFollowUpPrompt: true })}
          onClose={() => {
            setPrintQuickDialogRowId(null);
            setPrintDialogSavePrompt(false);
          }}
          onFollowUp={(action, meta) => handleRowFollowUp(printQuickDialogRowId, action, meta)}
          onAddAnotherPrint={() => {
            updatePrintDraft(printQuickDialogRowId, {
              file: null,
              quantity: "",
              print_size: "",
              page_type: "",
              print_location: "",
            });
            setPrintDialogSavePrompt(false);
          }}
        />
      ) : null}
      <PlanTableTourPicker
        open={tourPickerOpen}
        onClose={() => setTourPickerOpen(false)}
        onSelect={(section) => {
          setTourPickerOpen(false);
          setActiveTourSteps(getTourStepsForSection(section));
          setActiveTab(getInitialTabForTourSection(section));
          const peopleSection = getInitialPeopleSectionForTourSection(section);
          setTourPeopleSection(peopleSection);
          setPlanTourForceOpen(true);
        }}
      />
      <PlanTableTour
        enabled={!loading}
        steps={activeTourSteps ?? undefined}
        forceOpen={planTourForceOpen}
        markCompleted={!activeTourSteps}
        onForceOpenConsumed={() => setPlanTourForceOpen(false)}
        onClose={() => setActiveTourSteps(null)}
        onNavigate={({ tab, peopleSection }) => {
          if (tab) setActiveTab(tab);
          if (peopleSection) setTourPeopleSection(peopleSection);
        }}
      />
    </>
  );
}
