import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { canEditTripPlan } from "@/lib/tripPlan";
import { normalizeStaffGender } from "@/lib/staffGender";

type RouteContext = { params: Promise<{ id: string }> };
type ExcelRow = Record<string, unknown>;

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

const asText = (value: unknown) => String(value ?? "").trim();
const pick = (row: ExcelRow, keys: string[]) => {
  for (const key of keys) {
    const found = Object.keys(row).find((candidate) => candidate.trim().toLowerCase() === key.trim().toLowerCase());
    if (found) return asText(row[found]);
  }
  return "";
};
const normalizeType = (value: string) => {
  const v = value.trim().toLowerCase();
  if (v.includes("צוות") || v.includes("staff")) return "staff";
  return "participant";
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await canEdit(supabase, user as User, id);
  if (!access.ok) return NextResponse.json({ error: access.code === 404 ? "Trip not found" : "Forbidden" }, { status: access.code });

  const formData = await request.formData();
  const file = formData.get("file");
  const uploadType = formData.get("participantType");
  const uploadTypeOverride = uploadType === "staff" || uploadType === "participant" ? uploadType : null;
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return NextResponse.json({ error: "Workbook is empty" }, { status: 400 });
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(workbook.Sheets[sheetName], { defval: "" });

  const payload = rows
    .map((row, index) => {
      const firstName = pick(row, ["שם פרטי", "firstName", "First Name"]);
      const lastName = pick(row, ["שם משפחה", "lastName", "Last Name"]);
      const name = [firstName, lastName].filter(Boolean).join(" ") || pick(row, ["שם מלא", "שם", "Name", "Full Name"]);
      if (!name) return null;
      const staffRole = pick(row, ["תפקיד", "Role", "Staff Role", "staffRole"]);
      const participantType = uploadTypeOverride || normalizeType(pick(row, ["סוג", "type", "participant_type"]));
      const fatherPhone = pick(row, ["טל' אבא", "טלפון אבא", "Father Phone"]);
      const motherPhone = pick(row, ["טל' אמא", "טלפון אמא", "Mother Phone"]);
      const personalPhone = pick(row, ["טלפון אישי", "Personal Phone"]);
      const genericPhone = pick(row, ["נייד", "טלפון", "Phone"]);
      const phone =
        participantType === "staff"
          ? personalPhone || genericPhone || motherPhone || fatherPhone
          : motherPhone || fatherPhone || personalPhone || genericPhone;
      const identity = pick(row, ["ת.ז.", "תז", "מספר זהות", "ID"]);
      const birthDate = pick(row, ["ת. לידה", "תאריך לידה", "Birth Date", "birthDate"]);
      const grade = pick(row, ["כיתה", "Grade"]);
      const branch = pick(row, ["סניף", "Branch"]);
      const fatherName = pick(row, ["שם אבא", "Father Name"]);
      const motherName = pick(row, ["שם אמא", "Mother Name"]);
      const fatherEmail = pick(row, ["דוא\"ל אבא", "דואל אבא", "אימייל אבא", "Father Email"]);
      const personalEmail = pick(row, ["דוא\"ל אישי", "דוא\"ל", "אימייל", "Email"]);
      const staffEmail = participantType === "staff" ? personalEmail || fatherEmail : fatherEmail;
      const medicalNotes = pick(row, ["רגישות רפואית", "רגישויות רפואיות", "Medical Notes", "Allergies"]);
      const paymentStatus = pick(row, ["תשלום", "סטטוס תשלום", "שילם", "Payment Status"]);
      const parentApproval = pick(row, ["אישור השתתפות", "אישור הורים", "אישור הורה", "Parent Approval"]);
      const policeApproval = pick(row, ["אישור משטרה", "Police Approval", "policeApproval"]);
      const gender = pick(row, ["מגדר", "Gender", "gender"]);
      const raw = {
        staffRole,
        firstName,
        lastName,
        identity,
        birthDate,
        grade,
        branch,
        gender: participantType === "staff" ? normalizeStaffGender(gender) : "",
        fatherName,
        fatherPhone,
        motherName,
        motherPhone,
        personalPhone: participantType === "staff" ? personalPhone || genericPhone || "" : "",
        personalEmail: participantType === "staff" ? staffEmail : "",
        fatherEmail: participantType === "staff" ? "" : fatherEmail,
        medicalNotes,
        paymentStatus,
        parentApproval,
        policeApproval,
      };
      return {
        trip_id: id,
        source: "excel",
        source_record_id: `${identity || name}|${phone}|${index + 2}`,
        participant_type: participantType,
        full_name: name,
        phone: phone || null,
        contact_phone:
          participantType === "staff"
            ? fatherPhone || motherPhone || null
            : fatherPhone || motherPhone || pick(row, ["טלפון הורה/איש קשר", "טלפון הורה", "איש קשר", "Contact Phone"]) || null,
        registration_status: parentApproval || null,
        payment_status: paymentStatus || null,
        parent_approval: parentApproval || null,
        medical_notes: medicalNotes || null,
        role: staffRole || branch || null,
        notes: identity ? `ת.ז. ${identity}` : pick(row, ["הערות", "Notes"]) || null,
        raw_data: raw,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (payload.length === 0) return NextResponse.json({ error: "לא נמצאו שורות תקינות בקובץ" }, { status: 400 });
  const { error } = await supabase.from("trip_plan_participants").upsert(payload, {
    onConflict: "trip_id,source,source_record_id",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, imported: payload.length });
}
