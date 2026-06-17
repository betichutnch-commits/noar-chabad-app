import { describe, expect, it } from "vitest";
import { seedRowsFromTripDetails } from "@/lib/tripPlan";

describe("seedRowsFromTripDetails", () => {
  it("creates default single row when timeline empty", () => {
    const rows = seedRowsFromTripDetails({});
    expect(rows).toHaveLength(1);
    expect(rows[0].day_index).toBe(1);
    expect(rows[0].order_index).toBe(0);
  });

  it("maps timeline items to seeded rows with incremental days", () => {
    const rows = seedRowsFromTripDetails({
      timeline: [
        { date: "2026-06-10", finalLocation: "ירושלים", finalSubCategory: "יציאה" },
        { date: "2026-06-11", finalLocation: "צפת", finalSubCategory: "לינה" },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].day_index).toBe(1);
    expect(rows[1].day_index).toBe(2);
    expect(rows[0].location_text).toBe("ירושלים");
    expect(rows[0].location_sensitive).toBe(false);
    expect(rows[1].event_text).toBe("לינה");
  });

  it("copies sensitiveLocation from timeline to location_sensitive on seed row", () => {
    const rows = seedRowsFromTripDetails({
      timeline: [{ date: "2026-06-10", finalLocation: "חברון", finalSubCategory: "יציאה", sensitiveLocation: true }],
    });
    expect(rows[0].location_sensitive).toBe(true);
    expect(rows[0].location_text).toBe("חברון");
  });
});
