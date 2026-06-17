import { describe, expect, it } from "vitest";
import {
  buildPlanningRoleOptions,
  buildStaffRoster,
  isStaffPlaceholder,
  resolveStaffAssigneeFromText,
  staffAssigneeFromPlanningRole,
} from "@/lib/staffRoster";

describe("staffRoster", () => {
  it("detects placeholder staff rows", () => {
    expect(
      isStaffPlaceholder({
        id: "1",
        raw_data: { requiredStaffPlaceholder: true },
      }),
    ).toBe(true);
  });

  it("builds planning role options with quantities", () => {
    const options = buildPlanningRoleOptions([
      { role_key: "guide", role_label: "מדריך", required_quantity: 2, status: "approved" },
    ]);
    expect(options).toHaveLength(2);
    expect(options[0]?.role_label).toBe("מדריך 1");
    expect(options[1]?.role_label).toBe("מדריך 2");
  });

  it("resolves assignee text to roster placeholder", () => {
    const roster = buildStaffRoster([
      {
        id: "slot-1",
        full_name: "תקן חסר: מדריך",
        role: "מדריך",
        raw_data: {
          requiredStaffPlaceholder: true,
          requiredRoleKeys: ["guide"],
          requiredRoleLabels: ["מדריך"],
        },
      },
    ]);
    const resolved = resolveStaffAssigneeFromText("מדריך", roster);
    expect(resolved.participantId).toBe("slot-1");
    expect(resolved.displayName).toBe("מדריך");
  });

  it("maps planning role to assignee without participant id", () => {
    const assignee = staffAssigneeFromPlanningRole({ role_key: "guide", role_label: "מדריך" });
    expect(assignee.participantId).toBeNull();
    expect(assignee.roleKey).toBe("guide");
    expect(assignee.displayName).toBe("מדריך");
  });
});
