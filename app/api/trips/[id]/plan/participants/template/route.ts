import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { canEditTripPlan } from "@/lib/tripPlan";

type RouteContext = { params: Promise<{ id: string }> };

async function canEdit(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, user: User, tripId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, department, is_tech_admin")
    .eq("id", user.id)
    .single();
  const { data: trip } = await supabase.from("trips").select("id, user_id").eq("id", tripId).single();
  if (!trip) return { ok: false, code: 404 as const };
  const ok = canEditTripPlan({ user, profile: profile || null, tripUserId: String(trip.user_id) });
  return { ok, code: ok ? 200 : (403 as const) };
}

const participantRows = [
  {
    "סוג": "חניך",
    "שם פרטי": "ישראל",
    "שם משפחה": "ישראלי",
    "ת.ז.": "123456789",
    "ת. לידה": "01/01/2012",
    "כיתה": "ח",
    "סניף": "ירושלים",
    "שם אבא": "אברהם",
    "טל' אבא": "0501111111",
    "שם אמא": "שרה",
    "טל' אמא": "0502222222",
    "דוא\"ל אבא": "father@example.com",
    "רגישות רפואית": "",
    "תשלום": "שולם",
    "אישור השתתפות": "כן",
  },
];

const staffRows = [
  {
    "סוג": "צוות",
    "תפקיד": "מדריך",
    "שם פרטי": "מנחם",
    "שם משפחה": "מדריך",
    "ת.ז.": "987654321",
    "ת. לידה": "01/01/2000",
    "כיתה": "",
    "סניף": "ירושלים",
    "שם אבא": "",
    "טל' אבא": "0503333333",
    "שם אמא": "",
    "טל' אמא": "",
    "דוא\"ל אבא": "staff@example.com",
    "רגישות רפואית": "",
    "תשלום": "",
    "אישור השתתפות": "כן",
    "אישור משטרה": "כן",
  },
];

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await canEdit(supabase, user as User, id);
  if (!access.ok) return NextResponse.json({ error: access.code === 404 ? "Trip not found" : "Forbidden" }, { status: access.code });

  const kind = new URL(request.url).searchParams.get("kind");
  const workbook = XLSX.utils.book_new();
  if (kind === "staff") {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(staffRows), "צוות");
  } else if (kind === "both") {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(participantRows), "חניכים");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(staffRows), "צוות");
  } else {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(participantRows), "חניכים");
  }
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const filename = kind === "staff" ? "trip-staff-template.xlsx" : kind === "both" ? "trip-participants-and-staff-template.xlsx" : "trip-participants-template.xlsx";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
