import { describe, expect, it } from "vitest";
import { profileSchema } from "@/lib/schemas";

describe("profileSchema", () => {
  it("accepts number-ish optional fields as string/number", () => {
    const result = profileSchema.safeParse({
      officialName: "ישראל",
      lastName: "כהן",
      idNumber: "123456789",
      phone: "0501234567",
      email: "test@example.com",
      birthDate: "2000-01-01",
      startYear: 2020,
      studentCount: "120",
      staffCount: 8,
    });

    expect(result.success).toBe(true);
  });
});
