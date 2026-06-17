import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { canEditTripPlan } from "@/lib/tripPlan";

type RouteContext = { params: Promise<{ id: string }> };
type Body = { row_ids?: string[] };

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Body;
  const rowIds = Array.isArray(body.row_ids) ? body.row_ids.map((value) => String(value).trim()).filter(Boolean) : [];
  if (rowIds.length === 0) {
    return NextResponse.json({ error: "row_ids is required" }, { status: 400 });
  }

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

  const { data: existingRows, error } = await supabase
    .from("trip_plan_rows")
    .select("id")
    .eq("plan_id", planId)
    .order("order_index", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const existingIds = (existingRows || []).map((row) => String(row.id));
  if (rowIds.length !== existingIds.length || new Set(rowIds).size !== rowIds.length) {
    return NextResponse.json({ error: "Invalid row order payload" }, { status: 400 });
  }
  const existingSet = new Set(existingIds);
  if (!rowIds.every((rowId) => existingSet.has(rowId))) {
    return NextResponse.json({ error: "Invalid row order payload" }, { status: 400 });
  }

  const updates = await Promise.all(
    rowIds.map((rowId, index) =>
      supabase.from("trip_plan_rows").update({ order_index: index }).eq("id", rowId).eq("plan_id", planId),
    ),
  );
  const updateError = updates.find((result) => result.error)?.error;
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true, row_ids: rowIds });
}
