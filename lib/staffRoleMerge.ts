import { DEFAULT_REQUIRED_ROLE_RULES } from "@/lib/tripRequiredRoles";
import { staffRoleKeys, type StaffParticipantLike } from "@/lib/staffRoster";

export type StaffRoleMergeValidation = { ok: true } | { ok: false; message: string };

export const staffRoleKeyLabel = (roleKey: string) =>
  DEFAULT_REQUIRED_ROLE_RULES.find((rule) => rule.role_key === roleKey)?.role_label || roleKey;

export function findConflictingStaffRoleKeys(
  target: StaffParticipantLike | null | undefined,
  placeholders: StaffParticipantLike[],
  candidate?: StaffParticipantLike,
): string[] {
  const counts = new Map<string, number>();
  const bump = (roleKey: string) => counts.set(roleKey, (counts.get(roleKey) || 0) + 1);

  if (target) staffRoleKeys(target).forEach(bump);
  placeholders.forEach((person) => staffRoleKeys(person).forEach(bump));
  if (candidate) staffRoleKeys(candidate).forEach(bump);

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([roleKey]) => roleKey);
}

export function validateStaffRoleMerge(
  target: StaffParticipantLike | null | undefined,
  placeholders: StaffParticipantLike[],
): StaffRoleMergeValidation {
  const conflicts = findConflictingStaffRoleKeys(target, placeholders);
  if (!conflicts.length) return { ok: true };

  const labels = conflicts.map(staffRoleKeyLabel);
  const targetKeys = target ? staffRoleKeys(target) : [];
  const hasTargetConflict = conflicts.some((roleKey) => targetKeys.includes(roleKey));

  if (labels.length === 1) {
    if (hasTargetConflict) {
      return {
        ok: false,
        message: `לא ניתן למזג שני תפקידים מאותה קטגוריה (${labels[0]}). לאיש הצוות כבר משויך תפקיד מסוג זה.`,
      };
    }
    return { ok: false, message: `לא ניתן למזג שני תפקידים מאותה קטגוריה (${labels[0]}).` };
  }

  if (hasTargetConflict) {
    return {
      ok: false,
      message: `לא ניתן למזג תפקידים מאותה קטגוריה. לאיש הצוות כבר משויכים: ${labels.filter((label, index) => targetKeys.includes(conflicts[index])).join(", ")}.`,
    };
  }

  return { ok: false, message: `לא ניתן למזג תפקידים מאותה קטגוריה: ${labels.join(", ")}.` };
}

export function canAddPlaceholderToMerge(
  target: StaffParticipantLike | null | undefined,
  selectedPlaceholders: StaffParticipantLike[],
  candidate: StaffParticipantLike,
): boolean {
  return findConflictingStaffRoleKeys(target, selectedPlaceholders, candidate).length === 0;
}
