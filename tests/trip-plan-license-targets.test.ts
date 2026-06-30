import { describe, expect, it } from "vitest";
import {
  assignLicenseFilesToTargets,
  buildTripPlanLicenseTargets,
  formatUploadedFileAssociation,
  resolveBusinessNameForPlanRow,
} from "@/lib/tripPlanLicenseTargets";

describe("tripPlanLicenseTargets", () => {
  it("builds one target per licensed schedule row", () => {
    const targets = buildTripPlanLicenseTargets([
      { id: "row-1", eventText: "קיאקים/רפטינג", scheduleLabel: "יום א · 10:00 · קיאקים/רפטינג", locationText: "נהר הירדן" },
      { id: "row-2", eventText: "מוזיאון", scheduleLabel: "יום ב · מוזיאון" },
    ]);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.planRowId).toBe("row-1");
    expect(targets[0]?.occurrenceLabel).toBe("קיאקים/רפטינג");
    expect(targets[0]?.businessName).toBe("נהר הירדן");
  });

  it("resolves business from location and supplier", () => {
    expect(
      resolveBusinessNameForPlanRow({
        id: "row-1",
        locationText: "פארק המים",
        equipment: [{ source_details: "ספק ציוד", source_type: "רכש" }],
      }),
    ).toBe("פארק המים · ספק ציוד");
  });

  it("assigns uploaded files to matching plan rows", () => {
    const targets = buildTripPlanLicenseTargets([
      { id: "row-1", eventText: "שייט", scheduleLabel: "יום א · שייט" },
      { id: "row-2", eventText: "פארק מים", scheduleLabel: "יום ב · פארק מים" },
    ]);
    const { targets: assigned, unmatchedFiles } = assignLicenseFilesToTargets(targets, [
      {
        url: "trip-files/a.pdf",
        name: "רישיון א",
        type: "application/pdf",
        size: 1,
        uploadedAt: "",
        planRowId: "row-1",
        uploadKind: "license",
      },
      {
        url: "trip-files/b.pdf",
        name: "ביטוח א",
        type: "application/pdf",
        size: 1,
        uploadedAt: "",
        planRowId: "row-1",
        uploadKind: "insurance",
      },
    ]);
    expect(assigned[0]?.licenseFiles).toHaveLength(1);
    expect(assigned[0]?.insuranceFiles).toHaveLength(1);
    expect(assigned[0]?.status).toBe("done");
    expect(assigned[1]?.uploadedFiles).toHaveLength(0);
    expect(unmatchedFiles).toHaveLength(0);
  });

  it("formats file association label", () => {
    expect(
      formatUploadedFileAssociation({
        url: "trip-files/a.pdf",
        name: "רישיון",
        type: "application/pdf",
        size: 1,
        uploadedAt: "",
        scheduleLabel: "יום א · שייט",
        businessName: "מרינה",
        uploadKind: "license",
      }),
    ).toBe("רישוי עסק · יום א · שייט · עסק: מרינה");
  });
});
