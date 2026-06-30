import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMotifsForPlanRow,
  getMotifsForPurchaseContext,
  getMotifsForTimelineRow,
  getMotifsForTrip,
  getMotifsForSuppliersContext,
  tripHasSustainabilityScope,
} from "@/lib/sustainability";

describe("sustainability motifs derive", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/sustainability/flags");
  });

  it("returns reduce-consumption for food timeline row", () => {
    const motifs = getMotifsForTimelineRow("food", "קייטרינג");
    expect(motifs.some((motif) => motif.id === "reduce-consumption")).toBe(true);
    expect(motifs.some((motif) => motif.id === "reuse")).toBe(true);
  });

  it("returns ecological-footprint for transport timeline row", () => {
    const motifs = getMotifsForTimelineRow("transport", "נסיעה מאורגנת");
    expect(motifs.some((motif) => motif.id === "ecological-footprint")).toBe(true);
  });

  it("returns field-environment for hiking timeline row", () => {
    const motifs = getMotifsForTimelineRow("hiking", "מסלול יום");
    expect(motifs.some((motif) => motif.id === "field-environment")).toBe(true);
  });

  it("returns purchase motifs when trip has scoped activities", () => {
    const motifs = getMotifsForPurchaseContext([{ category: "food", subCategory: "אוכל קנוי" }]);
    expect(motifs.some((motif) => motif.id === "reduce-consumption")).toBe(true);
    expect(motifs.some((motif) => motif.id === "reuse")).toBe(true);
    expect(motifs.some((motif) => motif.id === "recycling-waste")).toBe(true);
  });

  it("returns no trip motifs when there are no timeline rows", () => {
    const motifs = getMotifsForTrip([], []);
    expect(motifs).toEqual([]);
    expect(tripHasSustainabilityScope([])).toBe(false);
  });

  it("resolves plan row motifs from event text", () => {
    const motifs = getMotifsForPlanRow("מסלול יום", [{ eventText: "מסלול יום" }]);
    expect(motifs.some((motif) => motif.id === "field-environment")).toBe(true);
  });

  it("returns local suppliers motif for suppliers context", () => {
    const motifs = getMotifsForSuppliersContext();
    expect(motifs.some((motif) => motif.id === "local-suppliers")).toBe(true);
    expect(motifs[0]?.title).toMatch(/מקומי/);
  });

  it("returns empty arrays when motifs are disabled", async () => {
    vi.doMock("@/lib/sustainability/flags", () => ({
      SUSTAINABILITY_MOTIFS_ENABLED: false,
      isSustainabilityMotifsEnabled: () => false,
    }));
    const disabled = await import("@/lib/sustainability/derive");
    expect(disabled.getMotifsForTimelineRow("food", "קייטרינג")).toEqual([]);
    expect(disabled.getMotifsForSuppliersContext()).toEqual([]);
    expect(disabled.getMotifsForTrip([{ category: "food", subCategory: "קייטרינג" }], [])).toEqual([]);
  });
});
