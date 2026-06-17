import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { canEditTripPlan } from "@/lib/tripPlan";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getStaffDisplayLabel, isStaffPlaceholder, staffRoleLabels } from "@/lib/staffRoster";

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
  fallbackName = "",
  notes = "",
): ContactRow => {
  const fullName =
    textValue(profile?.full_name) ||
    [profile?.official_name, profile?.last_name].map(textValue).filter(Boolean).join(" ") ||
    fallbackName;
  const split = splitName(fullName);
  return {
    role,
    firstName: split.firstName,
    lastName: split.lastName,
    phone: textValue(profile?.phone),
    extraPhone: "",
    email: textValue(profile?.email),
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

  const { data: profile } = await supabase.from("profiles").select("role, department, is_tech_admin, can_dept_review").eq("id", user.id).single();
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
  const [safetyProfileRes, deptProfilesRes, staffRes] = await Promise.all([
    safetyAssigneeId
      ? supabase.from("profiles").select("id, full_name, official_name, last_name, phone, email, role, department").eq("id", safetyAssigneeId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("profiles")
      .select("id, full_name, official_name, last_name, phone, email, role, department, can_dept_review")
      .eq("department", trip.department)
      .in("role", ["dept_staff", "dept_trips_officer"]),
    supabase
      .from("trip_plan_participants")
      .select("id, full_name, phone, contact_phone, role, notes, raw_data")
      .eq("trip_id", id)
      .eq("participant_type", "staff")
      .order("created_at", { ascending: true }),
  ]);

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

  const deptProfiles = Array.isArray(deptProfilesRes.data) ? deptProfilesRes.data : [];
  const deptManager =
    deptProfiles.find((item) => textValue(item.role) === "dept_trips_officer") ||
    deptProfiles.find((item) => textValue(item.can_dept_review) === "true") ||
    deptProfiles[0] ||
    null;
  const branchApprover =
    deptProfiles.find((item) => textValue(item.can_dept_review) === "true" && textValue(item.id) !== textValue(deptManager?.id)) ||
    deptProfiles.find((item) => textValue(item.id) !== textValue(deptManager?.id)) ||
    null;

  const fixedRows: ContactRow[] = [
    { role: "משטרה", firstName: "", lastName: "", phone: "100", extraPhone: "", email: "", notes: "מוקד חירום" },
    { role: "כיבוי אש", firstName: "", lastName: "", phone: "102", extraPhone: "", email: "", notes: "מוקד חירום" },
    { role: "מד״א", firstName: "", lastName: "", phone: "101", extraPhone: "", email: "", notes: "מוקד חירום" },
    { role: "קב״ט אזורי", firstName: "", lastName: "", phone: "", extraPhone: "", email: "", notes: "להשלמה לפי אזור הטיול" },
    { role: "בית רפואה באזור הטיול", firstName: "", lastName: "", phone: "", extraPhone: "", email: "", notes: "להשלמה לפי אזור הטיול" },
    { role: "מזכ״לית הארגון", firstName: "", lastName: "", phone: "", extraPhone: "", email: "", notes: "להשלמה בהגדרות/פרטי ארגון" },
    profileContact("אחראי הבטיחות המשויך לטיול", safetyProfileRes.data as Record<string, unknown> | null, "", safetyAssigneeId ? "" : "לא שויך אחראי בטיחות"),
    profileContact("מנהל המחלקה", deptManager as Record<string, unknown> | null, "", deptManager ? "" : "לא נמצא פרופיל מתאים במחלקה"),
    profileContact("אחראית הסניפים במטה", branchApprover as Record<string, unknown> | null, "", branchApprover ? "מאשרת טיולי רכזי סניפים" : "לא נמצא פרופיל מתאים במחלקה"),
    coordinatorRow,
  ];

  const staffRows: ContactRow[] = (staffRes.data || []).map((person) => {
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
      email: rawText(raw, "fatherEmail"),
      notes: placeholder ? "תקן חובה חסר איוש" : textValue(person.notes),
    };
  });

  return NextResponse.json({ ok: true, contacts: [...fixedRows, ...staffRows] });
}
