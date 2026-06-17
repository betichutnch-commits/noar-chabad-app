import { describe, expect, it, afterEach } from "vitest";
import { isUserApprovedForAppAccess } from "@/lib/accountApproval";
import type { User } from "@supabase/supabase-js";

const asUser = (partial: Partial<User> & { user_metadata?: Record<string, unknown> }): User =>
  ({
    id: "u1",
    app_metadata: {},
    aud: "authenticated",
    created_at: "",
    ...partial,
  }) as User;

describe("isUserApprovedForAppAccess", () => {
  const prev = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
    else process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL = prev;
  });

  it("returns false for null user", () => {
    expect(isUserApprovedForAppAccess(null)).toBe(false);
  });

  it("approves super admin email from env", () => {
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL = "Admin@Example.com";
    const user = asUser({ email: "admin@example.com", user_metadata: { status: "pending" } });
    expect(isUserApprovedForAppAccess(user)).toBe(true);
  });

  it("requires metadata status approved for normal users", () => {
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL = "";
    const pending = asUser({ email: "x@y.com", user_metadata: { status: "pending" } });
    expect(isUserApprovedForAppAccess(pending)).toBe(false);
    const approved = asUser({ email: "x@y.com", user_metadata: { status: "approved" } });
    expect(isUserApprovedForAppAccess(approved)).toBe(true);
  });

  it("treats missing status as pending", () => {
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL = "";
    const user = asUser({ email: "x@y.com", user_metadata: {} });
    expect(isUserApprovedForAppAccess(user)).toBe(false);
  });
});
