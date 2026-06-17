import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseServer", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  notifyUsers: vi.fn().mockResolvedValue(undefined),
  notifyUserIds: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabaseService", () => ({
  createSupabaseServiceRoleClient: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/auth", () => ({
  isManagerUser: vi.fn(),
  isTechAdminUser: vi.fn(),
  isDeptTripsOfficer: vi.fn(),
  isDeptReviewOfficer: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";
import { isManagerUser, isTechAdminUser } from "@/lib/auth";
import { POST as contactPost } from "@/app/api/contact-messages/route";
import { POST as tripSavePost } from "@/app/api/trips/save/route";
import { POST as tripCancelPost } from "@/app/api/trips/[id]/cancel/route";
import { DELETE as tripDelete } from "@/app/api/trips/[id]/route";
import { POST as tripStatusPost } from "@/app/api/trips/[id]/status/route";
import { POST as treatedPost } from "@/app/api/contact-messages/[id]/treated/route";
import { POST as deptReviewPost } from "@/app/api/trips/[id]/dept-review/route";
import { PATCH as notifReadPatch } from "@/app/api/notifications/[id]/read/route";
import { POST as notifMarkAll } from "@/app/api/notifications/mark-all-read/route";
import { POST as tripAssignPost } from "@/app/api/trips/[id]/assign/route";
import { isDeptReviewOfficer } from "@/lib/auth";

const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
const createSupabaseServiceRoleClientMock = vi.mocked(createSupabaseServiceRoleClient);
const isManagerUserMock = vi.mocked(isManagerUser);
const isTechAdminUserMock = vi.mocked(isTechAdminUser);
const isDeptReviewOfficerMock = vi.mocked(isDeptReviewOfficer);

describe("API route authorization guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTechAdminUserMock.mockReturnValue(false);
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
    isManagerUserMock.mockReturnValue(false);

    const insertSingle = vi.fn().mockResolvedValue({ data: { id: "trip-1" }, error: null });
    const insertSelect = vi.fn(() => ({ single: insertSingle }));
    const tripsFrom = {
      insert: vi.fn(() => ({ select: insertSelect })),
    };

    const profilesSingle = vi
      .fn()
      .mockResolvedValue({ data: { role: "coordinator", department: "מחלקה" } });
    const profilesEq = vi.fn(() => ({ single: profilesSingle }));
    const profilesFrom = { select: vi.fn(() => ({ eq: profilesEq })) };

    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1", user_metadata: {} } } }),
      },
      from: vi.fn((table: string) => {
        if (table === "trips") return tripsFrom;
        if (table === "profiles") return profilesFrom;
        return {};
      }),
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
    isTechAdminUserMock.mockReturnValue(true);

    const profilesSingle = vi.fn().mockResolvedValue({ data: { role: "admin" } });
    const profilesEq = vi.fn(() => ({ single: profilesSingle }));
    const profilesFrom = { select: vi.fn(() => ({ eq: profilesEq })) };

    const treatedEq = vi.fn().mockResolvedValue({ error: null });
    const messageSingle = vi.fn().mockResolvedValue({ data: { id: "msg-1", category: "bug" }, error: null });
    const messageEq = vi.fn(() => ({ single: messageSingle }));
    const messagesFrom = {
      select: vi.fn(() => ({ eq: messageEq })),
      update: vi.fn(() => ({ eq: treatedEq })),
    };

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

  it("blocks dept-review action for user without dept-review capability", async () => {
    isDeptReviewOfficerMock.mockReturnValue(false);

    const profilesSingle = vi.fn().mockResolvedValue({ data: { role: "dept_staff", department: "תמים" } });
    const profilesEq = vi.fn(() => ({ single: profilesSingle }));
    const profilesFrom = { select: vi.fn(() => ({ eq: profilesEq })) };

    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u-1", user_metadata: {} } } }) },
      from: vi.fn((table: string) => (table === "profiles" ? profilesFrom : {})),
    } as never);

    const req = new Request("http://localhost/api/trips/t1/dept-review", {
      method: "POST",
      body: JSON.stringify({ action: "forward", notes: "ok" }),
    });
    const res = await deptReviewPost(req, { params: Promise.resolve({ id: "t1" }) as Promise<unknown> });
    expect(res.status).toBe(403);
  });

  it("marks notification as read only for owner", async () => {
    const updateMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "n-1" }, error: null });
    const updateEqUser = vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: updateMaybeSingle })) }));
    const updateEqId = vi.fn(() => ({ eq: updateEqUser }));
    const notificationsFrom = { update: vi.fn(() => ({ eq: updateEqId })) };

    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn((table: string) => (table === "notifications" ? notificationsFrom : {})),
    } as never);

    const res = await notifReadPatch(new Request("http://localhost/api/notifications/n-1/read", { method: "PATCH" }), {
      params: Promise.resolve({ id: "n-1" }),
    });
    expect(res.status).toBe(200);
  });

  it("marks all notifications as read for user", async () => {
    const updateEqIsRead = vi.fn().mockResolvedValue({ error: null });
    const updateEqUser = vi.fn(() => ({ eq: updateEqIsRead }));
    const notificationsFrom = { update: vi.fn(() => ({ eq: updateEqUser })) };

    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn((table: string) => (table === "notifications" ? notificationsFrom : {})),
    } as never);

    const res = await notifMarkAll();
    expect(res.status).toBe(200);
  });

  it("assigns trip to safety member", async () => {
    isManagerUserMock.mockReturnValue(true);

    const actorProfileSingle = vi.fn().mockResolvedValue({ data: { id: "manager-1", role: "admin", full_name: "Manager" } });
    const actorProfileEq = vi.fn(() => ({ single: actorProfileSingle }));

    const tripSingle = vi.fn().mockResolvedValue({
      data: { id: "trip-1", name: "Trip", status: "pending", safety_assignee_id: null },
      error: null,
    });
    const tripEq = vi.fn(() => ({ single: tripSingle }));
    const tripFrom = {
      select: vi.fn(() => ({ eq: tripEq })),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    };

    const assigneeSingle = vi.fn().mockResolvedValue({
      data: { id: "safety-1", role: "safety_admin", full_name: "Safety One" },
      error: null,
    });
    const assigneeEq = vi.fn(() => ({ single: assigneeSingle }));
    const assignmentEventsFrom = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "manager-1", user_metadata: {} } } }) },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          const selectFn = vi.fn()
            .mockReturnValueOnce({ eq: actorProfileEq });
          return { select: selectFn };
        }
        return {};
      }),
    } as never);

    createSupabaseServiceRoleClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "trips") return tripFrom;
        if (table === "trip_assignment_events") return assignmentEventsFrom;
        if (table === "profiles") {
          const selectFn = vi.fn()
            .mockReturnValueOnce({ eq: assigneeEq });
          return { select: selectFn };
        }
        return {};
      }),
    } as never);

    const req = new Request("http://localhost/api/trips/trip-1/assign", {
      method: "POST",
      body: JSON.stringify({ assignee_id: "safety-1" }),
    });
    const res = await tripAssignPost(req, { params: Promise.resolve({ id: "trip-1" }) });
    expect(res.status).toBe(200);
  });
});
