import type { User } from "@supabase/supabase-js";

const MANAGER_DEPARTMENT = "בטיחות ומפעלים";

export type SupportedRole = "admin" | "safety_admin" | "dept_staff" | "coordinator" | "user";

export interface UserLikeProfile {
  role?: string | null;
  department?: string | null;
  is_tech_admin?: boolean | null;
}

export const isManagerUser = (user: User | null, profile?: UserLikeProfile | null): boolean => {
  if (!user) return false;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const role = String(profile?.role ?? meta.role ?? "").toLowerCase();
  const department = String(profile?.department ?? meta.department ?? "");
  const isTechAdmin = Boolean(profile?.is_tech_admin ?? meta.is_tech_admin);

  return (
    role === "admin" ||
    role === "safety_admin" ||
    isTechAdmin ||
    department.includes(MANAGER_DEPARTMENT)
  );
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
