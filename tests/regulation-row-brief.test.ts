import { describe, expect, it } from "vitest";
import {
  evaluateRowRegulationBrief,
  gradeRangeToApproxAges,
  shouldShowRowRegulationBrief,
} from "@/lib/regulation";

describe("gradeRangeToApproxAges", () => {
  it("maps grade range to approximate ages", () => {
    expect(gradeRangeToApproxAges("ד׳", "ו׳")).toEqual({ minAge: 9, maxAge: 11 });
  });
});

describe("shouldShowRowRegulationBrief", () => {
  it("shows for outdoor trip with attraction", () => {
    expect(shouldShowRowRegulationBrief("טיול מחוץ לסניף", "attraction", "פארק מים")).toBe(true);
  });

  it("hides for branch-only settlement row", () => {
    expect(
      shouldShowRowRegulationBrief("טיול מחוץ לסניף", "settlement", "פעילות בסניף", "branch"),
    ).toBe(false);
  });

  it("shows for licensed attraction even at branch location", () => {
    expect(
      shouldShowRowRegulationBrief("טיול מחוץ לסניף", "attraction", "בריכה", "branch"),
    ).toBe(true);
  });
});

describe("evaluateRowRegulationBrief", () => {
  it("computes medic count for water park with ratio", () => {
    const brief = evaluateRowRegulationBrief({
      planCategoryKey: "attraction",
      planSubCategoryLabel: "פארק מים",
      participantCount: 40,
      gradeFrom: "ד׳",
      gradeTo: "ו׳",
    });
    expect(brief.circularSectionId).toBeTruthy();
    expect(brief.needsLicense).toBe(true);
    expect(brief.medicRequired).toBe(true);
    expect(brief.medicCount).toBeGreaterThanOrEqual(1);
    expect(brief.circularLinks).toHaveLength(1);
    expect(brief.circularLinks[0]?.external).toBe(true);
    expect(brief.ageEligible).toBe(true);
    expect(brief.ageMessage).toBeNull();
  });

  it("uses short medic summary for pool", () => {
    const brief = evaluateRowRegulationBrief({
      planCategoryKey: "attraction",
      planSubCategoryLabel: "בריכה",
      participantCount: 30,
      gradeFrom: "ד׳",
      gradeTo: "ו׳",
    });
    expect(brief.medicSummary).toBe("1 חובש");
    expect(brief.adultStaffRequired).toBe(true);
    expect(brief.adultStaffCount).toBeGreaterThanOrEqual(1);
    expect(brief.circularLinks[0]?.label).toBe('קישור לחוזר מנכ"ל');
    expect(brief.circularLinks[0]?.href).toMatch(/horaa\.aspx\?siduri=585#_Toc/);
  });

  it("resolves mankal TOC anchor for pool prep table", () => {
    const poolBrief = evaluateRowRegulationBrief({
      planCategoryKey: "attraction",
      planSubCategoryLabel: "בריכה",
      participantCount: 10,
    });
    const href = poolBrief.circularLinks[0]?.href ?? "";
    expect(href).toBe(
      "https://apps.education.gov.il/Mankal/horaa.aspx?siduri=585#_Toc256000760",
    );
  });

  it("flags ineligible ages with blocking message only", () => {
    const brief = evaluateRowRegulationBrief({
      planCategoryKey: "attraction",
      planSubCategoryLabel: "פיינטבול",
      participantCount: 20,
      gradeFrom: "א׳",
      gradeTo: "ב׳",
    });
    expect(brief.ageEligible).toBe(false);
    expect(brief.ageMessage).toMatch(/אינה אפשרית/);
  });

  it("flags sensitive location coordination", () => {
    const brief = evaluateRowRegulationBrief({
      planCategoryKey: "hiking",
      planSubCategoryLabel: "מסלול יום",
      participantCount: 20,
      sensitiveLocation: true,
    });
    expect(brief.sensitiveLocation).toBe(true);
    expect(brief.needsMokedTeva).toBe(true);
    expect(brief.coordinationLeadDays).toBeGreaterThanOrEqual(14);
  });

  it("museum has lighter license requirements", () => {
    const brief = evaluateRowRegulationBrief({
      planCategoryKey: "attraction",
      planSubCategoryLabel: "מוזיאון",
      participantCount: 30,
      gradeFrom: "ז׳",
      gradeTo: "ט׳",
    });
    expect(brief.needsLicense).toBe(false);
  });
});
