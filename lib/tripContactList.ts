import { getDeptTripsOfficerTitle } from "@/lib/auth";
import { normalizeDepartmentKey } from "@/lib/notifications/recipients";
import { staffRoleKeys, staffRoleLabels, type StaffParticipantLike } from "@/lib/staffRoster";

const textValue = (value: unknown) => String(value ?? "").trim();

export type DepartmentContactProfiles = {
  deptManager: Record<string, unknown> | null;
  deptTripsOfficer: Record<string, unknown> | null;
};

export function isDeptReviewEnabled(meta: Record<string, unknown>, profile?: Record<string, unknown>) {
  const role = textValue(profile?.role || meta.role).toLowerCase();
  if (role === "dept_trips_officer") return true;
  if (role !== "dept_staff") return false;
  const value = meta.can_dept_review;
  return value === true || textValue(value).toLowerCase() === "true";
}

export function isTripLeaderStaffContact(person: StaffParticipantLike) {
  if (staffRoleKeys(person).includes("trip_leader")) return true;
  return staffRoleLabels(person).some((label) => /אחראי(?:ת)?\s*(?:ה)?טיול/.test(label));
}

export function resolveDepartmentContactProfiles(input: {
  tripDepartment: string;
  profiles: Array<Record<string, unknown>>;
  metaByUserId: Map<string, Record<string, unknown>>;
}): DepartmentContactProfiles {
  const deptKey = normalizeDepartmentKey(input.tripDepartment);
  const inDepartment = input.profiles.filter(
    (profile) => normalizeDepartmentKey(textValue(profile.department)) === deptKey,
  );

  let deptTripsOfficer: Record<string, unknown> | null = null;
  let deptManager: Record<string, unknown> | null = null;

  for (const profile of inDepartment) {
    const meta = input.metaByUserId.get(textValue(profile.id)) || {};
    const role = textValue(profile.role).toLowerCase();
    if (role !== "dept_staff" && role !== "dept_trips_officer") continue;

    if (isDeptReviewEnabled(meta, profile)) {
      if (!deptTripsOfficer) deptTripsOfficer = profile;
      continue;
    }
    if (!deptManager) deptManager = profile;
  }

  if (!deptTripsOfficer && deptManager && inDepartment.length === 1) {
    deptTripsOfficer = deptManager;
    deptManager = null;
  }

  if (deptManager && deptTripsOfficer && textValue(deptManager.id) === textValue(deptTripsOfficer.id)) {
    deptManager = null;
  }

  return { deptManager, deptTripsOfficer };
}

export function deptTripsOfficerContactRole(department?: string | null) {
  return getDeptTripsOfficerTitle(department);
}
