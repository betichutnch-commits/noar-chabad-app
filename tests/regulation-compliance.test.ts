import { describe, expect, it } from "vitest";
import {
  evaluateTripCompliance,
  getRowRegulationHints,
  getOccurrenceRegulationHints,
  tripNeedsMokedTevaCoordination,
  tripNeedsBusinessLicense,
  findLicensedScheduleRow,
} from "@/lib/regulation/compliance";

describe("evaluateTripCompliance", () => {
  it("flags water activity medical requirement when medic not assigned", () => {
    const result = evaluateTripCompliance({
      planRows: [{ category: "attraction", finalSubCategory: "פארק מים" }],
      documents: [],
      staffRoles: [{ roleKey: "medic", assigned: false }],
    });
    expect(result.items.some((i) => i.id === "water_medic_escort" && i.status === "missing")).toBe(true);
    expect(result.summary.mandatoryOpen).toBeGreaterThan(0);
  });

  it("marks document met when status is ready", () => {
    const result = evaluateTripCompliance({
      planRows: [{ category: "hiking", finalSubCategory: "מסלול יום" }],
      documents: [{ key: "risk-management", status: "מוכן PDF" }],
      staffRoles: [],
    });
    const riskItem = result.items.find((i) => i.id === "risk_assessment" || i.linkedDocumentKey === "risk-management");
    expect(riskItem?.status).toBe("met");
  });

  it("includes moked teva coordination for licensed attraction", () => {
    const result = evaluateTripCompliance({
      planRows: [{ category: "attraction", finalSubCategory: "פארק מים" }],
      documents: [],
      staffRoles: [],
    });
    expect(result.items.some((i) => i.category === "coordination" && i.status === "missing")).toBe(true);
  });

  it("includes insurance declaration item", () => {
    const result = evaluateTripCompliance({
      planRows: [],
      documents: [],
      staffRoles: [],
    });
    expect(result.items.some((i) => i.id === "insurance_declaration")).toBe(true);
  });

  it("does not apply sensitive area rule without trip flag", () => {
    const result = evaluateTripCompliance({
      planRows: [{ category: "hiking", finalSubCategory: "מסלול יום" }],
      documents: [],
      staffRoles: [],
      tripDetails: { sensitiveArea: false },
    });
    expect(result.items.some((i) => i.id === "coord_coord_sensitive_area")).toBe(false);
  });

  it("includes inflatables preparation rows for מתנפחים", () => {
    const result = evaluateTripCompliance({
      planRows: [{ category: "attraction", finalSubCategory: "מתקנים מתנפחים" }],
      documents: [],
      staffRoles: [],
    });
    expect(result.items.some((i) => i.id.startsWith("activity_prep_b_17_1_"))).toBe(true);
    expect(result.items.some((i) => i.title.includes("מתנפחים"))).toBe(true);
  });

  it("includes chapter B preparation checklist rows for ropes park", () => {
    const result = evaluateTripCompliance({
      planRows: [{ category: "attraction", finalSubCategory: "פארק חבלים" }],
      documents: [],
      staffRoles: [],
    });
    expect(result.items.some((i) => i.id.startsWith("activity_prep_b_3_3_"))).toBe(true);
    expect(result.items.some((i) => i.title.includes("מתחם חבלים"))).toBe(true);
  });

  it("applies sensitive area rule when flagged in trip details", () => {
    const result = evaluateTripCompliance({
      planRows: [{ category: "hiking", finalSubCategory: "מסלול יום" }],
      documents: [],
      staffRoles: [],
      tripDetails: { sensitiveArea: true },
    });
    expect(result.items.some((i) => i.id === "coord_coord_sensitive_area")).toBe(true);
  });

  it("applies sensitive area rule from timeline row flag", () => {
    const result = evaluateTripCompliance({
      planRows: [{ category: "hiking", finalSubCategory: "מסלול יום" }],
      documents: [],
      staffRoles: [],
      tripDetails: {
        timeline: [{ sensitiveLocation: true, finalLocation: "תל אביב" }],
      },
    });
    expect(result.items.some((i) => i.id === "coord_coord_sensitive_area")).toBe(true);
  });

  it("applies sensitive area rule from plan row location_sensitive", () => {
    const result = evaluateTripCompliance({
      planRows: [{ category: "food", finalSubCategory: "אוכל קנוי" }],
      documents: [],
      staffRoles: [],
      planRowsWithLocation: [{ location_text: "חברון", location_sensitive: true }],
    });
    expect(result.items.some((i) => i.id === "coord_coord_sensitive_area")).toBe(true);
  });
});

describe("getRowRegulationHints", () => {
  it("flags water park for license and coordination", () => {
    const hints = getRowRegulationHints("attraction", "פארק מים");
    expect(hints.needsLicense).toBe(true);
    expect(hints.needsMokedTeva).toBe(true);
    expect(hints.circularSectionId).toBe("g.5");
  });

  it("flags sailing for license via schedule map", () => {
    const hints = getRowRegulationHints("attraction", "שייט");
    expect(hints.needsLicense).toBe(true);
    expect(hints.needsMokedTeva).toBe(true);
  });

  it("does not flag museum for license", () => {
    const hints = getRowRegulationHints("attraction", "מוזיאון");
    expect(hints.needsLicense).toBe(false);
  });
});

describe("occurrence and trip regulation helpers", () => {
  it("getOccurrenceRegulationHints exposes license and insurance", () => {
    const hints = getOccurrenceRegulationHints("פארק מים");
    expect(hints.needsLicense).toBe(true);
    expect(hints.needsInsurance).toBe(true);
    expect(hints.licenseLabel).toBe("נדרש רישוי");
    expect(hints.insuranceLabel).toBe("נדרש ביטוח");
  });

  it("tripNeedsMokedTevaCoordination is trip-wide", () => {
    expect(
      tripNeedsMokedTevaCoordination({
        planRows: [{ eventText: "קיאקים/רפטינג", locationSensitive: false }],
      }),
    ).toBe(true);
    expect(
      tripNeedsMokedTevaCoordination({
        planRows: [{ eventText: "מוזיאון", locationSensitive: false }],
      }),
    ).toBe(false);
  });

  it("tripNeedsBusinessLicense when any row needs license", () => {
    expect(tripNeedsBusinessLicense([{ eventText: "שייט" }, { eventText: "מוזיאון" }])).toBe(true);
    expect(tripNeedsBusinessLicense([{ eventText: "מוזיאון" }])).toBe(false);
  });
});

describe("findLicensedScheduleRow", () => {
  it("resolves ג׳יפים with hebrew geresh", () => {
    const row = findLicensedScheduleRow("attraction", "ג׳יפים");
    expect(row?.activityTypeId).toBe("jeeps_atv");
    expect(row?.circularSectionId).toBe("b.6");
  });
});
