import { REQUIRED_STAFF_RAW } from "@/lib/tripRequiredRoles";

export type StaffParticipantLike = {
  id: string;
  name?: string;
  full_name?: string;
  role?: string | null;
  raw?: Record<string, unknown> | null;
  raw_data?: Record<string, unknown> | null;
};

export type StaffRosterEntry = {
  id: string;
  displayName: string;
  isPlaceholder: boolean;
  roleKeys: string[];
  roleLabels: string[];
  personName: string | null;
};

export type StaffAssigneeValue = {
  participantId?: string | null;
  roleKey?: string | null;
  displayName: string;
};

export type PlanningRoleOption = {
  role_key: string;
  role_label: string;
};

const textValue = (value: unknown) => String(value ?? "").trim();

const rawData = (person: StaffParticipantLike) =>
  ((person.raw || person.raw_data || {}) as Record<string, unknown>) || {};

export const isStaffPlaceholder = (person: StaffParticipantLike) =>
  Boolean(rawData(person)[REQUIRED_STAFF_RAW.placeholder]);

export const staffRoleKeys = (person: StaffParticipantLike) => {
  const raw = rawData(person);
  const keys = raw[REQUIRED_STAFF_RAW.roleKeys];
  return Array.isArray(keys) ? keys.map(textValue).filter(Boolean) : [];
};

export const staffRoleLabels = (person: StaffParticipantLike) => {
  const raw = rawData(person);
  const labels = raw[REQUIRED_STAFF_RAW.roleLabels];
  if (Array.isArray(labels) && labels.length) return labels.map(textValue).filter(Boolean);
  const role = textValue(person.role);
  return role ? [role] : [];
};

export const staffPersonName = (person: StaffParticipantLike) => {
  const full = textValue(person.name || person.full_name);
  if (!full) return "";
  return full.replace(/^תקן חסר:\s*/i, "").trim();
};

export function getStaffDisplayLabel(person: StaffParticipantLike): string {
  if (isStaffPlaceholder(person)) {
    const labels = staffRoleLabels(person);
    return labels[0] || staffPersonName(person) || "תפקיד חסר";
  }
  const name = staffPersonName(person);
  const labels = staffRoleLabels(person);
  if (name && labels.length) return `${name} (${labels.join(", ")})`;
  return name || labels.join(", ") || "צוות";
}

export function buildStaffRoster(staff: StaffParticipantLike[]): StaffRosterEntry[] {
  return staff.map((person) => {
    const placeholder = isStaffPlaceholder(person);
    const roleKeys = staffRoleKeys(person);
    const roleLabels = staffRoleLabels(person);
    const personName = placeholder ? null : staffPersonName(person);
    return {
      id: person.id,
      displayName: getStaffDisplayLabel(person),
      isPlaceholder: placeholder,
      roleKeys,
      roleLabels,
      personName,
    };
  });
}

export function buildPlanningRoleOptions(
  previewRows: Array<{ role_key?: string; role_label?: string; approved_quantity?: number; required_quantity?: number; status?: string }>,
): PlanningRoleOption[] {
  const options: PlanningRoleOption[] = [];
  const seen = new Set<string>();
  for (const row of previewRows) {
    if (row.status === "removed") continue;
    const role_key = textValue(row.role_key);
    const role_label = textValue(row.role_label);
    if (!role_key || !role_label || seen.has(role_key)) continue;
    seen.add(role_key);
    const qty = Math.max(row.approved_quantity ?? 0, row.required_quantity ?? 0, 1);
    for (let index = 0; index < qty; index += 1) {
      options.push({
        role_key: qty > 1 ? `${role_key}:${index + 1}` : role_key,
        role_label: qty > 1 ? `${role_label} ${index + 1}` : role_label,
      });
    }
  }
  return options;
}

export function staffAssigneeFromRosterEntry(entry: StaffRosterEntry): StaffAssigneeValue {
  if (entry.isPlaceholder) {
    return {
      participantId: entry.id,
      roleKey: entry.roleKeys[0] || null,
      displayName: entry.roleLabels[0] || entry.displayName,
    };
  }
  return {
    participantId: entry.id,
    roleKey: entry.roleKeys[0] || null,
    displayName: entry.personName || entry.displayName,
  };
}

export function staffAssigneeFromPlanningRole(role: PlanningRoleOption): StaffAssigneeValue {
  const baseKey = role.role_key.split(":")[0] || role.role_key;
  return {
    participantId: null,
    roleKey: baseKey,
    displayName: role.role_label,
  };
}

export function emptyStaffAssignee(): StaffAssigneeValue {
  return { participantId: null, roleKey: null, displayName: "" };
}

export function staffAssigneeDisplayName(value: StaffAssigneeValue | null | undefined) {
  return textValue(value?.displayName);
}

export function staffAssigneeMatches(a: StaffAssigneeValue, b: StaffAssigneeValue) {
  if (a.participantId && b.participantId) return a.participantId === b.participantId;
  if (a.roleKey && b.roleKey) return a.roleKey === b.roleKey && textValue(a.displayName) === textValue(b.displayName);
  return textValue(a.displayName) === textValue(b.displayName);
}

export function resolveStaffAssigneeFromText(
  text: string,
  roster: StaffRosterEntry[],
  planningRoles: PlanningRoleOption[] = [],
): StaffAssigneeValue {
  const trimmed = textValue(text);
  if (!trimmed) return emptyStaffAssignee();

  for (const entry of roster) {
    if (entry.isPlaceholder) {
      if (entry.roleLabels.some((label) => label === trimmed || trimmed.includes(label))) {
        return staffAssigneeFromRosterEntry(entry);
      }
      if (entry.displayName === trimmed || `תקן חסר: ${entry.roleLabels[0]}` === trimmed) {
        return staffAssigneeFromRosterEntry(entry);
      }
      continue;
    }
    if (entry.personName === trimmed || entry.displayName === trimmed || entry.displayName.startsWith(`${trimmed} (`)) {
      return staffAssigneeFromRosterEntry(entry);
    }
  }

  for (const role of planningRoles) {
    if (role.role_label === trimmed) return staffAssigneeFromPlanningRole(role);
  }

  return { participantId: null, roleKey: null, displayName: trimmed };
}

export function resolveStaffAssigneeFromFields(input: {
  participantId?: string | null;
  roleKey?: string | null;
  displayName?: string | null;
  roster?: StaffRosterEntry[];
}): StaffAssigneeValue {
  const roster = input.roster || [];
  if (input.participantId) {
    const entry = roster.find((item) => item.id === input.participantId);
    if (entry) return staffAssigneeFromRosterEntry(entry);
    return {
      participantId: input.participantId,
      roleKey: input.roleKey || null,
      displayName: textValue(input.displayName),
    };
  }
  if (input.roleKey) {
    const entry = roster.find((item) => item.isPlaceholder && item.roleKeys.includes(input.roleKey || ""));
    if (entry) return staffAssigneeFromRosterEntry(entry);
    return {
      participantId: null,
      roleKey: input.roleKey,
      displayName: textValue(input.displayName),
    };
  }
  return resolveStaffAssigneeFromText(textValue(input.displayName), roster);
}
