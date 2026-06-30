import { tripNeedsBusinessLicense, tripNeedsMokedTevaCoordination } from "@/lib/regulation/compliance";
import { getUploadedDocumentFiles, type UploadedDocumentFile } from "@/lib/tripDocumentAutofill";
import {
  assignLicenseFilesToTargets,
  buildTripPlanLicenseTargets,
  type PlanRowLicenseInput,
  type TripPlanLicenseTarget,
} from "@/lib/tripPlanLicenseTargets";

export const TRIP_TASK_SAFETY_OWNER = "מחלקת בטיחות ומפעלים";

export type TripPlanTaskKind = "coordination" | "document_upload";

export type TripPlanTaskUploadContext = {
  planRowId?: string;
  scheduleLabel?: string;
  occurrenceLabel?: string;
  businessName?: string;
  uploadKind?: "license" | "insurance";
};

export type TripPlanTask = {
  id: string;
  title: string;
  description: string;
  owner: string;
  kind: TripPlanTaskKind;
  documentKey?: string;
  coordinatorCanUpload: boolean;
  status: "open" | "done" | "not_required";
  note: string;
  uploadedFiles: UploadedDocumentFile[];
  licenseTargets?: TripPlanLicenseTarget[];
  unmatchedLicenseFiles?: UploadedDocumentFile[];
};

type DocumentOverrideLike = {
  document_key: string;
  status?: string | null;
  note?: string | null;
  pdf_url?: string | null;
  form_data?: Record<string, unknown> | null;
};

function taskStatusFromOverride(override?: DocumentOverrideLike): TripPlanTask["status"] {
  if (!override) return "open";
  if (override.status === "לא נדרש") return "not_required";
  const files = getUploadedDocumentFiles(override.form_data, override.pdf_url);
  if (files.length > 0 || override.status === "מוכן PDF" || override.status === "נבדק") return "done";
  return "open";
}

function licenseTaskStatus(targets: TripPlanLicenseTarget[], unmatchedFiles: UploadedDocumentFile[]): TripPlanTask["status"] {
  if (!targets.length) return "open";
  if (targets.every((target) => target.status === "done")) return "done";
  if (targets.some((target) => target.uploadedFiles.length > 0) || unmatchedFiles.length > 0) return "open";
  return "open";
}

export function buildTripPlanTasks(input: {
  planRows: PlanRowLicenseInput[];
  documentOverrides: DocumentOverrideLike[];
  tripDetails?: Record<string, unknown>;
}): TripPlanTask[] {
  const overrideByKey = new Map(input.documentOverrides.map((item) => [item.document_key, item]));
  const tasks: TripPlanTask[] = [];

  if (tripNeedsMokedTevaCoordination(input)) {
    const override = overrideByKey.get("moked-teva-approval");
    tasks.push({
      id: "moked-teva-coordination",
      title: "תיאום מוקד טבע",
      description:
        "תיאום הטיול מול מוקד טבע / הלשכה לתיאום טיולים. העלאת אישור התיאום תסתנכרן אוטומטית עם מסמך «אישור מוקד טבע» בתיק הטיול.",
      owner: TRIP_TASK_SAFETY_OWNER,
      kind: "coordination",
      documentKey: "moked-teva-approval",
      coordinatorCanUpload: true,
      status: taskStatusFromOverride(override),
      note: String(override?.note || "").trim(),
      uploadedFiles: getUploadedDocumentFiles(override?.form_data, override?.pdf_url),
    });
  }

  if (tripNeedsBusinessLicense(input.planRows)) {
    const override = overrideByKey.get("business-license-insurance");
    const allFiles = getUploadedDocumentFiles(override?.form_data, override?.pdf_url);
    const licenseTargets = buildTripPlanLicenseTargets(input.planRows);
    const { targets, unmatchedFiles } = assignLicenseFilesToTargets(licenseTargets, allFiles);
    tasks.push({
      id: "business-license-insurance",
      title: "רישוי עסק וביטוחים",
      description:
        "העלאת רישיון עסק, ביטוח בתוקף ואישורי בטיחות/בריאות לכל התרחשות בלו״ז שדורשת רישוי — לפי העסק/ספק הרלוונטי.",
      owner: "רכז הטיול",
      kind: "document_upload",
      documentKey: "business-license-insurance",
      coordinatorCanUpload: true,
      status: licenseTaskStatus(targets, unmatchedFiles),
      note: String(override?.note || "").trim(),
      uploadedFiles: allFiles,
      licenseTargets: targets,
      unmatchedLicenseFiles: unmatchedFiles,
    });
  }

  return tasks;
}

export function tripPlanTaskRowKey(taskId: string, planRowId?: string | null) {
  return planRowId ? `${taskId}:${planRowId}` : taskId;
}

export const BUSINESS_LICENSE_TASK_ID = "business-license-insurance";
export const MOKED_TEVA_TASK_ID = "moked-teva-coordination";
