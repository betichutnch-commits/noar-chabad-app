import { describe, expect, it } from "vitest";
import { sanitizeInternalReturnUrl } from "@/lib/auth";

describe("sanitizeInternalReturnUrl", () => {
  it("keeps a safe internal path", () => {
    expect(sanitizeInternalReturnUrl("/dashboard/new-trip", "/dashboard")).toBe("/dashboard/new-trip");
  });

  it("rejects absolute external URL", () => {
    expect(sanitizeInternalReturnUrl("https://evil.example", "/dashboard")).toBe("/dashboard");
  });

  it("rejects protocol-relative URL", () => {
    expect(sanitizeInternalReturnUrl("//evil.example", "/dashboard")).toBe("/dashboard");
  });
});
