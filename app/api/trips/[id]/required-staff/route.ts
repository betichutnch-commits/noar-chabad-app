import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isManagerUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { canEditTripPlan } from "@/lib/tripPlan";
import {
  applyApprovedRequiredStaffPlan,
  calculateRequiredPlanningPreview,
  fetchApprovedRequiredStaffPlan,
  fetchTripAssignmentRules,
  fetchTripRoleRules,
  saveApprovedRequiredStaffPlan,
  type ApprovedAssignmentPlanRow,
  type RequiredStaffPlanRow,
} from "@/lib/tripRequiredRoles";

type RouteContext = { params: Promise<{ id: string }> };
type Body = {
  rows?: RequiredStaffPlanRow[];
  assignmentRows?: ApprovedAssignmentPlanRow[];
};

async function requireTripAccess(tripId: string, options: { managerOnly?: boolean } = {}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false, trip: null, status: 401 as const };

  const { data: profile } = await supabase.from("profiles").select("role, department, is_tech_admin").eq("id", user.id).single();
  const { data: trip } = await supabase.from("trips").select("id, user_id, details").eq("id", tripId).single();
  if (!trip) return { supabase, user: user as User, ok: false, trip: null, status: 404 as const };
  const manager = isManagerUser(user as User, profile || null);
  const ok = options.managerOnly ? manager : manager || canEditTripPlan({ user: user as User, profile: profile || null, tripUserId: String(trip.user_id) });
  if (!ok) return { supabase, user: user as User, ok: false, trip: null, status: 403 as const };
  return { supabase, user: user as User, ok: true, trip: trip as { id: string; details?: Record<string, unknown> | null }, status: 200 as const };
}

async function existingBusCount(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tripId: string) {
  const { count } = await supabase.from("trip_plan_buses").select("id", { count: "exact", head: true }).eq("trip_id", tripId);
  return count || 0;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await requireTripAccess(id);
  if (!access.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!access.ok || !access.trip) return NextResponse.json({ error: access.status === 404 ? "Trip not found" : "Forbidden" }, { status: access.status });

  const [rules, assignmentRules, approvedRows, busCount] = await Promise.all([
    fetchTripRoleRules(access.supabase),
    fetchTripAssignmentRules(access.supabase),
    fetchApprovedRequiredStaffPlan(access.supabase, id),
    existingBusCount(access.supabase, id),
  ]);
  const preview = calculateRequiredPlanningPreview(access.trip.details || {}, rules, assignmentRules, busCount);
  return NextResponse.json({ ok: true, preview, approvedRows });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const access = await requireTripAccess(id, { managerOnly: true });
  if (!access.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!access.ok || !access.trip) return NextResponse.json({ error: access.status === 404 ? "Trip not found" : "Forbidden" }, { status: access.status });

  const body = (await request.json().catch(() => ({}))) as Body;
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const [rules, assignmentRules] = await Promise.all([fetchTripRoleRules(access.supabase), fetchTripAssignmentRules(access.supabase)]);
  const preview = calculateRequiredPlanningPreview(access.trip.details || {}, rules, assignmentRules, await existingBusCount(access.supabase, id));
  const approvedRows = rows.length ? rows : preview.rows;
  const approvedAssignmentRows = Array.isArray(body.assignmentRows) && body.assignmentRows.length ? body.assignmentRows : preview.assignmentRows;

  try {
    await saveApprovedRequiredStaffPlan(access.supabase, id, approvedRows, access.user.id);
    await applyApprovedRequiredStaffPlan(access.supabase, access.trip, approvedRows, preview.context, approvedAssignmentRows);
    return NextResponse.json({ ok: true, rows: approvedRows, assignmentRows: approvedAssignmentRows, context: preview.context });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "שמירת מצבת הצוות נכשלה" }, { status: 500 });
  }
}
