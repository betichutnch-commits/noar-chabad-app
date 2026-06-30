import { CATEGORIES } from "@/lib/constants";
import activitiesData from "@/lib/regulation/activities.json";
import roleMappingData from "@/lib/regulation/organizational-role-mapping.json";
import circular585Meta from "@/lib/regulation/circulars/585-outdoor-activities-meta.json";
import circular450Meta from "@/lib/regulation/circulars/450-trips-meta.json";
import relatedCircularsData from "@/lib/regulation/circulars/related-circulars.json";
import circularChaptersData from "@/lib/regulation/circular-chapters.json";
import preparationChecklistData from "@/lib/regulation/chapter-a/preparation-checklist.json";
import coordinationRulesData from "@/lib/regulation/chapter-a/coordination-rules.json";
import businessLicenseMatrixData from "@/lib/regulation/chapter-a/business-license-matrix.json";
import ageThresholdsData from "@/lib/regulation/chapter-a/age-thresholds.json";
import medicalEscortMatrixData from "@/lib/regulation/chapter-a/medical-escort-matrix.json";
import insuranceIncidentsData from "@/lib/regulation/chapter-a/insurance-and-incidents.json";
import globalRequirementsData from "@/lib/regulation/requirements/global.json";
import byActivityRequirementsData from "@/lib/regulation/requirements/by-activity.json";
import type {
  ActivityPreparationTable,
  ActivityPreparationTableItem,
  AgeThresholdRow,
  CircularChapterMeta,
  CircularMeta,
  CoordinationRule,
  LicenseMatrixRow,
  LicensedScheduleMapRow,
  MedicalEscortRow,
  OrganizationalRoleMapping,
  PreparationChecklistItem,
  RegulationActivity,
  RegulationActivityTag,
  RegulationMaintenanceGuide,
  RegulationMaintenanceSource,
  RegulationMaintenanceWorkflow,
  RegulationRequirement,
} from "@/lib/regulation/types";

export type {
  ActivityPreparationTable,
  ActivityPreparationTableItem,
  AgeThresholdRow,
  CircularChapterMeta,
  CircularMeta,
  CoordinationRule,
  LicenseMatrixRow,
  LicensedScheduleMapRow,
  MedicalEscortRow,
  OrganizationalRoleMapping,
  PreparationChecklistItem,
  RegulationActivity,
  RegulationActivityTag,
  RegulationMaintenanceGuide,
  RegulationMaintenanceSource,
  RegulationMaintenanceWorkflow,
  RegulationRequirement,
};

export {
  allActivityPreparationTables,
  chapterBPreparationTables,
  chapterCPreparationTables,
  findPreparationTablesForTripContext,
  getPreparationTableBySectionId,
} from "@/lib/regulation/preparation-tables";

export {
  detectSensitiveLocation,
  tripHasSensitiveActivity,
} from "@/lib/regulation/sensitive-locations";
export {
  evaluateRowRegulationBrief,
  getOfficialMankalUrlForSection,
  shouldShowRowRegulationBrief,
} from "@/lib/regulation/row-regulation-brief";
export type { RowRegulationBrief, RowRegulationBriefLink } from "@/lib/regulation/row-regulation-brief";
export { gradeToApproxAge, gradeRangeToApproxAges } from "@/lib/regulation/grade-age";
export type { SensitiveLocationDetection, TripSensitiveContext } from "@/lib/regulation/sensitive-locations";

export {
  evaluateTripCompliance,
  getRowRegulationHints,
  getOccurrenceRegulationHints,
  tripNeedsMokedTevaCoordination,
  tripNeedsBusinessLicense,
  findLicensedScheduleRow,
} from "@/lib/regulation/compliance";
export type { EvaluateTripComplianceInput, RowRegulationHint, TripComplianceDocument, TripComplianceStaffRole } from "@/lib/regulation/compliance";
import licensedScheduleMapData from "@/lib/regulation/licensed-schedule-map.json";
import maintenanceGuideData from "@/lib/regulation/maintenance-guide.json";
export const licensedScheduleMap = licensedScheduleMapData as LicensedScheduleMapRow[];
export const regulationMaintenanceGuide = maintenanceGuideData as RegulationMaintenanceGuide;

export const PRIMARY_CIRCULAR_SIDURI = 585;

export const circular585 = circular585Meta as CircularMeta;
export const circular450 = circular450Meta as CircularMeta;
export const circularChapters = circularChaptersData as CircularChapterMeta[];
export const preparationChecklist = preparationChecklistData as PreparationChecklistItem[];
export const coordinationRules = coordinationRulesData as CoordinationRule[];
export const businessLicenseMatrix = businessLicenseMatrixData as LicenseMatrixRow[];
export const ageThresholds = ageThresholdsData as AgeThresholdRow[];
export const medicalEscortMatrix = medicalEscortMatrixData as MedicalEscortRow[];
export const insuranceAndIncidents = insuranceIncidentsData as {
  insuranceDeclaration: { title: string; description: string; severity: string };
  incidentReporting: { title: string; description: string; severity: string; documentKey?: string };
  organizationalNote: string;
};
export const relatedCirculars = relatedCircularsData as Array<{
  siduri: number;
  title: string;
  officialUrl: string;
  relation: string;
  notes?: string;
}>;

export const regulationActivities = activitiesData as RegulationActivity[];
export const organizationalRoleMappings = (roleMappingData as { mappings: OrganizationalRoleMapping[] }).mappings;

export const globalRegulationRequirements = globalRequirementsData as RegulationRequirement[];
export const byActivityRegulationRequirements = byActivityRequirementsData as RegulationRequirement[];

export const allRegulationRequirements: RegulationRequirement[] = [
  ...globalRegulationRequirements,
  ...byActivityRegulationRequirements,
];

/** מיפוי מונח בחוזר → תפקיד בארגון */
export function mapCircularTermToOrganization(circularTerm: string): OrganizationalRoleMapping | undefined {
  const normalized = circularTerm.trim();
  return organizationalRoleMappings.find(
    (row) =>
      row.circularTerm === normalized ||
      row.circularTermAliases?.some((alias) => alias === normalized || normalized.includes(alias)),
  );
}

/** מצא פעילות רגולטורית לפי קטגוריה ותת-קטגוריה בלו״ז */
export function resolveRegulationActivityKey(
  planCategoryKey?: string | null,
  planSubCategoryLabel?: string | null,
): string | null {
  const category = String(planCategoryKey || "").trim();
  const sub = String(planSubCategoryLabel || "").trim();
  if (!category) return null;

  if (sub) {
    const subMatches = regulationActivities.filter(
      (activity) => activity.planCategoryKey === category && activity.planSubCategoryLabels?.includes(sub),
    );
    if (subMatches.length) {
      const best = subMatches.sort(
        (a, b) => (a.planSubCategoryLabels?.length || 999) - (b.planSubCategoryLabels?.length || 999),
      )[0];
      return best.key;
    }
  }

  const exact = regulationActivities.find(
    (activity) =>
      activity.planCategoryKey === category &&
      (!sub || !activity.planSubCategoryLabels?.length || activity.planSubCategoryLabels.includes(sub)),
  );
  if (exact) return exact.key;

  const byCategory = regulationActivities.find((activity) => activity.planCategoryKey === category);
  return byCategory?.key || null;
}

export function getRegulationActivity(key: string): RegulationActivity | undefined {
  return regulationActivities.find((activity) => activity.key === key);
}

/** דרישות גלובליות + לפי מפתח פעילות + לפי תגיות */
export function getRequirementsForTripContext(input: {
  activityKeys?: string[];
  tags?: RegulationActivityTag[];
}): RegulationRequirement[] {
  const activityKeys = new Set(input.activityKeys || []);
  const tags = new Set(input.tags || []);

  for (const key of activityKeys) {
    const activity = getRegulationActivity(key);
    activity?.tags.forEach((tag) => tags.add(tag));
  }

  return allRegulationRequirements.filter((req) => {
    if (req.activityKeys?.length) {
      if (!req.activityKeys.some((key) => activityKeys.has(key))) return false;
    }
    if (req.whenTags?.length) {
      if (!req.whenTags.some((tag) => tags.has(tag))) return false;
    }
    return true;
  });
}

/** מצא קטגוריית לו״ז לפי תווית התרחשות (event_text) */
export function resolvePlanCategoryFromEventLabel(eventLabel: string): {
  categoryKey: string | null;
  subLabel: string;
} {
  const subLabel = String(eventLabel || "").trim();
  if (!subLabel) return { categoryKey: null, subLabel: "" };
  for (const [categoryKey, category] of Object.entries(CATEGORIES)) {
    if (category.options.some((option) => option.label === subLabel)) {
      return { categoryKey, subLabel };
    }
  }
  return { categoryKey: null, subLabel };
}

/** איסוף תגיות ומפתחות פעילות משורות לו״ז */
export function collectRegulationContextFromPlanRows(
  rows: Array<{
    category?: string | null;
    subCategory?: string | null;
    finalSubCategory?: string | null;
    eventText?: string | null;
  }>,
): { activityKeys: string[]; tags: RegulationActivityTag[] } {
  const activityKeys = new Set<string>();
  const tags = new Set<RegulationActivityTag>();

  for (const row of rows) {
    let category = String(row.category || "").trim() || null;
    let sub = String(row.finalSubCategory || row.subCategory || "").trim();
    if (!sub && row.eventText) {
      const resolved = resolvePlanCategoryFromEventLabel(row.eventText);
      category = category || resolved.categoryKey;
      sub = resolved.subLabel;
    }
    const key = resolveRegulationActivityKey(category, sub);
    if (key) {
      activityKeys.add(key);
      getRegulationActivity(key)?.tags.forEach((tag) => tags.add(tag));
    }
  }

  return { activityKeys: Array.from(activityKeys), tags: Array.from(tags) };
}
