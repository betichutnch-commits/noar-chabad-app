import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isManagerUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { canEditTripPlan } from "@/lib/tripPlan";
import { evaluateTripCompliance, type TripComplianceDocument, type TripComplianceStaffRole } from "@/lib/regulation/compliance";
import { circular585, preparationChecklist, coordinationRules, organizationalRoleMappings } from "@/lib/regulation";
import type { TripSensitiveContext } from "@/lib/regulation/sensitive-locations";

type RouteContext = { params: Promise<{ id: string }> };

const STAFF_ROLE_KEYS = ["trip_leader", "medic", "bus_escort", "security"] as const;

export async function GET(_request: Request, { params }: RouteContext) {
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

  const { data: trip } = await supabase.from("trips").select("id, user_id, name, status, details").eq("id", id).single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const userLike = user as User;
  const allowed =
    canEditTripPlan({ user: userLike, profile: profile || null, tripUserId: String(trip.user_id) }) ||
    isManagerUser(userLike, profile || null);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: plan } = await supabase.from("trip_plans").select("id").eq("trip_id", id).maybeSingle();

  let planRows: Array<{ eventText?: string | null }> = [];
  let planRowsWithLocation: TripSensitiveContext["planRows"] = [];
  if (plan?.id) {
    const { data: rows } = await supabase
      .from("trip_plan_rows")
      .select("event_text, location_text, location_sensitive")
      .eq("plan_id", plan.id)
      .order("order_index", { ascending: true });
    planRows = (rows || []).map((row) => ({ eventText: row.event_text }));
    planRowsWithLocation = (rows || []).map((row) => ({
      location_text: row.location_text,
      location_sensitive: Boolean(row.location_sensitive),
    }));
  }

  const { data: docOverrides } = await supabase
    .from("trip_plan_document_overrides")
    .select("document_key, status, pdf_url, form_data")
    .eq("trip_id", id);

  const documents: TripComplianceDocument[] = (docOverrides || []).map((row) => ({
    key: String(row.document_key),
    status: row.status,
    pdfUrl: row.pdf_url,
    hasFormData: Boolean(row.form_data && typeof row.form_data === "object" && Object.keys(row.form_data as object).length > 0),
  }));

  const { data: participants } = await supabase
    .from("trip_plan_participants")
    .select("full_name, role, raw_data, participant_type")
    .eq("trip_id", id)
    .eq("participant_type", "staff");

  const staffRoles: TripComplianceStaffRole[] = STAFF_ROLE_KEYS.map((roleKey) => {
    const assigned = (participants || []).some((p) => {
      const name = String(p.full_name || "").trim();
      if (!name || name.startsWith("תקן חסר:")) return false;
      const raw = (p.raw_data || {}) as Record<string, unknown>;
      const roleKeys = Array.isArray(raw.requiredRoleKeys) ? raw.requiredRoleKeys.map(String) : [];
      if (roleKeys.includes(roleKey)) return true;
      return String(p.role || "").includes(roleKey);
    });
    return { roleKey, assigned };
  });

  const compliance = evaluateTripCompliance({
    planRows,
    documents,
    staffRoles,
    tripDetails: (trip.details || {}) as TripSensitiveContext["tripDetails"],
    planRowsWithLocation,
  });

  return NextResponse.json({
    ok: true,
    trip: { id: trip.id, name: trip.name, status: trip.status },
    compliance,
    meta: {
      circular: circular585,
      roleMappings: organizationalRoleMappings,
      preparationChecklist,
      coordinationRules,
    },
  });
}
