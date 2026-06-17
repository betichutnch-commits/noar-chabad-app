import type { User } from "@supabase/supabase-js";
import { DEPARTMENTS_CONFIG } from "@/lib/constants";

const MANAGER_DEPARTMENT = "בטיחות ומפעלים";

export type SupportedRole =
  | "admin"
  | "safety_admin"
  | "secretary"
  | "dept_staff"
  | "coordinator"
  | "user";

export interface UserLikeProfile {
  role?: string | null;
  department?: string | null;
  is_tech_admin?: boolean | null;
  can_dept_review?: boolean | null;
}

const resolveRole = (user: User | null, profile?: UserLikeProfile | null): string => {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  return String(profile?.role ?? meta.role ?? "").toLowerCase();
};

const isDeptReviewCapabilityEnabled = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "yes"].includes(value.toLowerCase());
  if (typeof value === "number") return value === 1;
  return false;
};

const isLegacyDeptTripsOfficerRole = (role: string): boolean => role === "dept_trips_officer";

export const isManagerUser = (user: User | null, profile?: UserLikeProfile | null): boolean => {
  if (!user) return false;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const role = resolveRole(user, profile);
  const isTechAdmin = Boolean(profile?.is_tech_admin ?? meta.is_tech_admin);

  return role === "admin" || role === "safety_admin" || role === "secretary" || isTechAdmin;
};

export const isTechAdminUser = (user: User | null, profile?: UserLikeProfile | null): boolean => {
  if (!user) return false;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return Boolean(profile?.is_tech_admin ?? meta.is_tech_admin);
};

export const hasDeptReviewCapability = (
  user: User | null,
  profile?: UserLikeProfile | null,
): boolean => {
  if (!user) return false;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const role = resolveRole(user, profile);
  if (isLegacyDeptTripsOfficerRole(role)) return true;
  if (role !== "dept_staff") return false;

  const capabilityValue = profile?.can_dept_review ?? meta.can_dept_review;
  return isDeptReviewCapabilityEnabled(capabilityValue);
};

export const isDeptReviewOfficer = (
  user: User | null,
  profile?: UserLikeProfile | null,
): boolean => {
  return hasDeptReviewCapability(user, profile);
};

export interface RoleLabelInput {
  role?: string | null;
  department?: string | null;
  branchName?: string | null;
}

type DepartmentLanguage = "male" | "female" | "mixed";

const normalizeDepartment = (department?: string | null): string => {
  return String(department ?? "")
    .trim()
    .replace(/״/g, '"')
    .replace(/\s+/g, " ");
};

export const getDepartmentLanguage = (department?: string | null): DepartmentLanguage => {
  const normalized = normalizeDepartment(department);
  if (!normalized) return "mixed";

  const direct = DEPARTMENTS_CONFIG[normalized];
  if (direct) return direct.gender;

  if (normalized.includes("בת מלך") || normalized.includes("בנות חב")) return "female";
  if (normalized.includes("פנסאים") || normalized.includes("תמים")) return "male";
  if (normalized.includes("מועדונים") || normalized.includes("מועדוני")) return "mixed";

  return "mixed";
};

export const getCoordinatorRoleTitle = (department?: string | null): string => {
  const language = getDepartmentLanguage(department);
  if (language === "female") return "רכזת סניף";
  if (language === "male") return "רכז סניף";
  return "רכז/ת סניף";
};

export const getCoordinatorsPluralTitle = (department?: string | null): string => {
  const language = getDepartmentLanguage(department);
  if (language === "female") return "רכזות";
  if (language === "male") return "רכזים";
  return "רכזים/ות";
};

export const getDeptTripsOfficerTitle = (department?: string | null): string => {
  const language = getDepartmentLanguage(department);
  if (language === "female") return "אחראית טיולי הרכזות";
  if (language === "male") return "אחראי טיולי הרכזים";
  return "אחראי/ת טיולי הרכזים/ות";
};

export const formatUserRoleLabel = ({
  role,
  department,
  branchName,
}: RoleLabelInput): string => {
  const normalized = String(role ?? "").toLowerCase();

  switch (normalized) {
    case "admin":
      return "מנהל מערכת";
    case "safety_admin":
      return "מנהל בטיחות";
    case "secretary":
      return "מזכ״לית הארגון";
    case "dept_staff":
      return department ? `צוות מטה - ${department}` : "צוות מטה";
    case "dept_trips_officer":
      return department
        ? `צוות מטה - ${department} (${getDeptTripsOfficerTitle(department)})`
        : `צוות מטה (${getDeptTripsOfficerTitle(department)})`;
    case "coordinator":
      return branchName
        ? `${getCoordinatorRoleTitle(department)} ${branchName}`
        : getCoordinatorRoleTitle(department);
    default:
      if (department && department.includes(MANAGER_DEPARTMENT)) {
        return "מחלקת בטיחות ומפעלים";
      }
      return branchName ? `משתמש - ${branchName}` : "משתמש";
  }
};

export const getUserRoleShortLabel = (
  role?: string | null,
  department?: string | null,
): string => {
  const normalized = String(role ?? "").toLowerCase();
  switch (normalized) {
    case "admin":
      return "מנהל מערכת";
    case "safety_admin":
      return "מנהל בטיחות";
    case "secretary":
      return "מזכ״לית";
    case "dept_staff":
      return "צוות מטה";
    case "dept_trips_officer":
      return `צוות מטה (${getDeptTripsOfficerTitle(department)})`;
    case "coordinator":
      return getCoordinatorRoleTitle(department);
    default:
      return "משתמש";
  }
};

// Backward-compat for older imports/usages.
export const isDeptTripsOfficer = isDeptReviewOfficer;

export const sanitizeInternalReturnUrl = (
  value: string | null | undefined,
  fallback = "/dashboard",
): string => {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  return value;
};
