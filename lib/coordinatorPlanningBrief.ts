import { getRowRegulationHints } from "@/lib/regulation/compliance";
import { documentCatalog } from "@/lib/tripDocumentsCatalog";
import {
  getDocumentReadiness,
  getUploadedDocumentFiles,
  type AutofillPlanRow,
  type TripAutofillMeta,
} from "@/lib/tripDocumentAutofill";
import type { RequiredStaffPlanRow } from "@/lib/tripRequiredRoles";

export type PlanningRequirementTone = "amber" | "cyan" | "emerald" | "violet" | "slate";

export type PlanningRequirementItem = {
  id: string;
  label: string;
  detail?: string;
  tone: PlanningRequirementTone;
};

export type PlanningDocumentSummary = {
  total: number;
  autoReady: number;
  needUpload: number;
  needAttention: number;
  pendingUploadTitles: string[];
};

export type CoordinatorPlanningBrief = {
  requirements: PlanningRequirementItem[];
  staffRoles: Array<{ role_key: string; role_label: string; approved_quantity: number }>;
  documents: PlanningDocumentSummary;
  coordinationBySafetyDept: boolean;
  planRowCount: number;
};

type DocumentOverride = {
  document_key: string;
  status?: string | null;
  pdf_url?: string | null;
  form_data?: Record<string, unknown> | null;
};

function timelineNeedsMokedTeva(details: Record<string, unknown>) {
  const timeline = Array.isArray(details.timeline) ? (details.timeline as Array<Record<string, unknown>>) : [];
  for (const item of timeline) {
    const category = String(item.category || "");
    const sub = String(item.finalSubCategory || item.subCategory || "");
    if (item.sensitiveLocation) return true;
    const hints = getRowRegulationHints(category, sub);
    if (hints.needsMokedTeva) return true;
  }
  return Boolean(details.requiresSensitiveCoordination || details.inSensitiveArea || details.sensitiveArea);
}

export function buildCoordinatorPlanningBrief(input: {
  trip: TripAutofillMeta & { start_date?: string | null };
  tripDetails: Record<string, unknown>;
  requiredStaffRows: RequiredStaffPlanRow[];
  documentOverrides: DocumentOverride[];
  planRows: AutofillPlanRow[];
}): CoordinatorPlanningBrief {
  const requirements: PlanningRequirementItem[] = [];
  const activeStaff = input.requiredStaffRows.filter(
    (row) => row.status !== "removed" && row.approved_quantity > 0,
  );

  if (activeStaff.length > 0) {
    for (const row of activeStaff) {
      requirements.push({
        id: `staff-${row.role_key}`,
        label: `${row.approved_quantity} ${row.role_label}`,
        detail: row.source_summary,
        tone: "emerald",
      });
    }
  } else {
    requirements.push({
      id: "staff-pending",
      label: "מצבת צוות מינימלית",
      detail: "מחלקת הבטיחות והמפעלים מאשרת את תקני הצוות — יוצגו כאן לאחר האישור.",
      tone: "slate",
    });
  }

  const uploadedFilesByDocumentKey = Object.fromEntries(
    documentCatalog.map((document) => {
      const override = input.documentOverrides.find((item) => item.document_key === document.key);
      return [document.key, getUploadedDocumentFiles(override?.form_data, override?.pdf_url)];
    }),
  );

  const tripContext = {
    trip: input.trip,
    rows: input.planRows,
    participantsPayload: {
      participants: [],
      staff: [],
      buses: [],
      assignmentSets: [],
    },
    uploadedFilesByDocumentKey,
  };

  const pendingUploadTitles: string[] = [];
  let autoReady = 0;
  let needUpload = 0;
  let needAttention = 0;

  for (const document of documentCatalog) {
    const override = input.documentOverrides.find((item) => item.document_key === document.key);
    const uploadedFiles = uploadedFilesByDocumentKey[document.key] || [];
    const readiness = getDocumentReadiness(document, tripContext, override?.form_data);
    const overrideStatus = override?.status === "לא נדרש" ? "לא נדרש" : readiness.status;
    const isReady = overrideStatus === "מוכן PDF" || overrideStatus === "לא נדרש";
    if (isReady) autoReady += 1;
    else needAttention += 1;

    if (document.handlingKind === "upload-or-link" && overrideStatus !== "לא נדרש" && uploadedFiles.length === 0) {
      needUpload += 1;
      pendingUploadTitles.push(document.title);
    }
  }

  if (needUpload > 0) {
    requirements.push({
      id: "documents-upload",
      label: `העלאת קבצים — ${needUpload} מסמכים`,
      detail: pendingUploadTitles.slice(0, 4).join(" · ") + (pendingUploadTitles.length > 4 ? "…" : ""),
      tone: "amber",
    });
  }

  requirements.push({
    id: "documents-auto",
    label: `מסמכי תיק הטיול — ${autoReady} מוכנים אוטומטית מתוך התכנון`,
    detail:
      needAttention > 0
        ? `${needAttention} מסמכים דורשים השלמה או עדכון לפני הדפסה.`
        : "כל המסמכים האוטומטיים מוכנים לפי נתוני התכנון.",
    tone: "cyan",
  });

  const coordinationBySafetyDept = timelineNeedsMokedTeva(input.tripDetails);
  if (coordinationBySafetyDept) {
    requirements.push({
      id: "coordination",
      label: "תיאום טיול",
      detail: 'יבוצע על ידי מחלקת הבטיחות והמפעלים (מוקד טבע / לשכה לתיאום טיולים לפי הצורך).',
      tone: "violet",
    });
  }

  if (input.planRows.length === 0) {
    requirements.push({
      id: "schedule",
      label: "מילוי לו״ז מפורט",
      detail: "יש להשלים את לוח הזמנים וההיערכות במסך התכנון המפורט.",
      tone: "amber",
    });
  }

  return {
    requirements,
    staffRoles: activeStaff.map((row) => ({
      role_key: row.role_key,
      role_label: row.role_label,
      approved_quantity: row.approved_quantity,
    })),
    documents: {
      total: documentCatalog.length,
      autoReady,
      needUpload,
      needAttention,
      pendingUploadTitles,
    },
    coordinationBySafetyDept,
    planRowCount: input.planRows.length,
  };
}
