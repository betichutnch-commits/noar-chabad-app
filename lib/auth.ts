import type { User } from "@supabase/supabase-js";
import { DEPARTMENTS_CONFIG } from "@/lib/constants";

const MANAGER_DEPARTMENT = "בטיחות ומפעלים";

export type SupportedRole =
  | "admin"
  | "safety_admin"
  | "dept_staff"
  | "dept_trips_officer"
  | "coordinator"
  | "user";

export interface UserLikeProfile {
  role?: string | null;
  department?: string | null;
  is_tech_admin?: boolean | null;
}

const resolveRole = (user: User | null, profile?: UserLikeProfile | null): string => {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  return String(profile?.role ?? meta.role ?? "").toLowerCase();
};

export const isManagerUser = (user: User | null, profile?: UserLikeProfile | null): boolean => {
  if (!user) return false;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const role = resolveRole(user, profile);
  const department = String(profile?.department ?? meta.department ?? "");
  const isTechAdmin = Boolean(profile?.is_tech_admin ?? meta.is_tech_admin);

  return (
    role === "admin" ||
    role === "safety_admin" ||
    role === "dept_staff" ||
    isTechAdmin ||
    department.includes(MANAGER_DEPARTMENT)
  );
};

export const isDeptTripsOfficer = (
  user: User | null,
  profile?: UserLikeProfile | null,
): boolean => {
  if (!user) return false;
  return resolveRole(user, profile) === "dept_trips_officer";
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
    case "dept_staff":
      return department ? `צוות מטה - ${department}` : "צוות מטה";
    case "dept_trips_officer":
      return department
        ? `${getDeptTripsOfficerTitle(department)} - ${department}`
        : "אחראי/ת טיולי הרכזים/ות";
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
    case "dept_staff":
      return "צוות מטה";
    case "dept_trips_officer":
      return getDeptTripsOfficerTitle(department);
    case "coordinator":
      return getCoordinatorRoleTitle(department);
    default:
      return "משתמש";
  }
};

export const sanitizeInternalReturnUrl = (
  value: string | null | undefined,
  fallback = "/dashboard",
): string => {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  return value;
};
