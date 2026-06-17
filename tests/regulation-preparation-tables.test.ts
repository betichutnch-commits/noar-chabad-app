import { describe, expect, it } from "vitest";
import {
  allActivityPreparationTables,
  chapterBPreparationTables,
  chapterCPreparationTables,
  findPreparationTablesForTripContext,
  getPreparationTableBySectionId,
} from "@/lib/regulation";

describe("activity preparation tables", () => {
  it("loads chapter B and C tables from PDF extraction", () => {
    expect(chapterBPreparationTables.length).toBeGreaterThanOrEqual(18);
    expect(chapterCPreparationTables.length).toBeGreaterThanOrEqual(18);
    expect(allActivityPreparationTables.length).toBe(
      chapterBPreparationTables.length + chapterCPreparationTables.length,
    );
  });

  it("resolves ropes park table by section id", () => {
    const table = getPreparationTableBySectionId("b.3.3");
    expect(table?.title).toContain("חבלים");
    expect(table?.items.length).toBeGreaterThan(5);
  });

  it("resolves inflatables table by section id", () => {
    const table = getPreparationTableBySectionId("b.17.1");
    expect(table?.title).toContain("מתנפחים");
    expect(table?.items.length).toBe(12);
    expect(table?.supplementPdfPath).toContain("inflatables-guidance");
  });

  it("finds water park table by schedule label", () => {
    const tables = findPreparationTablesForTripContext({
      planSubCategoryLabels: ["פארק מים"],
      activityKeys: ["attraction_water"],
    });
    expect(tables.some((t) => t.circularSectionId === "g.5.1")).toBe(true);
  });
});
