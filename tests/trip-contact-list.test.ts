import { describe, expect, it } from "vitest";
import {
  isDeptReviewEnabled,
  isTripLeaderStaffContact,
  resolveDepartmentContactProfiles,
} from "@/lib/tripContactList";

describe("tripContactList", () => {
  it("detects dept review capability from user metadata or profile role", () => {
    expect(isDeptReviewEnabled({ role: "dept_staff", can_dept_review: true })).toBe(true);
    expect(isDeptReviewEnabled({ role: "dept_staff", can_dept_review: "true" })).toBe(true);
    expect(isDeptReviewEnabled({ role: "dept_trips_officer" })).toBe(true);
    expect(isDeptReviewEnabled({}, { role: "dept_trips_officer" })).toBe(true);
    expect(isDeptReviewEnabled({ role: "dept_staff", can_dept_review: false })).toBe(false);
  });

  it("moves a lone dept staff member to trips officer instead of department manager", () => {
    const profiles = [{ id: "officer-1", department: "בת מלך", role: "dept_staff", official_name: "רחל", last_name: "הלפרין" }];
    const resolved = resolveDepartmentContactProfiles({
      tripDepartment: "בת מלך",
      profiles,
      metaByUserId: new Map([["officer-1", { role: "dept_staff", department: "בת מלך", nickname: "מצאל" }]]),
    });
    expect(resolved.deptManager).toBeNull();
    expect(resolved.deptTripsOfficer?.id).toBe("officer-1");
  });

  it("resolves department manager and trips officer separately", () => {
    const profiles = [
      { id: "manager-1", department: "בת מלך", role: "dept_staff", full_name: "מנהלת מחלקה" },
      { id: "officer-1", department: "בת מלך", role: "dept_staff", full_name: "אחראית טיולים" },
    ];
    const metaByUserId = new Map<string, Record<string, unknown>>([
      ["manager-1", { role: "dept_staff", department: "בת מלך", can_dept_review: false }],
      ["officer-1", { role: "dept_staff", department: "בת מלך", can_dept_review: true }],
    ]);

    const resolved = resolveDepartmentContactProfiles({
      tripDepartment: "בת מלך",
      profiles,
      metaByUserId,
    });

    expect(resolved.deptManager?.id).toBe("manager-1");
    expect(resolved.deptTripsOfficer?.id).toBe("officer-1");
  });

  it("skips trip leader staff rows that duplicate coordinator contact", () => {
    expect(
      isTripLeaderStaffContact({
        id: "staff-1",
        role: "אחראי טיול",
        raw_data: { requiredRoleKeys: ["trip_leader"], requiredRoleLabels: ["אחראי טיול"] },
      }),
    ).toBe(true);
    expect(
      isTripLeaderStaffContact({
        id: "staff-2",
        role: "מלווה אוטובוס",
        raw_data: { requiredRoleKeys: ["bus_escort"], requiredRoleLabels: ["מלווה אוטובוס"] },
      }),
    ).toBe(false);
  });
});
