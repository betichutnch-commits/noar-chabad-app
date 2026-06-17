import { CATEGORIES } from "@/lib/constants";
import {
  ageThresholds,
  circular585,
  collectRegulationContextFromPlanRows,
  coordinationRules,
  getPreparationTableBySectionId,
  getRegulationActivity,
  getRequirementsForTripContext,
  medicalEscortMatrix,
} from "@/lib/regulation/index";
import mankalTocAnchors from "@/lib/regulation/mankal-toc-anchors.json";
import { getRowRegulationHints, findLicensedScheduleRow } from "@/lib/regulation/compliance";
import { findPreparationTablesForTripContext } from "@/lib/regulation/preparation-tables";
import type { ActivityPreparationTable } from "@/lib/regulation/types";
import { gradeRangeToApproxAges } from "@/lib/regulation/grade-age";
import {
  DEFAULT_REQUIRED_ROLE_RULES,
  buildRequiredStaffContext,
  calculateRequiredStaffPreview,
} from "@/lib/tripRequiredRoles";
import type { CoordinationRule, MedicalEscortRow } from "@/lib/regulation/types";

export type RowRegulationBriefLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type RowRegulationBrief = {
  activityLabel: string;
  circularSectionId: string | null;
  circularTitle: string | null;
  circularLinks: RowRegulationBriefLink[];
  medicRequired: boolean;
  medicCount: number | null;
  medicEscortType: string | null;
  medicEscortLabel: string | null;
  medicNotes: string | null;
  medicSummary: string | null;
  adultStaffRequired: boolean;
  adultStaffCount: number | null;
  adultStaffSummary: string | null;
  adultStaffRatioLabel: string | null;
  securityRequired: boolean;
  securityCount: number | null;
  securityNotes: string | null;
  minAge: number | null;
  maxAge: number | null;
  ageEligible: boolean | null;
  ageMessage: string | null;
  needsLicense: boolean;
  needsInsurance: boolean;
  needsMokedTeva: boolean;
  sensitiveLocation: boolean;
  coordinationLeadDays: number | null;
  coordinationLabels: string[];
  needsParentConsent: boolean;
  needsFirstAidKit: boolean;
  checklistHighlights: string[];
  planningDocumentHints: string[];
};

const ESCORT_TYPE_LABELS: Record<string, string> = {
  medic: "חובש מוסמך",
  doctor: "רופא",
  paramedic: "פרמדיק",
  first_aid_kit: "ערכת עזרה ראשונה בשטח",
};

const ESCORT_SHORT_LABELS: Record<string, string> = {
  medic: "חובש",
  doctor: "רופא",
  paramedic: "פרמדיק",
  first_aid_kit: "ערכת עזרה ראשונה",
};

function formatMedicSummary(
  escortType: string | null,
  count: number | null,
  required: boolean,
): string | null {
  if (!required || !escortType) return null;
  if (escortType === "first_aid_kit") return ESCORT_SHORT_LABELS.first_aid_kit;
  const short = ESCORT_SHORT_LABELS[escortType] || escortType;
  if (count != null) return `${count} ${short}`;
  return short;
}

const DOCUMENT_KEY_LABELS: Record<string, string> = {
  "moked-teva-approval": "אישור מוקד טבע",
  "risk-management": "ניהול סיכונים",
  "business-license-insurance": "רישוי עסק וביטוח",
  "participant-list": "רשימת משתתפים / אישור הורים",
};

function parseRatioDenominator(ratio?: string): number | null {
  if (!ratio) return null;
  const m = String(ratio).match(/1\s*:\s*(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function matchMedicalRow(
  row: MedicalEscortRow,
  activityKeys: string[],
  activityTypeId: string | undefined,
  tags: Set<string>,
  participantCount: number,
): boolean {
  if (row.participantMin != null && participantCount < row.participantMin) return false;
  if (row.participantMax != null && participantCount > row.participantMax) return false;
  if (row.activityTypeId && activityTypeId === row.activityTypeId) return true;
  if (row.activityKeys?.length && row.activityKeys.some((k) => activityKeys.includes(k))) return true;
  if (row.whenTags?.length && row.whenTags.some((t) => tags.has(t))) return true;
  return false;
}

function pickMedicalRow(
  activityKeys: string[],
  activityTypeId: string | undefined,
  tags: Set<string>,
  participantCount: number,
): MedicalEscortRow | undefined {
  const rows = (medicalEscortMatrix as MedicalEscortRow[]).filter((r) =>
    matchMedicalRow(r, activityKeys, activityTypeId, tags, participantCount),
  );
  const byType = rows.find((r) => r.activityTypeId && r.activityTypeId === activityTypeId);
  if (byType) return byType;
  const byKey = rows.find((r) => r.activityKeys?.length);
  if (byKey) return byKey;
  return rows[0];
}

function computeMedic(participantCount: number, row: MedicalEscortRow | undefined) {
  if (!row) {
    return {
      medicRequired: false,
      medicCount: null as number | null,
      medicEscortType: null as string | null,
      medicEscortLabel: null as string | null,
      medicNotes: null as string | null,
      medicSummary: null as string | null,
      needsFirstAidKit: false,
    };
  }
  const denom = parseRatioDenominator(row.ratio);
  const count =
    row.escortType === "first_aid_kit"
      ? null
      : denom && participantCount > 0
        ? Math.max(1, Math.ceil(participantCount / denom))
        : participantCount > 0
          ? 1
          : null;
  const medicRequired = row.mandatory || row.escortType !== "first_aid_kit";
  const medicEscortType = row.escortType;
  return {
    medicRequired,
    medicCount: count,
    medicEscortType,
    medicEscortLabel: ESCORT_TYPE_LABELS[row.escortType] || row.escortType,
    medicNotes: row.notes || null,
    medicSummary: formatMedicSummary(medicEscortType, count, medicRequired),
    needsFirstAidKit: row.escortType === "first_aid_kit",
  };
}

function buildRowStaffDetails(
  planCategoryKey: string,
  planSubCategoryLabel: string,
  participantCount: number,
) {
  const sub = planSubCategoryLabel === "אחר" ? "" : planSubCategoryLabel;
  return {
    chanichimCount: participantCount,
    totalTravelers: participantCount,
    timeline: [
      {
        category: planCategoryKey,
        subCategory: sub,
        finalSubCategory: sub,
      },
    ],
  };
}

function computeAdultStaff(
  planCategoryKey: string,
  planSubCategoryLabel: string,
  participantCount: number,
) {
  const details = buildRowStaffDetails(planCategoryKey, planSubCategoryLabel, participantCount);
  const preview = calculateRequiredStaffPreview(details, DEFAULT_REQUIRED_ROLE_RULES);
  const adult = preview.rows.find((r) => r.role_key === "adult_staff");
  const adultRule = DEFAULT_REQUIRED_ROLE_RULES.find((r) => r.role_key === "adult_staff");
  const ratioPer = adultRule?.ratio_per;
  if (adult && adult.required_quantity > 0) {
    return {
      adultStaffRequired: true,
      adultStaffCount: adult.required_quantity,
      adultStaffSummary: `${adult.required_quantity} מלווה בוגר`,
      adultStaffRatioLabel: ratioPer ? `יחס 1:${ratioPer}` : null,
    };
  }
  return {
    adultStaffRequired: false,
    adultStaffCount: null,
    adultStaffSummary: null,
    adultStaffRatioLabel: null,
  };
}

function computeSecurity(
  planCategoryKey: string,
  planSubCategoryLabel: string,
  participantCount: number,
) {
  const sub = planSubCategoryLabel === "אחר" ? "" : planSubCategoryLabel;
  const details = buildRowStaffDetails(planCategoryKey, planSubCategoryLabel, participantCount);
  const preview = calculateRequiredStaffPreview(details, DEFAULT_REQUIRED_ROLE_RULES);
  const security = preview.rows.find((r) => r.role_key === "security_escort");
  if (security && security.required_quantity > 0) {
    return {
      securityRequired: true,
      securityCount: security.required_quantity,
      securityNotes: security.source_summary,
    };
  }
  const ctx = buildRequiredStaffContext(details);
  const nightHike =
    sub.includes("לילה") ||
    sub.includes("מסלול לילה") ||
    ctx.eventLabels.some((l) => l.includes("לילה"));
  if (nightHike) {
    return {
      securityRequired: true,
      securityCount: null,
      securityNotes: "מסלול לילה — יש לתאם מאבטח/מלווה נשק לפי חוזר 585 והנחיות מוקד טבע",
    };
  }
  return {
    securityRequired: false,
    securityCount: null,
    securityNotes: null,
  };
}

function evaluateAge(
  activityKeys: string[],
  activityTypeId: string | undefined,
  gradeFrom?: string,
  gradeTo?: string,
): Pick<RowRegulationBrief, "minAge" | "maxAge" | "ageEligible" | "ageMessage"> {
  const tripAges = gradeRangeToApproxAges(gradeFrom, gradeTo);
  const applicable = (ageThresholds as Array<{
    activityKeys?: string[];
    activityTypeId?: string;
    minAge?: number;
    maxAge?: number;
    notes: string;
  }>).filter((row) => {
    if (row.activityTypeId && activityTypeId === row.activityTypeId) return true;
    if (row.activityKeys?.length && row.activityKeys.some((k) => activityKeys.includes(k))) return true;
    return false;
  });

  const rule = applicable.sort((a, b) => (b.minAge || 0) - (a.minAge || 0))[0];
  if (!rule) {
    return { minAge: null, maxAge: null, ageEligible: null, ageMessage: null };
  }

  const minRequired = rule.minAge ?? null;
  const maxAllowed = rule.maxAge ?? null;
  if (tripAges.minAge == null || tripAges.maxAge == null) {
    return {
      minAge: minRequired,
      maxAge: maxAllowed,
      ageEligible: null,
      ageMessage: null,
    };
  }

  const tooYoung = minRequired != null && tripAges.maxAge < minRequired;
  const tooOld = maxAllowed != null && tripAges.minAge > maxAllowed;
  const eligible = !tooYoung && !tooOld;

  if (eligible) {
    return {
      minAge: minRequired,
      maxAge: maxAllowed,
      ageEligible: true,
      ageMessage: null,
    };
  }

  const ageMessage = tooYoung
    ? `הפעילות אינה אפשרית לגילאי הבקשה (משוער ${tripAges.minAge}–${tripAges.maxAge}): לפי חוזר 585 מינימום גיל ${minRequired} לפעילות זו.`
    : `הפעילות אינה אפשרית לגילאי הבקשה (משוער ${tripAges.minAge}–${tripAges.maxAge}): לפי חוזר 585 הפעילות מיועדת עד גיל ${maxAllowed}.`;

  return {
    minAge: minRequired,
    maxAge: maxAllowed,
    ageEligible: false,
    ageMessage,
  };
}

function resolvePrepTable(
  sectionId: string | null,
  category: string,
  sub: string,
  activityTypeId?: string,
  activityKeys?: string[],
): ActivityPreparationTable | undefined {
  if (sectionId) {
    const direct = getPreparationTableBySectionId(sectionId);
    if (direct) return direct;
  }
  const matched = findPreparationTablesForTripContext({
    planSubCategoryLabels: sub ? [sub] : [],
    circularSectionIds: sectionId ? [sectionId] : [],
    activityTypeIds: activityTypeId ? [activityTypeId] : [],
    activityKeys,
  });
  return matched[0];
}

/** קישור לחוזר 585 באתר מנכ"ל — עוגן בתוכן העניינים (קישורי siduri משניים מה-PDF אינם תקפים באתר) */
export function getOfficialMankalUrlForSection(
  prepTable?: ActivityPreparationTable,
  sectionId?: string | null,
): string {
  const lookupId = prepTable?.circularSectionId ?? sectionId ?? null;
  if (lookupId) {
    const entry = mankalTocAnchors.sections[lookupId as keyof typeof mankalTocAnchors.sections];
    if (entry?.anchor) {
      return `${mankalTocAnchors.baseUrl}${entry.anchor}`;
    }
  }
  return circular585.officialUrl;
}

function buildCircularLinks(officialHref: string): RowRegulationBriefLink[] {
  if (!officialHref) return [];
  return [
    {
      label: 'קישור לחוזר מנכ"ל',
      href: officialHref,
      external: true,
    },
  ];
}

function isLicenseRequiredForSub(planCategoryKey: string, planSubCategoryLabel: string): boolean {
  const cat = CATEGORIES[planCategoryKey];
  if (!cat) return false;
  return Boolean(cat.options.find((o) => o.label === planSubCategoryLabel)?.license);
}

export function shouldShowRowRegulationBrief(
  tripType: string,
  planCategoryKey: string,
  planSubCategoryLabel: string,
  locationType?: string,
): boolean {
  if (!planCategoryKey) return false;

  const sub = String(planSubCategoryLabel || "").trim();

  // פעילות פשוטה בסניף בלבד — בלי חלון רגולציה
  if (
    locationType === "branch" &&
    planCategoryKey === "settlement" &&
    (sub === "פעילות בסניף" || sub === "")
  ) {
    return false;
  }

  const outdoorTypes = ["טיול מחוץ לסניף", "כנס/אירוע מחוץ לסניף"];
  if (outdoorTypes.includes(tripType)) {
    if (planCategoryKey === "settlement" && (sub === "פעילות בסניף" || sub === "")) return false;
    return true;
  }

  if (isLicenseRequiredForSub(planCategoryKey, sub)) return true;
  if (sub === "לינת שטח") return true;
  const hints = getRowRegulationHints(planCategoryKey, sub);
  return hints.needsLicense || hints.needsMokedTeva;
}

export function evaluateRowRegulationBrief(input: {
  planCategoryKey: string;
  planSubCategoryLabel: string;
  participantCount: number;
  gradeFrom?: string;
  gradeTo?: string;
  sensitiveLocation?: boolean;
}): RowRegulationBrief {
  const category = String(input.planCategoryKey || "").trim();
  const sub = String(input.planSubCategoryLabel || "").trim();
  const participantCount = Math.max(0, Number(input.participantCount) || 0);
  const activityLabel = sub || CATEGORIES[category]?.label || category;

  const scheduleRow = findLicensedScheduleRow(category, sub);
  const ctx = collectRegulationContextFromPlanRows([{ category, finalSubCategory: sub }]);
  const activity = ctx.activityKeys[0] ? getRegulationActivity(ctx.activityKeys[0]) : undefined;
  const tags = new Set(ctx.tags);
  const hints = getRowRegulationHints(category, sub);

  const sectionId =
    scheduleRow?.circularSectionId ?? activity?.circularSectionId ?? hints.circularSectionId ?? null;
  const prepTable = resolvePrepTable(sectionId, category, sub, scheduleRow?.activityTypeId, ctx.activityKeys);
  const circularTitle = prepTable?.title ?? activityLabel;
  const officialMankalUrl = getOfficialMankalUrlForSection(prepTable, sectionId);

  const medicalRow = pickMedicalRow(
    ctx.activityKeys,
    scheduleRow?.activityTypeId,
    tags,
    participantCount,
  );
  const medic = computeMedic(participantCount, medicalRow);
  const adultStaff = computeAdultStaff(category, sub, participantCount);
  const security = computeSecurity(category, sub, participantCount);
  const age = evaluateAge(ctx.activityKeys, scheduleRow?.activityTypeId, input.gradeFrom, input.gradeTo);

  const coordRules = (coordinationRules as CoordinationRule[]).filter((rule) => {
    if (input.sensitiveLocation && rule.requiresSensitiveArea) return true;
    if (rule.requiresSensitiveArea) return false;
    if (rule.activityKeys?.length) {
      return rule.activityKeys.some((k) => ctx.activityKeys.includes(k));
    }
    if (rule.whenTags?.length) {
      return rule.whenTags.some((t) => tags.has(t));
    }
    return false;
  });
  const coordinationLeadDays =
    coordRules.length > 0 ? Math.max(...coordRules.map((r) => r.leadDaysMin || 0)) : null;
  const coordinationLabels = coordRules.map((r) => r.label);

  const requirements = getRequirementsForTripContext(ctx);
  const needsParentConsent = requirements.some((r) => r.id === "parent_consent");

  const checklistHighlights = (prepTable?.items || [])
    .slice(0, 5)
    .map((item) => item.topic)
    .filter(Boolean);

  const docKeys = new Set<string>();
  for (const item of prepTable?.items || []) {
    if (item.documentKey) docKeys.add(item.documentKey);
  }
  if (hints.needsMokedTeva) docKeys.add("moked-teva-approval");
  if (requirements.some((r) => r.id === "risk_assessment")) docKeys.add("risk-management");
  const planningDocumentHints = Array.from(docKeys)
    .slice(0, 4)
    .map((key) => DOCUMENT_KEY_LABELS[key] || key);

  return {
    activityLabel,
    circularSectionId: sectionId,
    circularTitle,
    circularLinks: buildCircularLinks(officialMankalUrl),
    ...medic,
    ...adultStaff,
    ...security,
    ...age,
    needsLicense: hints.needsLicense || isLicenseRequiredForSub(category, sub),
    needsInsurance: hints.needsLicense || isLicenseRequiredForSub(category, sub),
    needsMokedTeva: hints.needsMokedTeva || Boolean(input.sensitiveLocation),
    sensitiveLocation: Boolean(input.sensitiveLocation),
    coordinationLeadDays: coordinationLeadDays && coordinationLeadDays > 0 ? coordinationLeadDays : null,
    coordinationLabels,
    needsParentConsent,
    checklistHighlights,
    planningDocumentHints,
  };
}
