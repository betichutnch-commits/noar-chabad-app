import { describe, expect, it } from "vitest";
import { buildMokedTevaTripCopyData } from "@/lib/mokedTevaTripCopyData";

describe("buildMokedTevaTripCopyData", () => {
  it("builds copy fields for moked teva approval", () => {
    const data = buildMokedTevaTripCopyData({
      trip: {
        name: "טיול כיתה ח׳",
        start_date: "2026-03-01",
        coordinator_name: "יוסי כהן",
        details: {
          gradeFrom: "ח׳",
          gradeTo: "ח׳",
          coordName: "יוסי כהן",
          coordId: "123456789",
          coordPhone: "050-0000000",
          coordEmail: "yossi@example.com",
          generalComments: "טיול עם לינה",
        },
      },
      planRows: [
        { day_index: 1, location_text: "נהר הירדן", event_text: "קיאקים/רפטינג" },
        { day_index: 2, location_text: "אכסניה צפון", event_text: "לינת מבנה" },
      ],
      dayLabel: (dayIndex) => `01.03.2026`,
    });

    expect(data.fields.find((field) => field.id === "trip-name")?.value).toBe("טיול כיתה ח׳");
    expect(data.fields.find((field) => field.id === "grade-from")?.value).toBe("ח׳");
    expect(data.scheduleText).toContain("קיאקים/רפטינג");
    expect(data.scheduleText).toContain("מקום לינה: אכסניה צפון");
    expect(data.leaders[0]?.firstName).toBe("יוסי");
    expect(data.allText).toContain("הערות: טיול עם לינה");
  });

  it("includes secondary trip leader when present", () => {
    const data = buildMokedTevaTripCopyData({
      trip: {
        details: {
          coordName: "יוסי כהן",
          secondaryStaffObj: {
            name: "דנה לוי",
            idNumber: "987654321",
            phone: "052-1111111",
            email: "dana@example.com",
            role: "אחראית נוספת",
          },
        },
      },
      planRows: [],
      dayLabel: () => "",
    });

    expect(data.leaders).toHaveLength(2);
    expect(data.fields.some((field) => field.label.includes("אחראית נוספת"))).toBe(true);
  });
});
