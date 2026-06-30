import { describe, expect, it } from "vitest";
import {
  buildSplitPlaceholderRow,
  buildSplitSourceRecordId,
  buildUpdatedStaffAfterSplit,
  canSplitStaffRole,
  inferRoleKeyFromLabel,
  pairStaffRoles,
  removeStaffRolePair,
  roleLabelSlotIndex,
} from "@/lib/staffRoleSplit";
import { REQUIRED_STAFF_RAW } from "@/lib/tripRequiredRoles";

describe("staffRoleSplit", () => {
  it("infers role keys from numbered labels", () => {
    expect(inferRoleKeyFromLabel("צוות בוגר 3")).toBe("adult_staff");
    expect(inferRoleKeyFromLabel("אחראי טיול")).toBe("trip_leader");
  });

  it("detects when split is allowed", () => {
    expect(canSplitStaffRole(["אחראי טיול", "מלווה אוטובוס"])).toBe(true);
    expect(canSplitStaffRole(["אחראי טיול"])).toBe(false);
  });

  it("removes a role pair by label", () => {
    const pairs = pairStaffRoles(["trip_leader", "bus_escort"], ["אחראי טיול", "מלווה אוטובוס"]);
    const result = removeStaffRolePair(pairs, "מלווה אוטובוס");
    expect(result?.removed.roleKey).toBe("bus_escort");
    expect(result?.remaining).toEqual([{ roleKey: "trip_leader", roleLabel: "אחראי טיול" }]);
  });

  it("reads slot numbers from role labels", () => {
    expect(roleLabelSlotIndex("מלווה אוטובוס 1")).toBe(1);
    expect(roleLabelSlotIndex("מלווה אוטובוס")).toBe(0);
  });

  it("restores required-staff source id from numbered labels", () => {
    expect(buildSplitSourceRecordId("bus_escort", "מלווה אוטובוס 3")).toBe("required-staff:bus_escort:3");
  });

  it("builds placeholder and updated staff rows", () => {
    const placeholder = buildSplitPlaceholderRow({
      tripId: "trip-1",
      roleKey: "adult_staff",
      roleLabel: "צוות בוגר 2",
    });
    expect(placeholder.full_name).toBe("תקן חסר: צוות בוגר 2");
    expect(placeholder.source_record_id).toBe("required-staff:adult_staff:2");
    expect(placeholder.raw_data[REQUIRED_STAFF_RAW.placeholder]).toBe(true);

    const updated = buildUpdatedStaffAfterSplit({
      raw: {
        [REQUIRED_STAFF_RAW.protected]: true,
        [REQUIRED_STAFF_RAW.roleKeys]: ["trip_leader", "adult_staff"],
        [REQUIRED_STAFF_RAW.roleLabels]: ["אחראי טיול", "צוות בוגר 2"],
        staffRole: "אחראי טיול, צוות בוגר 2",
      },
      remaining: [{ roleKey: "trip_leader", roleLabel: "אחראי טיול" }],
    });
    expect(updated.role).toBe("אחראי טיול");
    expect(updated.raw_data[REQUIRED_STAFF_RAW.roleLabels]).toEqual(["אחראי טיול"]);
  });
});
