import { describe, expect, it } from "vitest";
import { computeRowDetailsSummaryCounts, formatRowDetailsSummaryLine } from "@/lib/planRowDetailsSummary";

describe("planRowDetailsSummary", () => {
  it("counts responsibilities, purchase, equipment and guidelines", () => {
    const counts = computeRowDetailsSummaryCounts({
      tasks: [
        { phase: "during", task_text: "א", assignee_name: null },
        { phase: "preparation", task_text: "ב", assignee_name: null },
        { phase: "after", task_text: "", assignee_name: null },
      ],
      equipment: [
        { item: "כיסא", source_type: "קיים" },
        { item: "דגל", source_type: "רכש" },
        { item: "שולחן", source_type: "מקור" },
      ],
      staff_instructions: "הנחיה",
      participant_instructions: "",
    });
    expect(counts).toEqual({
      responsibilities: 2,
      purchase: 1,
      equipment: 2,
      designs: 0,
      prints: 0,
      guidelines: 1,
    });
    expect(formatRowDetailsSummaryLine(counts)).toBe("2 אחריות · 1 רכש · 2 ציוד · 1 הנחיות");

    const withPrints = computeRowDetailsSummaryCounts({
      prints: [{ id: "p1" }, { id: "p2" }],
    });
    expect(formatRowDetailsSummaryLine(withPrints)).toBe("2 הדפסות");

    const withDesigns = computeRowDetailsSummaryCounts({
      designs: [{ id: "d1" }],
      prints: [{ id: "p1" }],
    });
    expect(formatRowDetailsSummaryLine(withDesigns)).toBe("1 עיצובים · 1 הדפסות");
  });

  it("returns null when all counts are zero", () => {
    expect(formatRowDetailsSummaryLine(computeRowDetailsSummaryCounts({}))).toBeNull();
  });
});
