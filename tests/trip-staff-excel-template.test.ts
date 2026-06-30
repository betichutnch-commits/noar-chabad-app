import { describe, expect, it } from "vitest";
import { buildStaffExcelTemplateRows } from "@/lib/tripStaffExcelTemplate";
import type { RequiredStaffPlanRow } from "@/lib/tripRequiredRoles";

const busEscortRows: RequiredStaffPlanRow[] = [
  {
    role_key: "trip_leader",
    role_label: "אחראי טיול",
    source_summary: "תמיד",
    required_quantity: 1,
    approved_quantity: 1,
    merge_policy: "mergeable",
    status: "approved",
    order_index: 0,
  },
  {
    role_key: "bus_escort",
    role_label: "מלווה אוטובוס",
    source_summary: "הסעה מאורגנת",
    required_quantity: 2,
    approved_quantity: 2,
    merge_policy: "mergeable",
    status: "approved",
    order_index: 10,
  },
];

describe("buildStaffExcelTemplateRows", () => {
  it("creates one row per required staff slot", () => {
    const rows = buildStaffExcelTemplateRows(
      {
        coordName: "ישראל ישראלי",
        coordPhone: "0501111111",
        coordEmail: "coord@example.com",
      },
      busEscortRows,
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]["תפקיד"]).toBe("אחראי טיול");
    expect(rows[0]["שם פרטי"]).toBe("ישראל");
    expect(rows[1]["תפקיד"]).toBe("מלווה אוטובוס 1");
    expect(rows[2]["תפקיד"]).toBe("מלווה אוטובוס 2");
    expect(rows[1]["שם פרטי"]).toBe("");
  });

  it("prefers existing staffed participants over empty slots", () => {
    const rows = buildStaffExcelTemplateRows(
      { coordName: "ישראל ישראלי" },
      busEscortRows,
      [
        {
          id: "staff-1",
          full_name: "ישראל ישראלי",
          phone: "0501111111",
          role: "אחראי טיול",
          raw_data: {
            staffRole: "אחראי טיול",
            firstName: "ישראל",
            lastName: "ישראלי",
          },
        },
        {
          id: "staff-2",
          full_name: "דוד לוי",
          phone: "0502222222",
          role: "מלווה אוטובוס 1",
          raw_data: {
            staffRole: "מלווה אוטובוס 1",
            firstName: "דוד",
            lastName: "לוי",
            personalPhone: "0502222222",
          },
        },
      ],
    );
    expect(rows[1]["שם פרטי"]).toBe("דוד");
    expect(rows[1]["טלפון אישי"]).toBe("0502222222");
    expect(rows[2]["שם פרטי"]).toBe("");
  });
});
