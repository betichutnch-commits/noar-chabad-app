import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { canEditTripPlan } from "@/lib/tripPlan";

type RouteContext = { params: Promise<{ id: string }> };
type Body =
  | { action: "updatePurchaseOverride"; equipmentId?: string; status?: string | null; owner?: string | null; unitPrice?: number | string | null }
  | { action: "updateSupplier"; name?: string; phone?: string | null; email?: string | null; address?: string | null };

async function canEdit(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, user: User, tripId: string) {
  const { data: profile } = await supabase.from("profiles").select("role, department, is_tech_admin").eq("id", user.id).single();
  const { data: trip } = await supabase.from("trips").select("id, user_id").eq("id", tripId).single();
  if (!trip) return { ok: false, code: 404 as const };
  return { ok: canEditTripPlan({ user, profile: profile || null, tripUserId: String(trip.user_id) }), code: 403 as const };
}

const isMissingPurchaseSchema = (message?: string | null) =>
  Boolean(message && (message.includes("trip_plan_purchase_overrides") || message.includes("trip_plan_suppliers")));
const isMissingUnitPriceColumn = (message?: string | null) => Boolean(message && message.includes("unit_price"));

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await canEdit(supabase, user as User, id);
  if (!access.ok) return NextResponse.json({ error: access.code === 404 ? "Trip not found" : "Forbidden" }, { status: access.code });

  const overridesWithPrice = await supabase.from("trip_plan_purchase_overrides").select("id, equipment_id, status, owner, unit_price").eq("trip_id", id);
  const overridesRes =
    overridesWithPrice.error && isMissingUnitPriceColumn(overridesWithPrice.error.message)
      ? await supabase.from("trip_plan_purchase_overrides").select("id, equipment_id, status, owner").eq("trip_id", id)
      : overridesWithPrice;
  const [suppliersRes] = await Promise.all([
    supabase.from("trip_plan_suppliers").select("id, name, phone, email, address").eq("trip_id", id).order("name", { ascending: true }),
  ]);
  const schemaMissing = isMissingPurchaseSchema(overridesRes.error?.message) || isMissingPurchaseSchema(suppliersRes.error?.message);
  if (schemaMissing) return NextResponse.json({ ok: true, schemaMissing: true, overrides: [], suppliers: [] });
  if (overridesRes.error || suppliersRes.error) return NextResponse.json({ error: overridesRes.error?.message || suppliersRes.error?.message }, { status: 500 });
  return NextResponse.json({ ok: true, schemaMissing: false, overrides: overridesRes.data || [], suppliers: suppliersRes.data || [] });
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

  if (body.action === "updatePurchaseOverride") {
    if (!body.equipmentId) return NextResponse.json({ error: "Missing equipment id" }, { status: 400 });
    const unitPriceRaw = body.unitPrice === "" || body.unitPrice == null ? null : Number(body.unitPrice);
    const payload = {
      trip_id: id,
      equipment_id: body.equipmentId,
      status: body.status || null,
      owner: body.owner || null,
      unit_price: unitPriceRaw != null && Number.isFinite(unitPriceRaw) ? unitPriceRaw : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("trip_plan_purchase_overrides").upsert(payload, { onConflict: "trip_id,equipment_id" });
    if (error && isMissingUnitPriceColumn(error.message)) {
      const { error: retryError } = await supabase.from("trip_plan_purchase_overrides").upsert(
        {
          trip_id: id,
          equipment_id: body.equipmentId,
          status: body.status || null,
          owner: body.owner || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "trip_id,equipment_id" },
      );
      if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "updateSupplier") {
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "שם ספק הוא שדה חובה" }, { status: 400 });
    const { error } = await supabase.from("trip_plan_suppliers").upsert(
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

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
