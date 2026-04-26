import { describe, expect, it } from "vitest";
import { isOpenMessageStatus, normalizeMessageStatus, parseMessageContent } from "@/lib/inbox";

describe("inbox helpers", () => {
  it("parses text and screenshot path", () => {
    const parsed = parseMessageContent("hello\n[צורף צילום מסך]:trip-files/a.png");
    expect(parsed.text).toContain("hello");
    expect(parsed.imagePath).toBe("trip-files/a.png");
  });

  it("normalizes pending status to new", () => {
    expect(normalizeMessageStatus("pending")).toBe("new");
  });

  it("detects open status", () => {
    expect(isOpenMessageStatus("new")).toBe(true);
    expect(isOpenMessageStatus("treated")).toBe(false);
  });
});
