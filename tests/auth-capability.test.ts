import { describe, expect, it } from "vitest";
import { hasDeptReviewCapability, isDeptReviewOfficer, isManagerUser, formatUserRoleLabel } from "@/lib/auth";
import {
  formatHqRolesLabel,
  getHqRoles,
  normalizeHqRoles,
  resolveHqRolesFromMeta,
} from "@/lib/hqRoles";

const asUser = (meta: Record<string, unknown> = {}) =>
  ({ user_metadata: meta } as unknown as import("@supabase/supabase-js").User);

describe("dept review capability model", () => {
  it("grants dept-review capability to dept_staff with can_dept_review=true", () => {
    const user = asUser({ role: "dept_staff", can_dept_review: true });
    expect(hasDeptReviewCapability(user)).toBe(true);
    expect(isDeptReviewOfficer(user)).toBe(true);
  });

  it("does not grant dept-review capability to dept_staff without flag", () => {
    const user = asUser({ role: "dept_staff", can_dept_review: false });
    expect(hasDeptReviewCapability(user)).toBe(false);
  });

  it("keeps backward compatibility for legacy dept_trips_officer role", () => {
    const user = asUser({ role: "dept_trips_officer" });
    expect(hasDeptReviewCapability(user)).toBe(true);
  });

  it("grants dept-review via hq_roles branch_officer", () => {
    const user = asUser({
      role: "dept_staff",
      hq_roles: ["dept_manager", "branch_officer"],
      can_dept_review: false,
    });
    expect(hasDeptReviewCapability(user)).toBe(true);
  });

  it("denies dept-review when hq_roles lack branch_officer", () => {
    const user = asUser({
      role: "dept_staff",
      hq_roles: ["dept_manager", "dept_secretary"],
      can_dept_review: false,
    });
    expect(hasDeptReviewCapability(user)).toBe(false);
  });
});

describe("hq roles helpers", () => {
  it("normalizes and dedupes hq_roles", () => {
    expect(normalizeHqRoles(["dept_manager", "dept_manager", "nope", "dept_member"])).toEqual([
      "dept_manager",
      "dept_member",
    ]);
  });

  it("resolves legacy can_dept_review to branch_officer", () => {
    expect(resolveHqRolesFromMeta({ role: "dept_staff", can_dept_review: true })).toEqual([
      "branch_officer",
    ]);
  });

  it("formats multi role labels", () => {
    const label = formatHqRolesLabel(["dept_manager", "branch_officer"], "הפנסאים");
    expect(label).toContain("מנהל המחלקה");
    expect(label).toContain("אחראי הסניפים");
    expect(label).toContain("הפנסאים");
  });

  it("getHqRoles prefers explicit hq_roles array", () => {
    const user = asUser({
      role: "dept_staff",
      can_dept_review: true,
      hq_roles: ["dept_pashash"],
    });
    expect(getHqRoles(user)).toEqual(["dept_pashash"]);
  });

  it("formatUserRoleLabel uses hq_roles for dept_staff", () => {
    const label = formatUserRoleLabel({
      role: "dept_staff",
      department: "בת מלך",
      hqRoles: ["dept_secretary", "dept_member"],
    });
    expect(label).toContain("מזכירת המחלקה");
  });
});

describe("manager separation", () => {
  it("does not treat dept_staff as manager by default", () => {
    const user = asUser({ role: "dept_staff" });
    expect(isManagerUser(user)).toBe(false);
  });

  it("treats safety_admin as manager", () => {
    const user = asUser({ role: "safety_admin" });
    expect(isManagerUser(user)).toBe(true);
  });
});
