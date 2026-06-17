import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { isPlanningApprovedStatus, mergeCoordinatorPlanningMeta } from "@/lib/coordinatorPlanningMeta";
import { canEditTripPlan } from "@/lib/tripPlan";

type RouteContext = { params: Promise<{ id: string }> };
type Body = { phase?: "approval_modal" | "hub" };

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Body;
  const phase = body.phase === "hub" ? "hub" : "approval_modal";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, department, is_tech_admin")
    .eq("id", user.id)
    .single();

  const { data: trip } = await supabase.from("trips").select("id, user_id, status, details").eq("id", id).single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  if (!canEditTripPlan({ user: user as User, profile: profile || null, tripUserId: String(trip.user_id) })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isPlanningApprovedStatus(trip.status)) {
    return NextResponse.json({ error: "Trip is not in planning-approved status" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const nextDetails = mergeCoordinatorPlanningMeta(trip.details, {
    ...(phase === "approval_modal" ? { approvalModalSeenAt: now } : {}),
    ...(phase === "hub" ? { hubAcknowledgedAt: now } : {}),
  });

  const { error } = await supabase.from("trips").update({ details: nextDetails }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, phase });
}
