import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { replaceRowSafetyWithDefaultRisks } from "@/lib/eventDefaultRisks";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { canEditTripPlan, seedRowsFromTripDetails } from "@/lib/tripPlan";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const payload = (await request.json().catch(() => ({}))) as { force?: boolean };
  const force = Boolean(payload.force);

  const { id } = await params;
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
  const { data: trip } = await supabase.from("trips").select("id, user_id, details").eq("id", id).single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  if (!canEditTripPlan({ user: user as User, profile: profile || null, tripUserId: String(trip.user_id) })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existingPlan } = await supabase
    .from("trip_plans")
    .select("id")
    .eq("trip_id", id)
    .maybeSingle();
  let planId = existingPlan?.id as string | undefined;
  if (!planId) {
    const created = await supabase
      .from("trip_plans")
      .insert({ trip_id: id, created_by: user.id })
      .select("id")
      .single();
    if (created.error || !created.data) {
      return NextResponse.json({ error: created.error?.message || "Failed to create plan" }, { status: 500 });
    }
    planId = String(created.data.id);
  }

  const { count } = await supabase
    .from("trip_plan_rows")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", planId);
  if ((count || 0) > 0 && !force) {
    return NextResponse.json({ ok: true, skipped: true, reason: "rows_already_exist" });
  }
  if ((count || 0) > 0 && force) {
    await supabase.from("trip_plan_rows").delete().eq("plan_id", planId);
  }

  const rows = seedRowsFromTripDetails(trip.details || {});
  const { data: insertedRows, error: insertError } = await supabase
    .from("trip_plan_rows")
    .insert(rows.map((r) => ({ ...r, plan_id: planId })))
    .select("id, event_text");
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  for (const row of insertedRows || []) {
    const eventText = String(row.event_text || "").trim();
    if (eventText) await replaceRowSafetyWithDefaultRisks(supabase, String(row.id), eventText);
  }

  return NextResponse.json({ ok: true, inserted: rows.length, plan_id: planId });
}
