import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { canEditTripPlan } from "@/lib/tripPlan";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getStaffDisplayLabel, isStaffPlaceholder, staffRoleLabels } from "@/lib/staffRoster";
import { profileContactNameFields } from "@/lib/userDisplay";
import {
  deptTripsOfficerContactRole,
  isTripLeaderStaffContact,
  resolveDepartmentContactProfiles,
} from "@/lib/tripContactList";

type RouteContext = { params: Promise<{ id: string }> };
type ContactRow = {
  role: string;
  firstName: string;
  lastName: string;
  phone: string;
  extraPhone: string;
  email: string;
  notes: string;
};

const textValue = (value: unknown) => String(value ?? "").trim();

const splitName = (name: string) => {
  const parts = textValue(name).split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
};

const profileContact = (
  role: string,
  profile?: Record<string, unknown> | null,
  meta?: Record<string, unknown> | null,
  notes = "",
): ContactRow => {
  const names = profileContactNameFields(profile, meta);
  return {
    role,
    firstName: names.firstName,
    lastName: names.lastName,
    phone: textValue(profile?.phone) || textValue(meta?.phone),
    extraPhone: "",
    email: textValue(profile?.email) || textValue(meta?.email) || textValue(meta?.contact_email),
    notes,
  };
};

const rawText = (raw: Record<string, unknown>, key: string) => textValue(raw[key]);

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role, department, is_tech_admin").eq("id", user.id).single();
  const { data: trip } = await supabase
    .from("trips")
    .select("id, user_id, name, department, coordinator_name, details, safety_assignee_id")
    .eq("id", id)
    .single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (!canEditTripPlan({ user: user as User, profile: profile || null, tripUserId: String(trip.user_id) })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const details = (trip.details || {}) as Record<string, unknown>;
  const safetyAssigneeId = textValue(trip.safety_assignee_id);

  const [safetyProfileRes, usersViewRes, deptProfilesRes, staffRes] = await Promise.all([
    safetyAssigneeId
      ? supabase.from("profiles").select("id, full_name, official_name, last_name, phone, email, role, department").eq("id", safetyAssigneeId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("users_management_view").select("id, raw_user_meta_data"),
    trip.department
      ? supabase
          .from("profiles")
          .select("id, full_name, official_name, last_name, phone, email, role, department")
          .eq("department", trip.department)
          .in("role", ["dept_staff", "dept_trips_officer"])
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("trip_plan_participants")
      .select("id, full_name, phone, contact_phone, role, notes, raw_data")
      .eq("trip_id", id)
      .eq("participant_type", "staff")
      .order("created_at", { ascending: true }),
  ]);

  const metaByUserId = new Map<string, Record<string, unknown>>(
    (usersViewRes.data || []).map((row) => [String(row.id), ((row.raw_user_meta_data || {}) as Record<string, unknown>) || {}]),
  );

  const { deptManager, deptTripsOfficer } = resolveDepartmentContactProfiles({
    tripDepartment: trip.department,
    profiles: (deptProfilesRes.data || []) as Array<Record<string, unknown>>,
    metaByUserId,
  });

  const coordinatorSplit = splitName(textValue(details.coordName) || textValue(trip.coordinator_name));
  const coordinatorRow: ContactRow = {
    role: "אחראי הטיול",
    firstName: coordinatorSplit.firstName,
    lastName: coordinatorSplit.lastName,
    phone: textValue(details.coordPhone),
    extraPhone: "",
    email: textValue(details.coordEmail),
    notes: "נמשך מפרטי הטיול",
  };

  const safetyMeta = safetyAssigneeId ? metaByUserId.get(safetyAssigneeId) || null : null;
  const deptManagerMeta = deptManager ? metaByUserId.get(textValue(deptManager.id)) || null : null;
  const deptTripsOfficerMeta = deptTripsOfficer ? metaByUserId.get(textValue(deptTripsOfficer.id)) || null : null;

  const fixedRows: ContactRow[] = [
    { role: "משטרה", firstName: "", lastName: "", phone: "100", extraPhone: "", email: "", notes: "מוקד חירום" },
    { role: "כיבוי אש", firstName: "", lastName: "", phone: "102", extraPhone: "", email: "", notes: "מוקד חירום" },
    { role: "מד״א", firstName: "", lastName: "", phone: "101", extraPhone: "", email: "", notes: "מוקד חירום" },
    { role: "קב״ט אזורי", firstName: "", lastName: "", phone: "", extraPhone: "", email: "", notes: "להשלמה לפי אזור הטיול" },
    { role: "בית רפואה באזור הטיול", firstName: "", lastName: "", phone: "", extraPhone: "", email: "", notes: "להשלמה לפי אזור הטיול" },
    { role: "מזכ״לית הארגון", firstName: "", lastName: "", phone: "", extraPhone: "", email: "", notes: "להשלמה בהגדרות/פרטי ארגון" },
    profileContact(
      "אחראי הבטיחות המשויך לטיול",
      safetyProfileRes.data as Record<string, unknown> | null,
      safetyMeta,
      safetyAssigneeId ? "" : "לא שויך אחראי בטיחות",
    ),
    profileContact("מנהל המחלקה", deptManager, deptManagerMeta, deptManager ? "" : "לא נמצא פרופיל מתאים במחלקה"),
    profileContact(
      deptTripsOfficerContactRole(trip.department),
      deptTripsOfficer,
      deptTripsOfficerMeta,
      deptTripsOfficer ? "מאשרת טיולי רכזי סניפים" : "לא נמצא פרופיל מתאים במחלקה",
    ),
    coordinatorRow,
  ];

  const staffRows: ContactRow[] = (staffRes.data || [])
    .filter((person) => !isTripLeaderStaffContact(person))
    .map((person) => {
      const raw = ((person.raw_data || {}) as Record<string, unknown>) || {};
      const labels = staffRoleLabels({ id: String(person.id), full_name: person.full_name, role: person.role, raw_data: raw });
      const placeholder = isStaffPlaceholder({ id: String(person.id), raw_data: raw });
      const split = splitName(getStaffDisplayLabel({ id: String(person.id), full_name: person.full_name, role: person.role, raw_data: raw }));
      return {
        role: labels.length ? labels.join(", ") : textValue(person.role) || "צוות",
        firstName: rawText(raw, "firstName") || split.firstName,
        lastName: rawText(raw, "lastName") || split.lastName,
        phone: textValue(person.phone),
        extraPhone: textValue(person.contact_phone),
        email: rawText(raw, "personalEmail") || rawText(raw, "fatherEmail"),
        notes: placeholder ? "תקן חובה חסר איוש" : textValue(person.notes),
      };
    });

  return NextResponse.json({ ok: true, contacts: [...fixedRows, ...staffRows] });
}
