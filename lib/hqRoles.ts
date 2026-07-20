import type { User } from "@supabase/supabase-js";
import { DEPARTMENTS_CONFIG } from "@/lib/constants";

export const HQ_ROLE_KEYS = [
  "dept_manager",
  "branch_officer",
  "dept_secretary",
  "dept_pashash",
  "dept_member",
] as const;

export type HqRole = (typeof HQ_ROLE_KEYS)[number];

type DepartmentLanguage = "male" | "female" | "mixed";

const normalizeDepartment = (department?: string | null): string => {
  return String(department ?? "")
    .trim()
    .replace(/״/g, '"')
    .replace(/\s+/g, " ");
};

const getDepartmentLanguage = (department?: string | null): DepartmentLanguage => {
  const normalized = normalizeDepartment(department);
  if (!normalized) return "mixed";

  const direct = DEPARTMENTS_CONFIG[normalized];
  if (direct) return direct.gender;

  if (normalized.includes("בת מלך") || normalized.includes("בנות חב")) return "female";
  if (normalized.includes("פנסאים") || normalized.includes("תמים")) return "male";
  if (normalized.includes("מועדונים") || normalized.includes("מועדוני")) return "mixed";

  return "mixed";
};

export const isHqRole = (value: unknown): value is HqRole =>
  typeof value === "string" && (HQ_ROLE_KEYS as readonly string[]).includes(value);

export const normalizeHqRoles = (value: unknown): HqRole[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<HqRole>();
  for (const item of value) {
    if (isHqRole(item) && !seen.has(item)) seen.add(item);
  }
  return Array.from(seen);
};

export const getHqRoleLabel = (role: HqRole, department?: string | null): string => {
  const language = getDepartmentLanguage(department);
  switch (role) {
    case "dept_manager":
      if (language === "female") return "מנהלת המחלקה";
      if (language === "male") return "מנהל המחלקה";
      return "מנהל/ת המחלקה";
    case "branch_officer":
      if (language === "female") return "אחראית הסניפים";
      if (language === "male") return "אחראי הסניפים";
      return "אחראי/ת הסניפים";
    case "dept_secretary":
      if (language === "female") return "מזכירת המחלקה";
      if (language === "male") return "מזכיר המחלקה";
      return "מזכיר/ת המחלקה";
    case "dept_pashash":
      if (language === "female") return "אחראית פש״ש במטה המחלקה";
      if (language === "male") return "אחראי פש״ש במטה המחלקה";
      return "אחראי/ת פש״ש במטה המחלקה";
    case "dept_member":
      return "חבר מטה מחלקה";
    default:
      return role;
  }
};

export const HQ_ROLE_OPTIONS = HQ_ROLE_KEYS.map((value) => ({
  value,
  labelFor: (department?: string | null) => getHqRoleLabel(value, department),
}));

export type HqRolesSource = {
  hq_roles?: unknown;
  can_dept_review?: unknown;
  role?: unknown;
};

const isTruthyFlag = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "yes"].includes(value.toLowerCase());
  if (typeof value === "number") return value === 1;
  return false;
};

/** Resolve hq_roles from profile/meta, with legacy can_dept_review / dept_trips_officer fallback. */
export const resolveHqRolesFromMeta = (source?: HqRolesSource | null): HqRole[] => {
  if (!source) return [];
  const fromArray = normalizeHqRoles(source.hq_roles);
  if (fromArray.length > 0) return fromArray;

  const role = String(source.role ?? "").toLowerCase();
  if (role === "dept_trips_officer" || isTruthyFlag(source.can_dept_review)) {
    return ["branch_officer"];
  }
  if (role === "dept_staff") return ["dept_member"];
  return [];
};

export const getHqRoles = (
  user: User | null,
  profile?: { hq_roles?: unknown; can_dept_review?: unknown; role?: string | null } | null,
): HqRole[] => {
  if (!user && !profile) return [];
  const meta = (user?.user_metadata ?? {}) as HqRolesSource;
  const fromProfile = normalizeHqRoles(profile?.hq_roles);
  if (fromProfile.length > 0) return fromProfile;

  const fromMeta = normalizeHqRoles(meta.hq_roles);
  if (fromMeta.length > 0) return fromMeta;

  return resolveHqRolesFromMeta({
    role: profile?.role ?? meta.role,
    can_dept_review: profile?.can_dept_review ?? meta.can_dept_review,
    hq_roles: meta.hq_roles,
  });
};

export const hasHqRole = (
  user: User | null,
  role: HqRole,
  profile?: { hq_roles?: unknown; can_dept_review?: unknown; role?: string | null } | null,
): boolean => getHqRoles(user, profile).includes(role);

export const formatHqRolesLabel = (
  roles: HqRole[],
  department?: string | null,
): string => {
  if (!roles.length) return department ? `צוות מטה - ${department}` : "צוות מטה";
  const labels = roles.map((r) => getHqRoleLabel(r, department));
  const joined = labels.join(", ");
  return department ? `${joined} · ${department}` : joined;
};

export const hqRolesIncludeBranchOfficer = (roles: HqRole[]): boolean =>
  roles.includes("branch_officer");

export const ensureDefaultHqRoles = (roles: HqRole[]): HqRole[] =>
  roles.length > 0 ? roles : ["dept_member"];
