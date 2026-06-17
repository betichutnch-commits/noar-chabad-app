import { describe, expect, it } from "vitest";
import { hasDeptReviewCapability, isDeptReviewOfficer, isManagerUser } from "@/lib/auth";

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
