export type RoleMergePolicy = "mergeable" | "exclusive";
export type RoleTriggerType = "always" | "category" | "event" | "organized_transport" | "sleeping" | "participant_ratio" | "bus_count";
export type RoleCalculationType = "fixed" | "ratio_participants" | "per_bus";
export type RequiredAssignmentKind = "buses" | "groups" | "rooms" | "other";
export type RequiredAssignmentAudience = "participants" | "staff" | "both";

export type TripRoleRequirementRule = {
  id?: string;
  role_key: string;
  role_label: string;
  trigger_type: RoleTriggerType;
  category_key?: string | null;
  event_label?: string | null;
  calculation_type: RoleCalculationType;
  fixed_quantity: number;
  ratio_per?: number | null;
  min_quantity: number;
  merge_policy: RoleMergePolicy;
  creates_staff_slot: boolean;
  creates_bus_assignment: boolean;
  creates_room_assignment: boolean;
  creates_group_assignment: boolean;
  order_index: number;
  is_active: boolean;
};

export type RequiredStaffPlanRow = {
  role_key: string;
  role_label: string;
  source_summary: string;
  required_quantity: number;
  approved_quantity: number;
  merge_policy: RoleMergePolicy;
  status: "approved" | "removed" | "needs_review";
  notes?: string | null;
  order_index: number;
};

export type TripAssignmentRequirementRule = {
  id?: string;
  assignment_key: string;
  kind: RequiredAssignmentKind;
  title: string;
  custom_kind_label?: string | null;
  trigger_type: RoleTriggerType;
  category_key?: string | null;
  event_label?: string | null;
  audience: RequiredAssignmentAudience;
  creates_items: boolean;
  order_index: number;
  is_active: boolean;
};

export type ApprovedAssignmentPlanRow = {
  assignment_key: string;
  kind: RequiredAssignmentKind;
  title: string;
  custom_kind_label?: string | null;
  source_summary: string;
  audience: RequiredAssignmentAudience;
  creates_items: boolean;
  status: "approved" | "removed";
  order_index: number;
};

export type RequiredStaffContext = {
  participantCount: number;
  totalPeople: number;
  busCount: number;
  hasOrganizedTransport: boolean;
  hasSleeping: boolean;
  categories: string[];
  eventLabels: string[];
};

export type RequiredStaffPreview = {
  rows: RequiredStaffPlanRow[];
  assignmentRows: ApprovedAssignmentPlanRow[];
  context: RequiredStaffContext;
};

type SupabaseLike = {
  from: (table: string) => {
    select: (columns?: string, options?: Record<string, unknown>) => unknown;
    insert: (values: unknown) => unknown;
    upsert: (values: unknown, options?: Record<string, unknown>) => unknown;
    update: (values: unknown) => unknown;
    delete: () => unknown;
  };
};

type QueryResult<T> = PromiseLike<{ data: T | null; error: { message?: string } | null; count?: number | null }>;

const textValue = (value: unknown) => String(value ?? "").trim();
const numberValue = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeEventLabel = (value: unknown) => textValue(value).replace(/\s+/g, " ");

export const DEFAULT_REQUIRED_ROLE_RULES: TripRoleRequirementRule[] = [
  {
    role_key: "trip_leader",
    role_label: "אחראי טיול",
    trigger_type: "always",
    calculation_type: "fixed",
    fixed_quantity: 1,
    min_quantity: 1,
    merge_policy: "mergeable",
    creates_staff_slot: true,
    creates_bus_assignment: false,
    creates_room_assignment: false,
    creates_group_assignment: false,
    order_index: 0,
    is_active: true,
  },
  {
    role_key: "bus_escort",
    role_label: "מלווה אוטובוס",
    trigger_type: "organized_transport",
    calculation_type: "per_bus",
    fixed_quantity: 1,
    min_quantity: 0,
    merge_policy: "mergeable",
    creates_staff_slot: true,
    creates_bus_assignment: true,
    creates_room_assignment: false,
    creates_group_assignment: false,
    order_index: 10,
    is_active: true,
  },
  {
    role_key: "adult_staff",
    role_label: "צוות בוגר",
    trigger_type: "participant_ratio",
    calculation_type: "ratio_participants",
    fixed_quantity: 1,
    ratio_per: 25,
    min_quantity: 1,
    merge_policy: "mergeable",
    creates_staff_slot: true,
    creates_bus_assignment: false,
    creates_room_assignment: false,
    creates_group_assignment: true,
    order_index: 20,
    is_active: true,
  },
  {
    role_key: "medical_escort",
    role_label: "מלווה רפואי",
    trigger_type: "category",
    category_key: "hiking",
    calculation_type: "fixed",
    fixed_quantity: 1,
    min_quantity: 1,
    merge_policy: "exclusive",
    creates_staff_slot: true,
    creates_bus_assignment: false,
    creates_room_assignment: false,
    creates_group_assignment: false,
    order_index: 30,
    is_active: true,
  },
  {
    role_key: "security_escort",
    role_label: "מלווה נשק / מאבטח",
    trigger_type: "event",
    event_label: "מסלול לילה",
    calculation_type: "fixed",
    fixed_quantity: 1,
    min_quantity: 1,
    merge_policy: "exclusive",
    creates_staff_slot: true,
    creates_bus_assignment: false,
    creates_room_assignment: false,
    creates_group_assignment: false,
    order_index: 40,
    is_active: true,
  },
];

export const DEFAULT_ASSIGNMENT_REQUIREMENT_RULES: TripAssignmentRequirementRule[] = [
  {
    assignment_key: "bus_assignments",
    kind: "buses",
    title: "שיבוץ אוטובוסים",
    custom_kind_label: null,
    trigger_type: "organized_transport",
    audience: "both",
    creates_items: true,
    order_index: 0,
    is_active: true,
  },
  {
    assignment_key: "group_assignments",
    kind: "groups",
    title: "שיבוץ קבוצות",
    custom_kind_label: null,
    trigger_type: "participant_ratio",
    audience: "participants",
    creates_items: false,
    order_index: 1,
    is_active: true,
  },
  {
    assignment_key: "room_assignments",
    kind: "rooms",
    title: "שיבוץ חדרים",
    custom_kind_label: null,
    trigger_type: "sleeping",
    audience: "participants",
    creates_items: false,
    order_index: 2,
    is_active: true,
  },
  {
    assignment_key: "other_assignments",
    kind: "other",
    title: "שיבוץ אחר",
    custom_kind_label: "אחר",
    trigger_type: "always",
    audience: "both",
    creates_items: false,
    order_index: 3,
    is_active: false,
  },
];

export const REQUIRED_STAFF_RAW = {
  protected: "requiredStaffProtected",
  placeholder: "requiredStaffPlaceholder",
  roleKeys: "requiredRoleKeys",
  roleLabels: "requiredRoleLabels",
  source: "requiredStaffSource",
};

export function getRoleRuleSummary(rule: TripRoleRequirementRule) {
  if (rule.trigger_type === "always") return "נדרש בכל טיול";
  if (rule.trigger_type === "organized_transport") return "נדרש כשיש נסיעה מאורגנת";
  if (rule.trigger_type === "sleeping") return "נדרש כשיש לינה";
  if (rule.trigger_type === "category") return `נדרש לפי קטגוריה: ${rule.category_key || ""}`;
  if (rule.trigger_type === "event") return `נדרש לפי התרחשות: ${rule.event_label || ""}`;
  if (rule.trigger_type === "participant_ratio") return `יחס לכמות חניכים: 1 לכל ${rule.ratio_per || "?"}`;
  if (rule.trigger_type === "bus_count") return "יחס לכמות האוטובוסים";
  return "כלל מערכת";
}

export function getAssignmentRuleSummary(rule: TripAssignmentRequirementRule) {
  if (rule.trigger_type === "always") return "נפתח בכל טיול";
  if (rule.trigger_type === "organized_transport") return "נפתח כשיש נסיעה מאורגנת";
  if (rule.trigger_type === "sleeping") return "נפתח כשיש לינה";
  if (rule.trigger_type === "category") return `נפתח לפי קטגוריה: ${rule.category_key || ""}`;
  if (rule.trigger_type === "event") return `נפתח לפי התרחשות: ${rule.event_label || ""}`;
  if (rule.trigger_type === "participant_ratio") return "נפתח כשיש חניכים לשיבוץ";
  if (rule.trigger_type === "bus_count") return "נפתח כשיש אוטובוסים";
  return "כלל שיבוץ";
}

export function buildRequiredStaffContext(details: Record<string, unknown> = {}, existingBusCount = 0): RequiredStaffContext {
  const timeline = Array.isArray(details.timeline) ? (details.timeline as Array<Record<string, unknown>>) : [];
  const categories = Array.from(new Set(timeline.map((item) => textValue(item.category)).filter(Boolean)));
  const eventLabels = Array.from(
    new Set(
      timeline
        .flatMap((item) => [item.finalSubCategory, item.subCategory, item.details, item.otherDetail])
        .map(normalizeEventLabel)
        .filter(Boolean),
    ),
  );
  const participantCount = numberValue(details.chanichimCount);
  const totalPeople = numberValue(details.totalTravelers) || participantCount;
  const hasOrganizedTransport = eventLabels.some((label) => label.includes("נסיעה מאורגנת"));
  const hasSleeping = categories.includes("sleeping") || eventLabels.some((label) => label.includes("לינ"));
  const calculatedBusCount = hasOrganizedTransport ? Math.max(1, Math.ceil(Math.max(totalPeople, participantCount) / 50)) : 0;

  return {
    participantCount,
    totalPeople,
    busCount: Math.max(existingBusCount, calculatedBusCount),
    hasOrganizedTransport,
    hasSleeping,
    categories,
    eventLabels,
  };
}

function ruleApplies(rule: Pick<TripRoleRequirementRule | TripAssignmentRequirementRule, "is_active" | "trigger_type" | "category_key" | "event_label">, context: RequiredStaffContext) {
  if (!rule.is_active) return false;
  if (rule.trigger_type === "always") return true;
  if (rule.trigger_type === "organized_transport") return context.hasOrganizedTransport;
  if (rule.trigger_type === "sleeping") return context.hasSleeping;
  if (rule.trigger_type === "participant_ratio") return context.participantCount > 0;
  if (rule.trigger_type === "bus_count") return context.busCount > 0;
  if (rule.trigger_type === "category") return Boolean(rule.category_key && context.categories.includes(rule.category_key));
  if (rule.trigger_type === "event") {
    const expected = normalizeEventLabel(rule.event_label);
    return Boolean(expected && context.eventLabels.some((label) => label === expected || label.includes(expected)));
  }
  return false;
}

function ruleQuantity(rule: TripRoleRequirementRule, context: RequiredStaffContext) {
  if (rule.calculation_type === "per_bus") return Math.max(rule.min_quantity, context.busCount * Math.max(1, rule.fixed_quantity || 1));
  if (rule.calculation_type === "ratio_participants") {
    const ratio = Math.max(1, Number(rule.ratio_per || 1));
    return Math.max(rule.min_quantity, Math.ceil(context.participantCount / ratio));
  }
  return Math.max(rule.min_quantity, Number(rule.fixed_quantity || 0));
}

export function calculateRequiredStaffPreview(details: Record<string, unknown>, rules: TripRoleRequirementRule[], existingBusCount = 0): RequiredStaffPreview {
  const context = buildRequiredStaffContext(details, existingBusCount);
  const rows = rules
    .filter((rule) => ruleApplies(rule, context))
    .map((rule) => {
      const quantity = ruleQuantity(rule, context);
      return {
        role_key: rule.role_key,
        role_label: rule.role_label,
        source_summary: getRoleRuleSummary(rule),
        required_quantity: quantity,
        approved_quantity: quantity,
        merge_policy: rule.merge_policy,
        status: "approved" as const,
        notes: "",
        order_index: rule.order_index,
      };
    })
    .filter((row) => row.required_quantity > 0)
    .sort((a, b) => a.order_index - b.order_index);

  return { rows, assignmentRows: calculateAssignmentPlanRows(DEFAULT_ASSIGNMENT_REQUIREMENT_RULES, context), context };
}

export function calculateRequiredPlanningPreview(
  details: Record<string, unknown>,
  roleRules: TripRoleRequirementRule[],
  assignmentRules: TripAssignmentRequirementRule[],
  existingBusCount = 0,
): RequiredStaffPreview {
  const context = buildRequiredStaffContext(details, existingBusCount);
  const staffPreview = calculateRequiredStaffPreview(details, roleRules, existingBusCount);
  return {
    rows: staffPreview.rows,
    assignmentRows: calculateAssignmentPlanRows(assignmentRules, context),
    context,
  };
}

export function calculateAssignmentPlanRows(assignmentRules: TripAssignmentRequirementRule[], context: RequiredStaffContext): ApprovedAssignmentPlanRow[] {
  return assignmentRules
    .filter((rule) => ruleApplies(rule, context))
    .map((rule) => ({
      assignment_key: rule.assignment_key,
      kind: rule.kind,
      title: rule.title,
      custom_kind_label: rule.custom_kind_label || null,
      source_summary: getAssignmentRuleSummary(rule),
      audience: rule.audience,
      creates_items: rule.creates_items,
      status: "approved" as const,
      order_index: rule.order_index,
    }))
    .sort((a, b) => a.order_index - b.order_index);
}

export function normalizeRoleRuleInput(input: Partial<TripRoleRequirementRule>, index = 0): TripRoleRequirementRule {
  const roleKey = textValue(input.role_key) || `custom_role_${index + 1}`;
  const roleLabel = textValue(input.role_label) || "תפקיד נוסף";
  const triggerType = input.trigger_type || "always";
  const calculationType = input.calculation_type || "fixed";
  const mergePolicy: RoleMergePolicy = input.merge_policy === "exclusive" ? "exclusive" : "mergeable";
  return {
    role_key: roleKey,
    role_label: roleLabel,
    trigger_type: triggerType,
    category_key: input.category_key || null,
    event_label: input.event_label || null,
    calculation_type: calculationType,
    fixed_quantity: Math.max(0, Number(input.fixed_quantity ?? 1) || 0),
    ratio_per: input.ratio_per ? Math.max(1, Number(input.ratio_per) || 1) : null,
    min_quantity: Math.max(0, Number(input.min_quantity ?? 0) || 0),
    merge_policy: mergePolicy,
    creates_staff_slot: input.creates_staff_slot ?? true,
    creates_bus_assignment: input.creates_bus_assignment ?? false,
    creates_room_assignment: input.creates_room_assignment ?? false,
    creates_group_assignment: input.creates_group_assignment ?? false,
    order_index: Number(input.order_index ?? index) || index,
    is_active: input.is_active ?? true,
  };
}

export function normalizeAssignmentRuleInput(input: Partial<TripAssignmentRequirementRule>, index = 0): TripAssignmentRequirementRule {
  const kind: RequiredAssignmentKind = input.kind === "buses" || input.kind === "groups" || input.kind === "rooms" || input.kind === "other" ? input.kind : "other";
  const fallbackTitle = kind === "buses" ? "שיבוץ אוטובוסים" : kind === "groups" ? "שיבוץ קבוצות" : kind === "rooms" ? "שיבוץ חדרים" : "שיבוץ אחר";
  const assignmentKey = textValue(input.assignment_key) || `${kind}_assignments_${index + 1}`;
  return {
    assignment_key: assignmentKey,
    kind,
    title: textValue(input.title) || fallbackTitle,
    custom_kind_label: kind === "other" ? textValue(input.custom_kind_label) || "אחר" : null,
    trigger_type: input.trigger_type || "always",
    category_key: input.category_key || null,
    event_label: input.event_label || null,
    audience: input.audience === "staff" || input.audience === "both" ? input.audience : "participants",
    creates_items: input.creates_items ?? kind === "buses",
    order_index: Number(input.order_index ?? index) || index,
    is_active: input.is_active ?? true,
  };
}

export async function fetchTripRoleRules(supabase: SupabaseLike): Promise<TripRoleRequirementRule[]> {
  const query = supabase
    .from("trip_role_requirement_rules")
    .select(
      "id, role_key, role_label, trigger_type, category_key, event_label, calculation_type, fixed_quantity, ratio_per, min_quantity, merge_policy, creates_staff_slot, creates_bus_assignment, creates_room_assignment, creates_group_assignment, order_index, is_active",
    ) as { order: (column: string, options?: Record<string, unknown>) => QueryResult<TripRoleRequirementRule[]> };
  const { data, error } = await query.order("order_index", { ascending: true });
  if (error || !data?.length) return DEFAULT_REQUIRED_ROLE_RULES;
  return data.map((row, index) => normalizeRoleRuleInput(row, index));
}

export async function fetchTripAssignmentRules(supabase: SupabaseLike): Promise<TripAssignmentRequirementRule[]> {
  const query = supabase
    .from("trip_assignment_requirement_rules")
    .select("id, assignment_key, kind, title, custom_kind_label, trigger_type, category_key, event_label, audience, creates_items, order_index, is_active") as {
    order: (column: string, options?: Record<string, unknown>) => QueryResult<TripAssignmentRequirementRule[]>;
  };
  const { data, error } = await query.order("order_index", { ascending: true });
  if (error || !data?.length) return DEFAULT_ASSIGNMENT_REQUIREMENT_RULES;
  return data.map((row, index) => normalizeAssignmentRuleInput(row, index));
}

export async function fetchApprovedRequiredStaffPlan(supabase: SupabaseLike, tripId: string): Promise<RequiredStaffPlanRow[]> {
  const query = supabase
    .from("trip_required_staff_plan")
    .select("role_key, role_label, source_summary, required_quantity, approved_quantity, merge_policy, status, notes, order_index") as {
    eq: (column: string, value: string) => { order: (column: string, options?: Record<string, unknown>) => QueryResult<RequiredStaffPlanRow[]> };
  };
  const { data, error } = await query.eq("trip_id", tripId).order("order_index", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function saveApprovedRequiredStaffPlan(supabase: SupabaseLike, tripId: string, rows: RequiredStaffPlanRow[], userId: string) {
  const deleteQuery = supabase.from("trip_required_staff_plan").delete() as { eq: (column: string, value: string) => QueryResult<null> };
  const deleteResult = await deleteQuery.eq("trip_id", tripId);
  if (deleteResult.error) throw new Error(deleteResult.error.message || "Failed to clear required staff plan");

  const approvedRows = rows
    .filter((row) => row.status !== "removed" && row.approved_quantity > 0)
    .map((row, index) => ({
      trip_id: tripId,
      role_key: row.role_key,
      role_label: row.role_label,
      source_summary: row.source_summary || "",
      required_quantity: Math.max(0, Number(row.required_quantity || 0)),
      approved_quantity: Math.max(0, Number(row.approved_quantity || 0)),
      merge_policy: row.merge_policy === "exclusive" ? "exclusive" : "mergeable",
      status: row.status || "approved",
      notes: row.notes || null,
      order_index: index,
      decided_by: userId,
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  if (!approvedRows.length) return;
  const insertResult = (await (supabase.from("trip_required_staff_plan").insert(approvedRows) as QueryResult<unknown>));
  if (insertResult.error) throw new Error(insertResult.error.message || "Failed to save required staff plan");
}

function splitName(name: string) {
  const parts = textValue(name).split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || parts[0] || "" };
}

function coordinatorStaffRow(tripId: string, details: Record<string, unknown>, roleKey: string, roleLabel: string, suffix = "primary") {
  const name = textValue(details.coordName);
  if (!name) return null;
  const split = splitName(name);
  return {
    trip_id: tripId,
    source: "manual",
    source_record_id: `required-staff:${roleKey}:${suffix}`,
    participant_type: "staff",
    full_name: name,
    phone: textValue(details.coordPhone) || null,
    contact_phone: null,
    registration_status: "תקן חובה",
    payment_status: null,
    parent_approval: "כן",
    medical_notes: null,
    role: roleLabel,
    notes: "נוצר אוטומטית ממצבת הצוות המאושרת",
    raw_data: {
      [REQUIRED_STAFF_RAW.protected]: true,
      [REQUIRED_STAFF_RAW.placeholder]: false,
      [REQUIRED_STAFF_RAW.roleKeys]: [roleKey],
      [REQUIRED_STAFF_RAW.roleLabels]: [roleLabel],
      [REQUIRED_STAFF_RAW.source]: "approved_required_staff",
      firstName: split.firstName,
      lastName: split.lastName,
      identity: textValue(details.coordId),
      birthDate: textValue(details.coordDob),
      fatherEmail: textValue(details.coordEmail),
      staffRole: roleLabel,
    },
    updated_at: new Date().toISOString(),
  };
}

function secondaryStaffRow(tripId: string, secondary: Record<string, unknown>) {
  const name = textValue(secondary.name);
  if (!name) return null;
  const roleLabel = textValue(secondary.role) || "אחראי נוסף";
  const split = splitName(name);
  return {
    trip_id: tripId,
    source: "manual",
    source_record_id: `required-staff:additional_leader:${textValue(secondary.userId) || "secondary"}`,
    participant_type: "staff",
    full_name: name,
    phone: textValue(secondary.phone) || null,
    contact_phone: null,
    registration_status: "תקן חובה",
    payment_status: null,
    parent_approval: "כן",
    medical_notes: null,
    role: roleLabel,
    notes: "נוצר אוטומטית כאחראי נוסף",
    raw_data: {
      [REQUIRED_STAFF_RAW.protected]: true,
      [REQUIRED_STAFF_RAW.placeholder]: false,
      [REQUIRED_STAFF_RAW.roleKeys]: ["additional_leader"],
      [REQUIRED_STAFF_RAW.roleLabels]: [roleLabel],
      [REQUIRED_STAFF_RAW.source]: "approved_required_staff",
      firstName: split.firstName,
      lastName: split.lastName,
      identity: textValue(secondary.idNumber),
      birthDate: textValue(secondary.dob),
      fatherEmail: textValue(secondary.email),
      staffRole: roleLabel,
    },
    updated_at: new Date().toISOString(),
  };
}

function placeholderStaffRow(tripId: string, role: RequiredStaffPlanRow, index: number) {
  const label = role.approved_quantity > 1 ? `${role.role_label} ${index + 1}` : role.role_label;
  return {
    trip_id: tripId,
    source: "manual",
    source_record_id: `required-staff:${role.role_key}:${index + 1}`,
    participant_type: "staff",
    full_name: `תקן חסר: ${label}`,
    phone: null,
    contact_phone: null,
    registration_status: "חסר איוש",
    payment_status: null,
    parent_approval: null,
    medical_notes: null,
    role: label,
    notes: role.source_summary,
    raw_data: {
      [REQUIRED_STAFF_RAW.protected]: true,
      [REQUIRED_STAFF_RAW.placeholder]: true,
      [REQUIRED_STAFF_RAW.roleKeys]: [role.role_key],
      [REQUIRED_STAFF_RAW.roleLabels]: [label],
      [REQUIRED_STAFF_RAW.source]: "approved_required_staff",
      staffRole: label,
      firstName: "תקן חסר:",
      lastName: label,
    },
    updated_at: new Date().toISOString(),
  };
}

async function upsertStaffRows(supabase: SupabaseLike, rows: unknown[]) {
  if (!rows.length) return;
  const result = await (supabase.from("trip_plan_participants").upsert(rows, { onConflict: "trip_id,source,source_record_id" }) as QueryResult<unknown>);
  if (result.error) throw new Error(result.error.message || "Failed to create required staff rows");
}

async function ensureBuses(supabase: SupabaseLike, tripId: string, targetBusCount: number) {
  if (targetBusCount <= 0) return [] as Array<{ id: string; name: string; bus_number?: string | null }>;
  const existingQuery = supabase.from("trip_plan_buses").select("id, name, bus_number") as {
    eq: (column: string, value: string) => { order: (column: string, options?: Record<string, unknown>) => QueryResult<Array<{ id: string; name: string; bus_number?: string | null }>> };
  };
  const existing = await existingQuery.eq("trip_id", tripId).order("created_at", { ascending: true });
  if (existing.error) throw new Error(existing.error.message || "Failed to read buses");
  const rows = existing.data || [];
  const missing = Math.max(0, targetBusCount - rows.length);
  if (missing > 0) {
    const start = rows.length + 1;
    const result = await (supabase.from("trip_plan_buses").insert(
      Array.from({ length: missing }, (_, offset) => ({
        trip_id: tripId,
        name: `אוטובוס ${start + offset}`,
        bus_number: String(start + offset),
        capacity: 0,
        notes: "נוצר אוטומטית לפי מצבת הצוות והנסיעה המאורגנת",
      })),
    ) as QueryResult<unknown>);
    if (result.error) throw new Error(result.error.message || "Failed to create buses");
  }

  const refreshed = await existingQuery.eq("trip_id", tripId).order("created_at", { ascending: true });
  return refreshed.data || [];
}

async function ensureAssignmentSet(supabase: SupabaseLike, tripId: string, kind: RequiredAssignmentKind, title: string, audience: RequiredAssignmentAudience = "participants", customKindLabel?: string | null) {
  const query = supabase.from("trip_plan_assignment_sets").select("id, title") as {
    eq: (column: string, value: string) => { eq: (column: string, value: string) => { maybeSingle: () => QueryResult<{ id: string }> } };
  };
  const existing = await query.eq("trip_id", tripId).eq("kind", kind).maybeSingle();
  if (existing.data?.id) {
    const updated = await (supabase
      .from("trip_plan_assignment_sets")
      .update({ title, audience, custom_kind_label: kind === "other" ? customKindLabel || title : null, updated_at: new Date().toISOString() }) as {
      eq: (column: string, value: string) => { eq: (column: string, value: string) => QueryResult<unknown> };
    }).eq("id", existing.data.id).eq("trip_id", tripId);
    if (updated.error) throw new Error(updated.error.message || "Failed to update assignment set");
    return existing.data.id;
  }
  const inserted = await (supabase
    .from("trip_plan_assignment_sets")
    .insert({ trip_id: tripId, kind, audience, title, custom_kind_label: kind === "other" ? customKindLabel || title : null, order_index: kind === "buses" ? 0 : kind === "groups" ? 1 : kind === "rooms" ? 2 : 3 }) as QueryResult<unknown>);
  if (inserted.error) throw new Error(inserted.error.message || "Failed to create assignment set");
  const refreshed = await query.eq("trip_id", tripId).eq("kind", kind).maybeSingle();
  if (!refreshed.data?.id) throw new Error("Failed to read assignment set");
  return refreshed.data.id;
}

async function applyAssignmentPlanRows(supabase: SupabaseLike, tripId: string, assignmentRows: ApprovedAssignmentPlanRow[], buses: Array<{ id: string; name: string; bus_number?: string | null }>) {
  const activeRows = assignmentRows.filter((row) => row.status !== "removed");
  for (const row of activeRows) {
    const setId = await ensureAssignmentSet(supabase, tripId, row.kind, row.title, row.audience, row.custom_kind_label);
    if (row.kind === "buses" && row.creates_items && buses.length) {
      await ensureBusAssignmentItemsForSet(supabase, tripId, setId, buses);
    }
  }
}

async function ensureBusAssignmentItemsForSet(supabase: SupabaseLike, tripId: string, setId: string, buses: Array<{ id: string; name: string; bus_number?: string | null }>) {
  const existingQuery = supabase.from("trip_plan_assignment_items").select("bus_id") as {
    eq: (column: string, value: string) => { eq: (column: string, value: string) => QueryResult<Array<{ bus_id?: string | null }>> };
  };
  const existing = await existingQuery.eq("trip_id", tripId).eq("assignment_set_id", setId);
  if (existing.error) throw new Error(existing.error.message || "Failed to read bus assignment items");
  const existingBusIds = new Set((existing.data || []).map((item) => textValue(item.bus_id)).filter(Boolean));
  const rows = buses.filter((bus) => !existingBusIds.has(bus.id)).map((bus, index) => ({
    trip_id: tripId,
    assignment_set_id: setId,
    bus_id: bus.id,
    name: bus.name || `אוטובוס ${index + 1}`,
    order_index: index,
  }));
  if (!rows.length) return;
  const result = await (supabase.from("trip_plan_assignment_items").insert(rows) as QueryResult<unknown>);
  if (result.error) throw new Error(result.error.message || "Failed to create bus assignment items");
}

export async function applyApprovedRequiredStaffPlan(
  supabase: SupabaseLike,
  trip: { id: string; details?: Record<string, unknown> | null },
  rows: RequiredStaffPlanRow[],
  context: RequiredStaffContext,
  assignmentRows: ApprovedAssignmentPlanRow[] = calculateAssignmentPlanRows(DEFAULT_ASSIGNMENT_REQUIREMENT_RULES, context),
) {
  const details = trip.details || {};
  const activeRows = rows.filter((row) => row.status !== "removed" && row.approved_quantity > 0);
  const staffRows: unknown[] = [];
  const tripLeader = activeRows.find((row) => row.role_key === "trip_leader");
  const coordinator = tripLeader ? coordinatorStaffRow(trip.id, details, tripLeader.role_key, tripLeader.role_label) : null;
  if (coordinator) staffRows.push(coordinator);

  const secondary = details.secondaryStaffObj;
  if (secondary && typeof secondary === "object") {
    const row = secondaryStaffRow(trip.id, secondary as Record<string, unknown>);
    if (row) staffRows.push(row);
  }

  const autoCovered = new Map<string, number>();
  if (coordinator && tripLeader) autoCovered.set(tripLeader.role_key, 1);

  for (const role of activeRows) {
    const covered = autoCovered.get(role.role_key) || 0;
    const missing = Math.max(0, role.approved_quantity - covered);
    for (let index = 0; index < missing; index += 1) {
      staffRows.push(placeholderStaffRow(trip.id, role, index));
    }
  }
  await upsertStaffRows(supabase, staffRows);

  const buses = await ensureBuses(supabase, trip.id, context.busCount);
  await applyAssignmentPlanRows(supabase, trip.id, assignmentRows, buses);
}
