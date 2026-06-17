/** מקור רגולטורי — חוזר מנכ"ל / נספח / מוקד טבע */
export type RegulationSourceKind = "circular" | "appendix" | "external_guidance" | "organization_policy";

export type RegulationSource = {
  kind: RegulationSourceKind;
  circularSiduri?: number;
  circularTitle?: string;
  section?: string;
  url?: string;
  notes?: string;
  /** direct = נלקח מהוראה רשמית; secondary = סיכום/מקור משני */
  confidence: "direct" | "secondary" | "organization";
};

export type OrganizationalRoleMapping = {
  /** מונח בחוזר מנכ"ל */
  circularTerm: string;
  circularTermAliases?: string[];
  /** איך זה נקרא אצלנו (ארגון נוער) */
  organizationRole: string;
  /** מזהה לשימוש בקוד (profiles, trips, UI) */
  systemKey: string;
  notes?: string;
};

export type RegulationActivityTag =
  | "outdoor"
  | "attraction"
  | "water"
  | "height"
  | "night"
  | "sleeping"
  | "transport"
  | "food"
  | "settlement"
  | "license_required"
  | "coordination_required";

/** פרק בחוזר 585 */
export type ActivityChapter = "a" | "b" | "c";

export type RegulationActivity = {
  key: string;
  label: string;
  description: string;
  tags: RegulationActivityTag[];
  /** מיפוי לקטגוריות בלו״ז ([lib/constants.ts](../constants.ts)) */
  planCategoryKey?: string;
  planSubCategoryLabels?: string[];
  /** פרק בחוזר — א' כללי, ב' אתגר, ג' מים */
  circularChapter?: ActivityChapter;
  /** מזהה סעיף בחוזר, למשל "b.3" או "g.5.2" */
  circularSectionId?: string | null;
  /** הפניה לטבלת היערכות בפרק הספציפי */
  preparationTableRef?: string | null;
  sources: RegulationSource[];
};

export type RegulationRequirementKind =
  | "staff_minimum"
  | "staff_role"
  | "document"
  | "approval"
  | "procedure"
  | "constraint"
  | "coordination"
  | "license"
  | "risk";

export type RegulationRequirementSeverity = "mandatory" | "recommended" | "conditional";

export type RegulationRequirement = {
  id: string;
  kind: RegulationRequirementKind;
  title: string;
  description: string;
  severity: RegulationRequirementSeverity;
  /** מפתחי פעילות — ריק = חל על כל טיול */
  activityKeys?: string[];
  /** תגיות — חל אם לפחות פעילות אחת בטיול נושאת תגית */
  whenTags?: RegulationActivityTag[];
  /** מיפוי לישות במערכת (אופציונלי) */
  systemHints?: {
    documentKey?: string;
    staffRoleKey?: string;
    profileRole?: string;
  };
  sources: RegulationSource[];
};

export type CircularMeta = {
  siduri: number;
  title: string;
  subtitle?: string;
  officialUrl: string;
  targetAudience: string[];
  lastKnownUpdate?: string;
  /** הוראה מחליפה (למשל 0467) */
  replacingInstruction?: string;
  effectiveFrom?: string;
  sourcePdfPath?: string;
  extractionStatus: "partial" | "in_progress" | "complete";
  extractionNotes?: string;
  relatedSiduri?: number[];
};

/** פרק א' — סעיף 2: טבלת היערכות גנרית */
export type PreparationChecklistItem = {
  id: string;
  topic: string;
  description: string;
  severity: RegulationRequirementSeverity;
  /** מפתח מסמך במערכת ([lib/tripDocumentsCatalog.ts](../../tripDocumentsCatalog.ts)) */
  documentKey?: string;
  /** סוג דרישה לצורך מנוע ציות */
  requirementKind?: RegulationRequirementKind;
  sources: RegulationSource[];
};

/** פרק א' — תיאום הלשכה / מוקד טבע */
export type CoordinationRule = {
  id: string;
  label: string;
  description: string;
  requiresMokedTeva: boolean;
  leadDaysMin?: number;
  /** תגיות פעילות — אם ריק, חל על כל פעילות חוץ */
  whenTags?: RegulationActivityTag[];
  /** מפתח פעילות ספציפי */
  activityKeys?: string[];
  /** אזור רגיש — מוצג רק כשמסומן בפרטי הטיול */
  requiresSensitiveArea?: boolean;
  sources: RegulationSource[];
};

/** פרק א' — סעיף 3: טבלת רישוי עסקים */
export type LicenseMatrixRow = {
  activityTypeId: string;
  label: string;
  requiresBusinessLicense: boolean;
  requiresOtherPermit?: boolean;
  notes?: string;
  circularSectionId?: string;
  sources: RegulationSource[];
};

/** פרק א' — סעיף 4: גילי סף */
export type AgeThresholdRow = {
  id: string;
  activityTypeId?: string;
  activityKeys?: string[];
  minAge?: number;
  maxAge?: number;
  notes: string;
  sources: RegulationSource[];
};

/** פרק א' — סעיף 5: ליווי רפואי */
export type MedicalEscortRow = {
  id: string;
  activityKeys?: string[];
  activityTypeId?: string;
  whenTags?: RegulationActivityTag[];
  escortType: "paramedic" | "doctor" | "medic" | "first_aid_kit";
  ratio?: string;
  participantMin?: number;
  participantMax?: number;
  mandatory: boolean;
  notes?: string;
  sources: RegulationSource[];
};

/** פרקים ב'-ג' — שורה בטבלת היערכות לפי סעיף */
export type ActivityPreparationTableItem = {
  id: string;
  number: number;
  topic: string;
  description: string;
  subItems?: string[];
  documentKey?: string;
  severity: RegulationRequirementSeverity;
};

/** פרקים ב'-ג' — טבלת היערכות לפעילות ספציפית */
export type ActivityPreparationTable = {
  circularSectionId: string;
  sectionRef: string;
  chapter: ActivityChapter;
  title: string;
  activityTypeId?: string;
  planSubCategoryLabels?: string[];
  regulationActivityKeys?: string[];
  intro?: string;
  /** PDF משלים (למשל כרטיס מידע תנועות נוער) */
  supplementPdfPath?: string;
  items: ActivityPreparationTableItem[];
  sources: RegulationSource[];
};

export type LicensedScheduleMapRow = {
  planCategoryKey: string;
  planSubCategoryLabel: string;
  activityTypeId: string;
  regulationActivityKey: string;
  circularChapter: ActivityChapter;
  circularSectionId: string;
  requiresBusinessLicense: boolean;
  requiresOtherPermit?: boolean;
  requiresMokedTeva: boolean;
  leadDaysMin?: number;
};

export type CircularChapterMeta = {
  chapter: ActivityChapter;
  title: string;
  summary: string;
  priority: "P0" | "P1" | "P2";
};

export type ComplianceItemStatus = "met" | "missing" | "not_applicable" | "unknown";

export type ComplianceItem = {
  id: string;
  title: string;
  description: string;
  severity: RegulationRequirementSeverity;
  status: ComplianceItemStatus;
  sourceSection?: string;
  linkedDocumentKey?: string;
  linkedStaffRoleKey?: string;
  category: "document" | "staff" | "approval" | "coordination" | "license" | "procedure" | "other";
};

export type TripComplianceResult = {
  items: ComplianceItem[];
  summary: {
    mandatoryOpen: number;
    recommendedOpen: number;
    met: number;
    notApplicable: number;
  };
  context: {
    activityKeys: string[];
    tags: RegulationActivityTag[];
  };
  disclaimer: string;
};

export type RegulationMaintenanceSource = {
  id: string;
  label: string;
  path: string;
  notes?: string;
};

export type RegulationMaintenanceWorkflow = {
  id: string;
  title: string;
  when: string;
  prerequisite?: string;
  steps?: string[];
  commands?: string[];
  outputs?: string[];
  warnings?: string[];
  priorityTables?: Array<{ id: string; title: string }>;
};

export type RegulationMaintenanceGuide = {
  title: string;
  intro: string;
  disclaimer: string;
  officialUrl: string;
  sources: RegulationMaintenanceSource[];
  workflows: RegulationMaintenanceWorkflow[];
  fileMap: Array<{ path: string; label: string }>;
  scripts: Array<{ path: string; label: string }>;
  productNotes: string[];
};
