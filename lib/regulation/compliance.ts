import preparationChecklist from "@/lib/regulation/chapter-a/preparation-checklist.json";
import coordinationRules from "@/lib/regulation/chapter-a/coordination-rules.json";
import businessLicenseMatrix from "@/lib/regulation/chapter-a/business-license-matrix.json";
import insuranceIncidents from "@/lib/regulation/chapter-a/insurance-and-incidents.json";
import licensedScheduleMap from "@/lib/regulation/licensed-schedule-map.json";
import { normalizeScheduleLabel } from "@/lib/regulation/normalize";
import {
  collectRegulationContextFromPlanRows,
  findPreparationTablesForTripContext,
  getRequirementsForTripContext,
  getRegulationActivity,
  resolvePlanCategoryFromEventLabel,
  tripHasSensitiveActivity,
} from "@/lib/regulation/index";
import type { TripSensitiveContext } from "@/lib/regulation/sensitive-locations";
import type {
  ComplianceItem,
  ComplianceItemStatus,
  CoordinationRule,
  LicenseMatrixRow,
  LicensedScheduleMapRow,
  ActivityPreparationTable,
  PreparationChecklistItem,
  RegulationRequirement,
  TripComplianceResult,
} from "@/lib/regulation/types";

export type TripComplianceDocument = {
  key: string;
  status?: string | null;
  pdfUrl?: string | null;
  hasFormData?: boolean;
};

export type TripComplianceStaffRole = {
  roleKey: string;
  assigned: boolean;
};

export type EvaluateTripComplianceInput = {
  planRows: Array<{
    category?: string | null;
    subCategory?: string | null;
    finalSubCategory?: string | null;
    eventText?: string | null;
  }>;
  documents?: TripComplianceDocument[];
  staffRoles?: TripComplianceStaffRole[];
  tripDetails?: TripSensitiveContext["tripDetails"];
  planRowsWithLocation?: TripSensitiveContext["planRows"];
};

const DISCLAIMER =
  "מבוסס על חוזר מנכ\"ל 585 (הוראה 0467) — לא ייעוץ משפטי. יש לאמת מול המקור הרשמי ומוקד טבע.";

const DOCUMENT_DONE_STATUSES = new Set(["מוכן PDF", "נבדק", "לא נדרש"]);

const scheduleRows = licensedScheduleMap as LicensedScheduleMapRow[];

export function findLicensedScheduleRow(
  planCategoryKey?: string | null,
  planSubCategoryLabel?: string | null,
): LicensedScheduleMapRow | undefined {
  const sub = normalizeScheduleLabel(planSubCategoryLabel || "");
  if (!sub) return undefined;
  const category = String(planCategoryKey || "").trim() || resolvePlanCategoryFromEventLabel(sub).categoryKey || "";
  return (
    scheduleRows.find(
      (row) => row.planCategoryKey === category && normalizeScheduleLabel(row.planSubCategoryLabel) === sub,
    ) || scheduleRows.find((row) => normalizeScheduleLabel(row.planSubCategoryLabel) === sub)
  );
}

function isDocumentMet(doc: TripComplianceDocument | undefined): boolean {
  if (!doc) return false;
  const status = String(doc.status || "").trim();
  if (DOCUMENT_DONE_STATUSES.has(status)) return true;
  if (Boolean(String(doc.pdfUrl || "").trim())) return true;
  if (doc.hasFormData) return true;
  return false;
}

function isStaffRoleMet(staffRoles: TripComplianceStaffRole[] | undefined, roleKey: string): boolean {
  return Boolean(staffRoles?.find((r) => r.roleKey === roleKey)?.assigned);
}

function requirementCategory(kind: RegulationRequirement["kind"]): ComplianceItem["category"] {
  switch (kind) {
    case "document":
      return "document";
    case "staff_role":
    case "staff_minimum":
      return "staff";
    case "approval":
      return "approval";
    case "coordination":
      return "coordination";
    case "license":
      return "license";
    default:
      return "other";
  }
}

function evaluateRequirement(
  req: RegulationRequirement,
  documents: TripComplianceDocument[] | undefined,
  staffRoles: TripComplianceStaffRole[] | undefined,
): ComplianceItemStatus {
  const docKey = req.systemHints?.documentKey;
  if (docKey) {
    return isDocumentMet(documents?.find((d) => d.key === docKey) || { key: docKey }) ? "met" : "missing";
  }
  const staffKey = req.systemHints?.staffRoleKey;
  if (staffKey) {
    return isStaffRoleMet(staffRoles, staffKey) ? "met" : "missing";
  }
  return "unknown";
}

function matchingCoordinationRules(
  activityKeys: string[],
  tags: Set<string>,
  options?: { sensitiveArea?: boolean },
): CoordinationRule[] {
  return (coordinationRules as CoordinationRule[]).filter((rule) => {
    if (rule.requiresSensitiveArea && !options?.sensitiveArea) return false;
    if (rule.activityKeys?.length) {
      if (!rule.activityKeys.some((k) => activityKeys.includes(k))) return false;
    } else if (rule.whenTags?.length) {
      if (!rule.whenTags.some((t) => tags.has(t))) return false;
    } else if (!rule.requiresSensitiveArea) {
      return false;
    }
    return rule.requiresMokedTeva;
  });
}

function activityTablesToComplianceItems(
  tables: ActivityPreparationTable[],
  documents: TripComplianceDocument[] | undefined,
  coveredDocumentKeys: Set<string>,
): ComplianceItem[] {
  const items: ComplianceItem[] = [];
  for (const table of tables) {
    for (const row of table.items) {
      if (row.documentKey && coveredDocumentKeys.has(row.documentKey)) continue;
      let status: ComplianceItemStatus = "unknown";
      if (row.documentKey) {
        status = isDocumentMet(documents?.find((d) => d.key === row.documentKey) || { key: row.documentKey })
          ? "met"
          : "missing";
      }
      items.push({
        id: `activity_prep_${table.circularSectionId.replace(/\./g, "_")}_${row.id}`,
        title: `${table.title}: ${row.topic}`,
        description: row.description,
        severity: row.severity,
        status,
        sourceSection: table.sources[0]?.section,
        linkedDocumentKey: row.documentKey,
        category: row.documentKey ? "document" : "procedure",
      });
    }
  }
  return items;
}

function collectPreparationContextFromPlanRows(rows: EvaluateTripComplianceInput["planRows"]): {
  activityTypeIds: string[];
  planSubCategoryLabels: string[];
} {
  const activityTypeIds = new Set<string>();
  const planSubCategoryLabels = new Set<string>();

  for (const row of rows) {
    let category = String(row.category || "").trim() || null;
    let sub = String(row.finalSubCategory || row.subCategory || "").trim();
    if (!sub && row.eventText) {
      const resolved = resolvePlanCategoryFromEventLabel(row.eventText);
      category = category || resolved.categoryKey;
      sub = resolved.subLabel;
    }
    if (sub) planSubCategoryLabels.add(sub);
    const scheduleRow = findLicensedScheduleRow(category, sub);
    if (scheduleRow) activityTypeIds.add(scheduleRow.activityTypeId);
  }

  return {
    activityTypeIds: Array.from(activityTypeIds),
    planSubCategoryLabels: Array.from(planSubCategoryLabels),
  };
}

function checklistToComplianceItems(
  documents: TripComplianceDocument[] | undefined,
  coveredDocumentKeys: Set<string>,
): ComplianceItem[] {
  return (preparationChecklist as PreparationChecklistItem[])
    .filter((item) => {
      if (item.documentKey && coveredDocumentKeys.has(item.documentKey)) return false;
      if (item.id === "prep_licensing" && coveredDocumentKeys.has("business-license-insurance")) return false;
      return true;
    })
    .map((item) => {
      let status: ComplianceItemStatus = "unknown";
      if (item.documentKey) {
        status = isDocumentMet(documents?.find((d) => d.key === item.documentKey) || { key: item.documentKey })
          ? "met"
          : "missing";
      }
      return {
        id: `checklist_${item.id}`,
        title: item.topic,
        description: item.description,
        severity: item.severity,
        status,
        sourceSection: item.sources[0]?.section,
        linkedDocumentKey: item.documentKey,
        category:
          item.requirementKind === "approval"
            ? "approval"
            : item.requirementKind === "license"
              ? "license"
              : item.requirementKind === "document"
                ? "document"
                : item.requirementKind === "coordination"
                  ? "coordination"
                  : "procedure",
      };
    });
}

export function evaluateTripCompliance(input: EvaluateTripComplianceInput): TripComplianceResult {
  const ctx = collectRegulationContextFromPlanRows(input.planRows);
  const tagSet = new Set(ctx.tags);
  const requirements = getRequirementsForTripContext(ctx);
  const documents = input.documents;
  const staffRoles = input.staffRoles;
  const coveredDocumentKeys = new Set<string>();

  const items: ComplianceItem[] = [];

  for (const req of requirements) {
    if (req.systemHints?.documentKey) coveredDocumentKeys.add(req.systemHints.documentKey);
    const status = evaluateRequirement(req, documents, staffRoles);
    items.push({
      id: req.id,
      title: req.title,
      description: req.description,
      severity: req.severity,
      status,
      sourceSection: req.sources[0]?.section,
      linkedDocumentKey: req.systemHints?.documentKey,
      linkedStaffRoleKey: req.systemHints?.staffRoleKey,
      category: requirementCategory(req.kind),
    });
  }

  items.push(...checklistToComplianceItems(documents, coveredDocumentKeys));

  const prepCtx = collectPreparationContextFromPlanRows(input.planRows);
  const activityTables = findPreparationTablesForTripContext({
    activityKeys: ctx.activityKeys,
    ...prepCtx,
  });
  items.push(...activityTablesToComplianceItems(activityTables, documents, coveredDocumentKeys));

  const insurance = insuranceIncidents.insuranceDeclaration;
  items.push({
    id: "insurance_declaration",
    title: insurance.title,
    description: insurance.description,
    severity: "mandatory",
    status: "unknown",
    sourceSection: insuranceIncidents.insuranceDeclaration.sources[0]?.section,
    category: "document",
  });

  const hasSensitiveArea = tripHasSensitiveActivity({
    tripDetails: input.tripDetails,
    planRows: input.planRowsWithLocation,
  });

  for (const rule of matchingCoordinationRules(ctx.activityKeys, tagSet, {
    sensitiveArea: hasSensitiveArea,
  })) {
    const doc = documents?.find((d) => d.key === "moked-teva-approval");
    items.push({
      id: `coord_${rule.id}`,
      title: `תיאום מוקד טבע: ${rule.label}`,
      description: `${rule.description}${rule.leadDaysMin ? ` (מינימום ${rule.leadDaysMin} ימים מראש)` : ""}`,
      severity: "mandatory",
      status: isDocumentMet(doc || { key: "moked-teva-approval" }) ? "met" : "missing",
      sourceSection: rule.sources[0]?.section,
      linkedDocumentKey: "moked-teva-approval",
      category: "coordination",
    });
  }

  const seen = new Set<string>();
  const deduped = items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  const mandatoryOpen = deduped.filter((i) => i.severity === "mandatory" && i.status === "missing").length;
  const recommendedOpen = deduped.filter((i) => i.severity === "recommended" && i.status === "missing").length;
  const met = deduped.filter((i) => i.status === "met").length;
  const notApplicable = deduped.filter((i) => i.status === "not_applicable").length;

  return {
    items: deduped,
    summary: { mandatoryOpen, recommendedOpen, met, notApplicable },
    context: ctx,
    disclaimer: DISCLAIMER,
  };
}

export type RowRegulationHint = {
  needsLicense: boolean;
  needsMokedTeva: boolean;
  licenseLabel?: string;
  coordinationLabel?: string;
  circularSectionId?: string | null;
};

export function getRowRegulationHints(
  planCategoryKey?: string | null,
  planSubCategoryLabel?: string | null,
): RowRegulationHint {
  const sub = String(planSubCategoryLabel || "").trim();
  const scheduleRow = findLicensedScheduleRow(planCategoryKey, sub);
  const activityKey = collectRegulationContextFromPlanRows([
    { category: planCategoryKey, finalSubCategory: sub },
  ]).activityKeys[0];
  const activity = activityKey ? getRegulationActivity(activityKey) : undefined;

  const licenseRow = scheduleRow
    ? (businessLicenseMatrix as LicenseMatrixRow[]).find((r) => r.activityTypeId === scheduleRow.activityTypeId)
    : undefined;

  const tags = new Set(activity?.tags || []);
  const coordRules = matchingCoordinationRules(activityKey ? [activityKey] : [], tags);

  const needsLicense =
    Boolean(scheduleRow?.requiresBusinessLicense) ||
    Boolean(licenseRow?.requiresBusinessLicense) ||
    tags.has("license_required");

  const needsMokedTeva = Boolean(scheduleRow?.requiresMokedTeva) || coordRules.length > 0;

  return {
    needsLicense,
    needsMokedTeva,
    licenseLabel: needsLicense ? "נדרש רישוי" : undefined,
    coordinationLabel: needsMokedTeva ? "נדרש תיאום מוקד טבע" : undefined,
    circularSectionId:
      scheduleRow?.circularSectionId ?? activity?.circularSectionId ?? licenseRow?.circularSectionId ?? null,
  };
}

/** Occurrence column: per-row license and insurance (not trip-wide moked teva). */
export function getOccurrenceRegulationHints(eventText?: string | null) {
  const hints = getRowRegulationHints(null, eventText);
  const needsInsurance = hints.needsLicense;
  return {
    needsLicense: hints.needsLicense,
    needsInsurance,
    licenseLabel: hints.needsLicense ? hints.licenseLabel || "נדרש רישוי" : undefined,
    insuranceLabel: needsInsurance ? "נדרש ביטוח" : undefined,
  };
}

export function tripNeedsMokedTevaCoordination(input: {
  planRows: Array<{ eventText?: string | null; locationSensitive?: boolean | null }>;
  tripDetails?: Record<string, unknown>;
}): boolean {
  const details = input.tripDetails || {};
  if (details.requiresSensitiveCoordination || details.inSensitiveArea || details.sensitiveArea) return true;

  for (const row of input.planRows) {
    if (row.locationSensitive) return true;
    const hints = getRowRegulationHints(null, row.eventText);
    if (hints.needsMokedTeva) return true;
  }
  return false;
}

export function tripNeedsBusinessLicense(planRows: Array<{ eventText?: string | null }>): boolean {
  return planRows.some((row) => getRowRegulationHints(null, row.eventText).needsLicense);
}
