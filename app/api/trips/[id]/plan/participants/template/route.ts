import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { canEditTripPlan } from "@/lib/tripPlan";
import { getTripParticipantLabels } from "@/lib/tripParticipantLabels";
import { buildStaffExcelTemplateRows, sampleStaffExcelRow } from "@/lib/tripStaffExcelTemplate";
import {
  calculateRequiredPlanningPreview,
  fetchApprovedRequiredStaffPlan,
  fetchTripAssignmentRules,
  fetchTripRoleRules,
} from "@/lib/tripRequiredRoles";

type RouteContext = { params: Promise<{ id: string }> };

async function canEdit(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, user: User, tripId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, department, is_tech_admin")
    .eq("id", user.id)
    .single();
  const { data: trip } = await supabase.from("trips").select("id, user_id, details, department").eq("id", tripId).single();
  if (!trip) return { ok: false as const, code: 404 as const, trip: null };
  const ok = canEditTripPlan({ user, profile: profile || null, tripUserId: String(trip.user_id) });
  return {
    ok,
    code: ok ? 200 : (403 as const),
    trip: ok ? (trip as { id: string; details?: Record<string, unknown> | null; department?: string | null }) : null,
  };
}

function buildParticipantTemplateRows(department?: string | null) {
  const labels = getTripParticipantLabels(department);
  return [
    {
      סוג: labels.participantSingular,
    "שם פרטי": "ישראל",
    "שם משפחה": "ישראלי",
    "ת.ז.": "123456789",
    "ת. לידה": "01/01/2012",
    כיתה: "ח",
    סניף: "ירושלים",
    "שם אבא": "אברהם",
    "טל' אבא": "0501111111",
    "שם אמא": "שרה",
    "טל' אמא": "0502222222",
    "דוא\"ל אבא": "father@example.com",
    "רגישות רפואית": "",
    תשלום: "שולם",
    "אישור השתתפות": "כן",
    },
  ];
}

async function loadTripStaffTemplateRows(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tripId: string, details: Record<string, unknown>) {
  const [{ count }, approvedRows, roleRules, assignmentRules, staffRes] = await Promise.all([
    supabase.from("trip_plan_buses").select("id", { count: "exact", head: true }).eq("trip_id", tripId),
    fetchApprovedRequiredStaffPlan(supabase, tripId),
    fetchTripRoleRules(supabase),
    fetchTripAssignmentRules(supabase),
    supabase
      .from("trip_plan_participants")
      .select("id, full_name, phone, role, raw_data")
      .eq("trip_id", tripId)
      .eq("participant_type", "staff"),
  ]);

  const preview = calculateRequiredPlanningPreview(details, roleRules, assignmentRules, count || 0);
  const approvedActive = approvedRows.filter((row) => row.status !== "removed" && row.approved_quantity > 0);
  const planRows = approvedActive.length ? approvedActive : preview.rows.filter((row) => row.approved_quantity > 0);
  const tripRows = buildStaffExcelTemplateRows(details, planRows, staffRes.data || []);
  return tripRows.length ? tripRows : [sampleStaffExcelRow()];
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await canEdit(supabase, user as User, id);
  if (!access.ok || !access.trip) {
    return NextResponse.json({ error: access.code === 404 ? "Trip not found" : "Forbidden" }, { status: access.code });
  }

  const kind = new URL(request.url).searchParams.get("kind");
  const participantRows = buildParticipantTemplateRows(access.trip.department);
  const participantSheetName = getTripParticipantLabels(access.trip.department).participants;
  const staffRows = await loadTripStaffTemplateRows(supabase, id, access.trip.details || {});
  const workbook = XLSX.utils.book_new();

  if (kind === "staff") {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(staffRows), "צוות");
  } else if (kind === "both") {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(participantRows), participantSheetName);
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(staffRows), "צוות");
  } else {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(participantRows), participantSheetName);
  }

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const filename =
    kind === "staff"
      ? `trip-${id}-staff-template.xlsx`
      : kind === "both"
        ? `trip-${id}-participants-and-staff-template.xlsx`
        : `trip-${id}-participants-template.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
