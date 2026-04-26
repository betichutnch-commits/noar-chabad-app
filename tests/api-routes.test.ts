import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseServer", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  isManagerUser: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { isManagerUser } from "@/lib/auth";
import { POST as contactPost } from "@/app/api/contact-messages/route";
import { POST as tripSavePost } from "@/app/api/trips/save/route";
import { POST as tripCancelPost } from "@/app/api/trips/[id]/cancel/route";
import { DELETE as tripDelete } from "@/app/api/trips/[id]/route";
import { POST as tripStatusPost } from "@/app/api/trips/[id]/status/route";
import { POST as treatedPost } from "@/app/api/contact-messages/[id]/treated/route";

const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
const isManagerUserMock = vi.mocked(isManagerUser);

describe("API route authorization guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects contact message creation for unauthenticated user", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as never);

    const req = new Request("http://localhost/api/contact-messages", {
      method: "POST",
      body: JSON.stringify({ subject: "abc", message: "long enough text", category: "general" }),
    });
    const res = await contactPost(req);

    expect(res.status).toBe(401);
  });

  it("creates trip via /api/trips/save for authenticated owner", async () => {
    const insertSingle = vi.fn().mockResolvedValue({ data: { id: "trip-1" }, error: null });
    const insertSelect = vi.fn(() => ({ single: insertSingle }));
    const tripsFrom = {
      insert: vi.fn(() => ({ select: insertSelect })),
    };

    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn((table: string) => (table === "trips" ? tripsFrom : {})),
    } as never);

    const req = new Request("http://localhost/api/trips/save", {
      method: "POST",
      body: JSON.stringify({
        status: "draft",
        tripData: {
          coordinator_name: "coord",
          name: "trip",
          start_date: "2026-01-01",
          details: {},
        },
      }),
    });

    const res = await tripSavePost(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.id).toBe("trip-1");
  });

  it("blocks cancel when trip is not owned by requester", async () => {
    const tripsSelectSingle = vi.fn().mockResolvedValue({
      data: { id: "trip-1", user_id: "other-user", details: {} },
      error: null,
    });
    const tripsSelectEq = vi.fn(() => ({ single: tripsSelectSingle }));
    const tripsFrom = {
      select: vi.fn(() => ({ eq: tripsSelectEq })),
      update: vi.fn(),
    };

    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn((table: string) => (table === "trips" ? tripsFrom : {})),
    } as never);

    const req = new Request("http://localhost/api/trips/trip-1/cancel", {
      method: "POST",
      body: JSON.stringify({ reason: "valid cancel reason" }),
    });
    const res = await tripCancelPost(req, { params: Promise.resolve({ id: "trip-1" }) });

    expect(res.status).toBe(403);
  });

  it("blocks delete when trip is not draft", async () => {
    const tripsSelectSingle = vi.fn().mockResolvedValue({
      data: { id: "trip-1", user_id: "user-1", status: "pending" },
      error: null,
    });
    const tripsSelectEq = vi.fn(() => ({ single: tripsSelectSingle }));
    const tripsFrom = {
      select: vi.fn(() => ({ eq: tripsSelectEq })),
      delete: vi.fn(),
    };

    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn((table: string) => (table === "trips" ? tripsFrom : {})),
    } as never);

    const res = await tripDelete(new Request("http://localhost/api/trips/trip-1"), {
      params: Promise.resolve({ id: "trip-1" }),
    });

    expect(res.status).toBe(403);
  });

  it("blocks manager status update for non-manager actor", async () => {
    isManagerUserMock.mockReturnValue(false);

    const profilesSingle = vi.fn().mockResolvedValue({ data: { role: "user" } });
    const profilesEq = vi.fn(() => ({ single: profilesSingle }));
    const profilesFrom = { select: vi.fn(() => ({ eq: profilesEq })) };

    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", user_metadata: {} } } }) },
      from: vi.fn((table: string) => (table === "profiles" ? profilesFrom : {})),
    } as never);

    const req = new Request("http://localhost/api/trips/trip-1/status", {
      method: "POST",
      body: JSON.stringify({ status: "approved" }),
    });
    const res = await tripStatusPost(req, { params: Promise.resolve({ id: "trip-1" }) });

    expect(res.status).toBe(403);
  });

  it("allows marking contact as treated only for manager", async () => {
    isManagerUserMock.mockReturnValue(true);

    const profilesSingle = vi.fn().mockResolvedValue({ data: { role: "admin" } });
    const profilesEq = vi.fn(() => ({ single: profilesSingle }));
    const profilesFrom = { select: vi.fn(() => ({ eq: profilesEq })) };

    const treatedEq = vi.fn().mockResolvedValue({ error: null });
    const messagesFrom = { update: vi.fn(() => ({ eq: treatedEq })) };

    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "manager-1", user_metadata: {} } } }) },
      from: vi.fn((table: string) => {
        if (table === "profiles") return profilesFrom;
        if (table === "contact_messages") return messagesFrom;
        return {};
      }),
    } as never);

    const res = await treatedPost(new Request("http://localhost/api/contact-messages/msg-1/treated", { method: "POST" }), {
      params: Promise.resolve({ id: "msg-1" }),
    });
    expect(res.status).toBe(200);
  });
});
