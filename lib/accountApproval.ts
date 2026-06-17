import type { User } from "@supabase/supabase-js";

const normalizeEmail = (email?: string | null): string =>
  String(email || "").trim().toLowerCase();

const getSuperAdminEmail = (): string | null => {
  const raw = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
  const v = String(raw || "").trim().toLowerCase();
  return v || null;
};

/** בדיקת אישור כניסה למערכת (דשבורד / מנהל / מטה) — תואם ל־app/page.tsx */
export const isUserApprovedForAppAccess = (user: User | null): boolean => {
  if (!user) return false;
  const superAdmin = getSuperAdminEmail();
  if (superAdmin && normalizeEmail(user.email) === superAdmin) return true;
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const status = String(meta.status || "pending").trim().toLowerCase();
  return status === "approved";
};
