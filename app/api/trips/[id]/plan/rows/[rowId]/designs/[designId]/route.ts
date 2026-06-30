import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";
import { getRouteAuthUser } from "@/lib/supabaseRouteHandler";
import { canEditTripPlan } from "@/lib/tripPlan";

type RouteContext = { params: Promise<{ id: string; rowId: string; designId: string }> };
type Body = {
  document_name?: string;
  designer_name?: string | null;
  size_settings?: string | null;
  notes?: string | null;
  content_mode?: "text" | "file";
  document_text?: string | null;
  designer_instructions?: string | null;
  status?: string | null;
};

const removeStorageFile = async (admin: SupabaseClient, storagePath: string | null | undefined) => {
  if (!storagePath) return;
  const normalized = storagePath.startsWith("trip-files/") ? storagePath.slice("trip-files/".length) : storagePath;
  if (normalized) await admin.storage.from("trip-files").remove([normalized]);
};

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
  return { supabase, response: null, admin: createSupabaseServiceRoleClient() };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id, designId } = await params;
  const { supabase, response } = await requireEditor(id, request);
  if (response) return response;
  const body = (await request.json().catch(() => ({}))) as Body;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.document_name !== undefined) patch.document_name = String(body.document_name || "").trim();
  if (body.designer_name !== undefined) patch.designer_name = body.designer_name;
  if (body.size_settings !== undefined) patch.size_settings = body.size_settings;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.content_mode !== undefined) patch.content_mode = body.content_mode;
  if (body.document_text !== undefined) patch.document_text = body.document_text;
  if (body.designer_instructions !== undefined) patch.designer_instructions = body.designer_instructions;
  if (body.status !== undefined) patch.status = body.status;

  const { error } = await supabase.from("trip_plan_row_designs").update(patch).eq("id", designId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { id, designId } = await params;
  const { supabase, response, admin } = await requireEditor(id, request);
  if (response) return response;

  const { data: existing } = await supabase
    .from("trip_plan_row_designs")
    .select("id, brief_file_path, output_file_path")
    .eq("id", designId)
    .single();
  if (!existing) return NextResponse.json({ error: "Design not found" }, { status: 404 });

  const { error: deleteError } = await supabase.from("trip_plan_row_designs").delete().eq("id", designId);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  if (admin) {
    await removeStorageFile(admin, existing.brief_file_path);
    await removeStorageFile(admin, existing.output_file_path);
  }
  return NextResponse.json({ ok: true });
}
