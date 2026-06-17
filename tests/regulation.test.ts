import { describe, expect, it } from "vitest";
import {
  PRIMARY_CIRCULAR_SIDURI,
  detectSensitiveLocation,
  tripHasSensitiveActivity,
  mapCircularTermToOrganization,
  resolveRegulationActivityKey,
  collectRegulationContextFromPlanRows,
  getRequirementsForTripContext,
} from "@/lib/regulation";

describe("regulation knowledge base", () => {
  it("uses circular 585 as primary", () => {
    expect(PRIMARY_CIRCULAR_SIDURI).toBe(585);
  });

  it("maps manager in circular to secretary general in org", () => {
    const mapped = mapCircularTermToOrganization("מנהל המסגרת החינוכית");
    expect(mapped?.organizationRole).toContain("מזכירות");
    expect(mapped?.systemKey).toBe("secretary_general");
  });

  it("maps teacher in circular to branch coordinator", () => {
    const mapped = mapCircularTermToOrganization("מורה");
    expect(mapped?.organizationRole).toContain("רכז");
    expect(mapped?.systemKey).toBe("branch_coordinator");
  });

  it("resolves plan category to regulation activity", () => {
    expect(resolveRegulationActivityKey("attraction", "פארק מים")).toBe("attraction_water");
    expect(resolveRegulationActivityKey("sleeping", "לינת שטח")).toBe("sleeping_field");
  });

  it("detects sensitive locations by phrase and settlement", () => {
    expect(detectSensitiveLocation("חברון").sensitive).toBe(true);
    expect(detectSensitiveLocation("ירושלים מזרחית, סיור").sensitive).toBe(true);
    expect(detectSensitiveLocation("איו״ש").sensitive).toBe(true);
    expect(detectSensitiveLocation("תל אביב").sensitive).toBe(false);
    expect(detectSensitiveLocation("ירושלים").sensitive).toBe(false);
  });

  it("tripHasSensitiveActivity from timeline row flag", () => {
    expect(
      tripHasSensitiveActivity({
        tripDetails: {
          timeline: [{ sensitiveLocation: true, finalLocation: "תל אביב" }],
        },
      }),
    ).toBe(true);
    expect(
      tripHasSensitiveActivity({
        tripDetails: { timeline: [{ finalLocation: "חיפה" }] },
      }),
    ).toBe(false);
  });

  it("collects requirements for trip with water activity", () => {
    const ctx = collectRegulationContextFromPlanRows([
      { category: "attraction", finalSubCategory: "פארק מים" },
    ]);
    const reqs = getRequirementsForTripContext(ctx);
    expect(reqs.some((r) => r.id === "water_medic_escort")).toBe(true);
    expect(reqs.some((r) => r.id === "moked_teva_coordination_attractions")).toBe(true);
  });
});
