import { describe, expect, it, vi } from "vitest";
import {
  normalizeDepartmentKey,
  resolveRecipientUserIds,
} from "@/lib/notifications/recipients";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("resolveRecipientUserIds", () => {
  it("dedupes user_ids", async () => {
    const ids = await resolveRecipientUserIds({} as SupabaseClient, {
      mode: "user_ids",
      userIds: ["a", "a", "", "b"],
    });
    expect(ids).toEqual(["a", "b"]);
  });

  it("returns safety_admin and admin profile ids", async () => {
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({
          data: [{ id: "s1" }, { id: "a1" }],
          error: null,
        }),
      })),
    }));
    const admin = { from } as unknown as SupabaseClient;
    const ids = await resolveRecipientUserIds(admin, { mode: "safety_admins" });
    expect(ids).toEqual(["s1", "a1"]);
  });

  it("matches dept_trips_officer by normalized department with fallback", async () => {
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: [
            { id: "o1", department: "תמים" },
            { id: "o2", department: "בת מלך" },
          ],
          error: null,
        }),
      })),
    }));
    const admin = { from } as unknown as SupabaseClient;

    const direct = await resolveRecipientUserIds(admin, {
      mode: "dept_trips_officers",
      department: "תמים",
      orFallbackSafetyAdmins: false,
    });
    expect(direct).toEqual(["o1"]);

    const fallbackAdmin = {
      from: vi.fn(() => ({
        select: vi.fn((cols: string) => {
          if (cols.includes("department")) {
            return {
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
          return {
            in: vi.fn().mockResolvedValue({
              data: [{ id: "safe1" }],
              error: null,
            }),
          };
        }),
      })),
    } as unknown as SupabaseClient;

    const withFallback = await resolveRecipientUserIds(fallbackAdmin, {
      mode: "dept_trips_officers",
      department: "תמים",
      orFallbackSafetyAdmins: true,
    });
    expect(withFallback).toEqual(["safe1"]);
  });
});

describe("normalizeDepartmentKey", () => {
  it("trims and normalizes quotes and spaces", () => {
    expect(normalizeDepartmentKey('  תמים״  x  ')).toBe("תמים\" x");
  });
});
