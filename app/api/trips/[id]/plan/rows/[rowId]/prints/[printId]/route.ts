import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";
import { getRouteAuthUser } from "@/lib/supabaseRouteHandler";
import { canEditTripPlan } from "@/lib/tripPlan";

type RouteContext = { params: Promise<{ id: string; rowId: string; printId: string }> };
type Body = { status?: string | null };

async function requireEditor(id: string, request: Request) {
  const { supabase, user } = await getRouteAuthUser(request);
  if (!user) {
    return { supabase, response: NextResponse.json({ error: "יש להתחבר מחדש" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, department, is_tech_admin")
    .eq("id", user.id)
    .single();
  const { data: trip } = await supabase.from("trips").select("id, user_id").eq("id", id).single();
  if (!trip) return { supabase, response: NextResponse.json({ error: "Trip not found" }, { status: 404 }) };
  if (!canEditTripPlan({ user: user as User, profile: profile || null, tripUserId: String(trip.user_id) })) {
    return { supabase, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase, response: null };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id, printId } = await params;
  const { supabase, response } = await requireEditor(id, request);
  if (response) return response;
  const body = (await request.json().catch(() => ({}))) as Body;
  const { error } = await supabase
    .from("trip_plan_row_prints")
    .update({ status: body.status || null })
    .eq("id", printId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { id, printId } = await params;
  const { supabase, response } = await requireEditor(id, request);
  if (response) return response;

  const { data: existing } = await supabase
    .from("trip_plan_row_prints")
    .select("id, file_path")
    .eq("id", printId)
    .single();
  if (!existing) return NextResponse.json({ error: "Print not found" }, { status: 404 });

  const { error: deleteMetaError } = await supabase.from("trip_plan_row_prints").delete().eq("id", printId);
  if (deleteMetaError) return NextResponse.json({ error: deleteMetaError.message }, { status: 500 });

  if (existing.file_path) {
    const admin = createSupabaseServiceRoleClient();
    const rawPath = String(existing.file_path);
    const storagePath = rawPath.startsWith("trip-files/") ? rawPath.slice("trip-files/".length) : rawPath;
    if (admin && storagePath) {
      await admin.storage.from("trip-files").remove([storagePath]);
    }
  }
  return NextResponse.json({ ok: true });
}
