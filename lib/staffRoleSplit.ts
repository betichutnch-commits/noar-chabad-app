import { DEFAULT_REQUIRED_ROLE_RULES, REQUIRED_STAFF_RAW } from "@/lib/tripRequiredRoles";

const textValue = (value: unknown) => String(value ?? "").trim();

export type StaffRolePair = { roleKey: string; roleLabel: string };

export function inferRoleKeyFromLabel(roleLabel: string): string {
  const trimmed = textValue(roleLabel);
  if (!trimmed) return `custom_${Date.now()}`;
  const base = trimmed.replace(/\s+\d+$/, "").trim();
  const rule = DEFAULT_REQUIRED_ROLE_RULES.find((item) => item.role_label === base);
  if (rule) return rule.role_key;
  return `custom_${base.replace(/\s+/g, "_").toLowerCase()}` || `custom_${Date.now()}`;
}

export function pairStaffRoles(roleKeys: string[], roleLabels: string[]): StaffRolePair[] {
  return roleLabels.map((roleLabel, index) => ({
    roleLabel,
    roleKey: textValue(roleKeys[index]?.split(":")[0]) || inferRoleKeyFromLabel(roleLabel),
  }));
}

export function canSplitStaffRole(roleLabels: string[]): boolean {
  return roleLabels.filter(Boolean).length > 1;
}

export function removeStaffRolePair(pairs: StaffRolePair[], roleLabel: string): { remaining: StaffRolePair[]; removed: StaffRolePair } | null {
  const trimmed = textValue(roleLabel);
  const index = pairs.findIndex((pair) => pair.roleLabel === trimmed);
  if (index < 0) return null;
  const removed = pairs[index];
  return {
    removed,
    remaining: pairs.filter((_, pairIndex) => pairIndex !== index),
  };
}

export function joinStaffRoleLabels(labels: string[]): string {
  return labels.map(textValue).filter(Boolean).join(", ");
}

export function roleLabelSlotIndex(roleLabel: string): number {
  const match = textValue(roleLabel).match(/(\d+)\s*$/);
  return match ? Number(match[1]) : 0;
}

export function buildSplitSourceRecordId(roleKey: string, roleLabel: string): string {
  const slotIndex = roleLabelSlotIndex(roleLabel);
  if (slotIndex > 0) return `required-staff:${roleKey}:${slotIndex}`;
  return `split-role:${roleKey}:${Date.now()}`;
}

export function buildSplitPlaceholderRow(input: {
  tripId: string;
  roleKey: string;
  roleLabel: string;
  requiredStaffSource?: string;
  notes?: string | null;
}) {
  const roleLabel = textValue(input.roleLabel);
  const roleKey = textValue(input.roleKey) || inferRoleKeyFromLabel(roleLabel);
  const source = textValue(input.requiredStaffSource) || "approved_required_staff";
  const isRequiredPlan = source === "approved_required_staff";

  return {
    trip_id: input.tripId,
    source: "manual" as const,
    source_record_id: buildSplitSourceRecordId(roleKey, roleLabel),
    participant_type: "staff" as const,
    full_name: `תקן חסר: ${roleLabel}`,
    phone: null,
    contact_phone: null,
    registration_status: "חסר איוש",
    payment_status: null,
    parent_approval: null,
    medical_notes: null,
    role: roleLabel,
    notes: textValue(input.notes) || "הופרד מתפקיד משורת צוות",
    raw_data: {
      [REQUIRED_STAFF_RAW.protected]: isRequiredPlan,
      [REQUIRED_STAFF_RAW.placeholder]: true,
      [REQUIRED_STAFF_RAW.roleKeys]: [roleKey],
      [REQUIRED_STAFF_RAW.roleLabels]: [roleLabel],
      [REQUIRED_STAFF_RAW.source]: source,
      staffRole: roleLabel,
      firstName: "תקן חסר:",
      lastName: "",
    },
    updated_at: new Date().toISOString(),
  };
}

export function buildUpdatedStaffAfterSplit(input: {
  raw: Record<string, unknown>;
  remaining: StaffRolePair[];
}) {
  const roleLabels = input.remaining.map((pair) => pair.roleLabel);
  const roleKeys = input.remaining.map((pair) => pair.roleKey);
  const joinedRole = joinStaffRoleLabels(roleLabels);

  return {
    role: joinedRole || null,
    raw_data: {
      ...input.raw,
      [REQUIRED_STAFF_RAW.roleKeys]: roleKeys,
      [REQUIRED_STAFF_RAW.roleLabels]: roleLabels,
      staffRole: joinedRole,
    },
  };
}
