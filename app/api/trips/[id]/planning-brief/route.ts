import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { buildCoordinatorPlanningBrief } from "@/lib/coordinatorPlanningBrief";
import { isPlanningApprovedStatus, readCoordinatorPlanningMeta } from "@/lib/coordinatorPlanningMeta";
import type { AutofillPlanRow } from "@/lib/tripDocumentAutofill";
import { canEditTripPlan } from "@/lib/tripPlan";
import { fetchApprovedRequiredStaffPlan } from "@/lib/tripRequiredRoles";
import { getSustainabilityMotifsEnabledFromDb } from "@/lib/sustainability/settings";

type RouteContext = { params: Promise<{ id: string }> };

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

  const { data: trip } = await supabase
    .from("trips")
    .select("id, user_id, name, branch, department, coordinator_name, details, start_date, status")
    .eq("id", id)
    .single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  if (!canEditTripPlan({ user: user as User, profile: profile || null, tripUserId: String(trip.user_id) })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isPlanningApprovedStatus(trip.status)) {
    return NextResponse.json({ error: "Trip is not in planning-approved status" }, { status: 409 });
  }

  const tripDetails = (trip.details && typeof trip.details === "object" ? trip.details : {}) as Record<string, unknown>;

  const [approvedStaffRows, documentsRes, planRes, sustainabilityMotifsEnabled] = await Promise.all([
    fetchApprovedRequiredStaffPlan(supabase, id),
    supabase
      .from("trip_plan_document_overrides")
      .select("document_key, status, pdf_url, form_data")
      .eq("trip_id", id),
    supabase.from("trip_plans").select("id").eq("trip_id", id).maybeSingle(),
    getSustainabilityMotifsEnabledFromDb(supabase),
  ]);

  let planRows: AutofillPlanRow[] = [];
  if (planRes.data?.id) {
    const rowsRes = await supabase
      .from("trip_plan_rows")
      .select("id, order_index, day_index, time_text, location_text, event_text, notes, safety_done")
      .eq("plan_id", planRes.data.id)
      .order("order_index", { ascending: true });
    planRows = (rowsRes.data || []) as AutofillPlanRow[];
  }

  const documentOverrides =
    documentsRes.error && String(documentsRes.error.message || "").includes("trip_plan_document_overrides")
      ? []
      : (documentsRes.data || []);

  const brief = buildCoordinatorPlanningBrief({
    trip: {
      name: trip.name,
      branch: trip.branch,
      department: trip.department,
      coordinator_name: trip.coordinator_name,
      start_date: trip.start_date,
      details: tripDetails,
    },
    tripDetails,
    requiredStaffRows: approvedStaffRows,
    documentOverrides: documentOverrides as Array<{
      document_key: string;
      status?: string | null;
      pdf_url?: string | null;
      form_data?: Record<string, unknown> | null;
    }>,
    planRows,
    sustainabilityMotifsEnabled,
  });

  const meta = readCoordinatorPlanningMeta(tripDetails);

  return NextResponse.json({
    ok: true,
    trip,
    brief,
    meta,
    planningHubUrl: `/dashboard?planning=${id}`,
    detailedPlanUrl: `/dashboard/trip/${id}/plan`,
  });
}
