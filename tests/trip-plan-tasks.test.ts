import { describe, expect, it } from "vitest";
import { buildTripPlanTasks, TRIP_TASK_SAFETY_OWNER } from "@/lib/tripPlanTasks";

describe("buildTripPlanTasks", () => {
  it("creates moked teva task once per trip when any row needs coordination", () => {
    const tasks = buildTripPlanTasks({
      planRows: [{ id: "row-1", eventText: "קיאקים/רפטינג", locationSensitive: false }],
      documentOverrides: [],
    });
    expect(tasks).toHaveLength(2);
    const moked = tasks.find((task) => task.id === "moked-teva-coordination");
    expect(moked?.owner).toBe(TRIP_TASK_SAFETY_OWNER);
    expect(moked?.coordinatorCanUpload).toBe(true);
    expect(moked?.documentKey).toBe("moked-teva-approval");
  });

  it("creates business license task with per-row targets", () => {
    const tasks = buildTripPlanTasks({
      planRows: [
        { id: "row-1", eventText: "שייט", scheduleLabel: "יום א · שייט", locationText: "מרינה" },
        { id: "row-2", eventText: "מוזיאון" },
      ],
      documentOverrides: [],
    });
    const license = tasks.find((task) => task.id === "business-license-insurance");
    expect(license?.coordinatorCanUpload).toBe(true);
    expect(license?.owner).toBe("רכז הטיול");
    expect(license?.licenseTargets).toHaveLength(1);
    expect(license?.licenseTargets?.[0]?.planRowId).toBe("row-1");
    expect(license?.licenseTargets?.[0]?.businessName).toBe("מרינה");
  });

  it("returns empty list for trips without regulatory triggers", () => {
    const tasks = buildTripPlanTasks({
      planRows: [{ id: "row-1", eventText: "מוזיאון" }],
      documentOverrides: [],
    });
    expect(tasks).toHaveLength(0);
  });
});
