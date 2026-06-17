import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { canEditTripPlan } from "@/lib/tripPlan";

type RouteContext = { params: Promise<{ id: string }> };
type Body = {
  position?: "start" | "end" | "before" | "after";
  relative_row_id?: string | null;
  day_index?: number | null;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Body;
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
  const { data: trip } = await supabase.from("trips").select("id, user_id").eq("id", id).single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (!canEditTripPlan({ user: user as User, profile: profile || null, tripUserId: String(trip.user_id) })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: plan } = await supabase.from("trip_plans").select("id").eq("trip_id", id).maybeSingle();
  const planId = String(plan?.id || "");
  if (!planId) return NextResponse.json({ error: "Plan not initialized" }, { status: 400 });

  const { data: rows, error } = await supabase
    .from("trip_plan_rows")
    .select("id, order_index, day_index, location_text, event_text")
    .eq("plan_id", planId)
    .order("order_index", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const existingRows = rows || [];

  let insertAt = existingRows.length;
  const position = body.position || "end";
  if (position === "start") insertAt = 0;
  if ((position === "before" || position === "after") && body.relative_row_id) {
    const idx = existingRows.findIndex((r) => r.id === body.relative_row_id);
    if (idx >= 0) insertAt = position === "before" ? idx : idx + 1;
  }

  const prev = insertAt > 0 ? existingRows[insertAt - 1] : undefined;
  const next = insertAt < existingRows.length ? existingRows[insertAt] : undefined;
  const requestedDayIndex = Number.isFinite(Number(body.day_index)) ? Number(body.day_index) : null;
  const minDayIndex = Math.max(1, prev?.day_index ?? 1);
  const maxDayIndex = next?.day_index ?? null;
  const resolvedDayIndex =
    requestedDayIndex && requestedDayIndex > 0 ? requestedDayIndex : (prev?.day_index ?? next?.day_index ?? 1);

  if (resolvedDayIndex < minDayIndex || (maxDayIndex != null && resolvedDayIndex > maxDayIndex)) {
    return NextResponse.json({ error: "Invalid row date order" }, { status: 400 });
  }

  for (let i = existingRows.length - 1; i >= insertAt; i -= 1) {
    await supabase
      .from("trip_plan_rows")
      .update({ order_index: existingRows[i].order_index + 1 })
      .eq("id", existingRows[i].id);
  }

  const rowPayload = {
    plan_id: planId,
    order_index: insertAt,
    day_index: resolvedDayIndex,
    time_text: null,
    location_text: null,
    event_text: null,
    notes: null,
    owner_name: null,
  };
  const inserted = await supabase.from("trip_plan_rows").insert(rowPayload).select("*").single();
  if (inserted.error || !inserted.data) {
    return NextResponse.json({ error: inserted.error?.message || "Failed to create row" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, row: inserted.data });
}
