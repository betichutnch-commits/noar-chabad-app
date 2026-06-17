import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { canEditTripPlan } from "@/lib/tripPlan";

type RouteContext = { params: Promise<{ id: string }> };
type Body = { action: "updatePrintShop"; name?: string; phone?: string | null; email?: string | null; address?: string | null };

async function canEdit(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, user: User, tripId: string) {
  const { data: profile } = await supabase.from("profiles").select("role, department, is_tech_admin").eq("id", user.id).single();
  const { data: trip } = await supabase.from("trips").select("id, user_id").eq("id", tripId).single();
  if (!trip) return { ok: false, code: 404 as const };
  return { ok: canEditTripPlan({ user, profile: profile || null, tripUserId: String(trip.user_id) }), code: 403 as const };
}

const isMissingPrintShopSchema = (message?: string | null) => Boolean(message && message.includes("trip_plan_print_shops"));

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await canEdit(supabase, user as User, id);
  if (!access.ok) return NextResponse.json({ error: access.code === 404 ? "Trip not found" : "Forbidden" }, { status: access.code });

  const { data, error } = await supabase.from("trip_plan_print_shops").select("id, name, phone, email, address").eq("trip_id", id).order("name", { ascending: true });
  if (isMissingPrintShopSchema(error?.message)) return NextResponse.json({ ok: true, schemaMissing: true, printShops: [] });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, schemaMissing: false, printShops: data || [] });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Body;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await canEdit(supabase, user as User, id);
  if (!access.ok) return NextResponse.json({ error: access.code === 404 ? "Trip not found" : "Forbidden" }, { status: access.code });

  if (body.action !== "updatePrintShop") return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "שם בית דפוס הוא שדה חובה" }, { status: 400 });
  const { error } = await supabase.from("trip_plan_print_shops").upsert(
    {
      trip_id: id,
      name,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "trip_id,name" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
