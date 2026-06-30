import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { canEditTripPlan } from "@/lib/tripPlan";
import { REQUIRED_STAFF_RAW } from "@/lib/tripRequiredRoles";
import { validateStaffRoleMerge } from "@/lib/staffRoleMerge";
import {
  buildSplitPlaceholderRow,
  buildUpdatedStaffAfterSplit,
  canSplitStaffRole,
  pairStaffRoles,
  removeStaffRolePair,
} from "@/lib/staffRoleSplit";
import {
  buildRegistrationHintsMap,
  buildRegistrationSnapshotFromProfile,
  buildStaffGenderHintsFromRegistration,
  mergeRegistrationIntoRaw,
  normalizeImportedParticipantRaw,
  readRegistrationFieldsFromRaw,
  resolveParticipantIdentity,
  type RegistrationSnapshot,
} from "@/lib/participantRegistrationFill";
import { normalizeIdentityNumber, type StaffGender } from "@/lib/staffGender";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";

type RouteContext = { params: Promise<{ id: string }> };
type ParticipantType = "participant" | "staff";
type ParticipantSource = "manual" | "excel" | "airtable";
type AssignmentKind = "groups" | "buses" | "rooms" | "other";
type AssignmentAudience = "participants" | "staff" | "both";
type AirtableRecord = { id: string; fields: Record<string, unknown> };
type LocalParticipant = {
  id: string;
  trip_id: string;
  source: ParticipantSource;
  source_record_id?: string | null;
  participant_type: ParticipantType;
  full_name: string;
  phone?: string | null;
  contact_phone?: string | null;
  registration_status?: string | null;
  payment_status?: string | null;
  parent_approval?: string | null;
  medical_notes?: string | null;
  role?: string | null;
  notes?: string | null;
  bus_id?: string | null;
  group_id?: string | null;
  local_notes?: string | null;
  raw_data?: Record<string, unknown> | null;
};
type ParticipantPayload = {
  id?: string;
  source?: ParticipantSource;
  sourceRecordId?: string | null;
  type?: ParticipantType;
  name?: string;
  phone?: string | null;
  contactPhone?: string | null;
  registrationStatus?: string | null;
  paymentStatus?: string | null;
  parentApproval?: string | null;
  medicalNotes?: string | null;
  role?: string | null;
  notes?: string | null;
  busId?: string | null;
  groupId?: string | null;
  localNotes?: string | null;
  raw?: Record<string, unknown> | null;
};
type AssignmentSetRow = {
  id: string;
  trip_id: string;
  kind: AssignmentKind;
  custom_kind_label?: string | null;
  audience: AssignmentAudience;
  title: string;
  order_index: number;
};
type AssignmentItemRow = {
  id: string;
  trip_id: string;
  assignment_set_id: string;
  bus_id?: string | null;
  name: string;
  order_index: number;
};
type AssignmentMemberRow = {
  id: string;
  trip_id: string;
  assignment_set_id: string;
  assignment_item_id: string;
  participant_id: string;
};
type Body =
  | ({ action: "createParticipant" | "updateParticipant" } & ParticipantPayload)
  | { action: "deleteParticipant"; id?: string }
  | { action: "upsertAssignment"; recordId?: string; busId?: string | null; groupId?: string | null; localNotes?: string | null }
  | { action: "importAirtable" }
  | {
      action: "createBus";
      name?: string;
      busNumber?: string | null;
      driverName?: string | null;
      driverPhone?: string | null;
      company?: string | null;
      capacity?: number;
      leaderName?: string | null;
      leaderPhone?: string | null;
      leaderEmail?: string | null;
      notes?: string | null;
    }
  | {
      action: "updateBus";
      id?: string;
      name?: string;
      busNumber?: string | null;
      driverName?: string | null;
      driverPhone?: string | null;
      company?: string | null;
      capacity?: number;
      leaderName?: string | null;
      leaderPhone?: string | null;
      leaderEmail?: string | null;
      notes?: string | null;
    }
  | { action: "deleteBus"; id?: string }
  | { action: "createGroup"; name?: string; targetSize?: number; notes?: string | null }
  | { action: "updateGroup"; id?: string; name?: string; targetSize?: number; notes?: string | null }
  | { action: "deleteGroup"; id?: string }
  | { action: "createAssignmentSet"; kind?: AssignmentKind; audience?: AssignmentAudience; customKindLabel?: string | null }
  | { action: "renameAssignmentSet"; id?: string; title?: string }
  | { action: "deleteAssignmentSet"; id?: string }
  | { action: "createAssignmentItem"; assignmentSetId?: string; name?: string; busId?: string | null }
  | { action: "renameAssignmentItem"; id?: string; name?: string }
  | { action: "deleteAssignmentItem"; id?: string }
  | { action: "assignMembersToItem"; assignmentSetId?: string; assignmentItemId?: string; participantIds?: string[] }
  | { action: "removeAssignmentMember"; memberId?: string; assignmentSetId?: string; participantId?: string }
  | { action: "assignRequiredRole"; placeholderId?: string; participantId?: string }
  | { action: "assignRolesToParticipant"; participantId?: string; placeholderIds?: string[] }
  | { action: "splitStaffRole"; participantId?: string; roleLabel?: string }
  | { action: "addStaffRoleSlot"; roleKey?: string; roleLabel?: string };

const fieldCandidates = {
  name: ["שם מלא", "שם", "Name", "Full Name", "full_name"],
  phone: ["טלפון", "נייד", "Phone", "Mobile", "phone"],
  contactPhone: ["טלפון הורה", "איש קשר", "טלפון איש קשר", "Parent Phone", "Contact Phone"],
  registrationStatus: ["סטטוס הרשמה", "נרשם", "Registration Status", "Registered"],
  paymentStatus: ["סטטוס תשלום", "שילם", "תשלום", "Payment Status", "Paid"],
  parentApproval: ["אישור הורים", "אישור הורה", "Parent Approval", "Parent Consent"],
  medicalNotes: ["רגישויות רפואיות", "רגישות רפואית", "Medical", "Medical Notes", "Allergies"],
  role: ["תפקיד", "Role", "Staff Role"],
  notes: ["הערות", "Notes"],
  gender: ["מגדר", "Gender", "gender", "מין", "Sex"],
};

async function canEdit(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, user: User, tripId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, department, is_tech_admin")
    .eq("id", user.id)
    .single();
  const { data: trip } = await supabase.from("trips").select("id, user_id, name, department").eq("id", tripId).single();
  if (!trip) return { ok: false, code: 404 as const, trip: null };
  const ok = canEditTripPlan({ user, profile: profile || null, tripUserId: String(trip.user_id) });
  return { ok, code: ok ? 200 : (403 as const), trip };
}

const asText = (value: unknown) => {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean).join(", ");
  if (value === true) return "כן";
  if (value === false) return "לא";
  return String(value ?? "").trim();
};

const pickField = (fields: Record<string, unknown>, candidates: string[]) => {
  for (const candidate of candidates) {
    const key = Object.keys(fields).find((field) => field.toLowerCase().trim() === candidate.toLowerCase().trim());
    if (key) return asText(fields[key]);
  }
  return "";
};

const normalizeParticipant = (row: LocalParticipant) => ({
  id: row.id,
  source: row.source,
  sourceRecordId: row.source_record_id || null,
  type: row.participant_type,
  name: row.full_name,
  phone: row.phone || "",
  contactPhone: row.contact_phone || "",
  registrationStatus: row.registration_status || "",
  paymentStatus: row.payment_status || "",
  parentApproval: row.parent_approval || "",
  medicalNotes: row.medical_notes || "",
  role: row.role || "",
  notes: row.notes || "",
  busId: row.bus_id || null,
  groupId: row.group_id || null,
  localNotes: row.local_notes || "",
  raw: row.raw_data || {},
});

const participantPayloadToRow = (tripId: string, body: ParticipantPayload) => ({
  trip_id: tripId,
  source: body.source || "manual",
  source_record_id: body.sourceRecordId || null,
  participant_type: body.type || "participant",
  full_name: String(body.name || "").trim(),
  phone: body.phone || null,
  contact_phone: body.contactPhone || null,
  registration_status: body.registrationStatus || null,
  payment_status: body.paymentStatus || null,
  parent_approval: body.parentApproval || null,
  medical_notes: body.medicalNotes || null,
  role: body.role || null,
  notes: body.notes || null,
  bus_id: body.busId || null,
  group_id: body.groupId || null,
  local_notes: body.localNotes || null,
  raw_data: body.raw || {},
  updated_at: new Date().toISOString(),
});

const escapeAirtableString = (value: string) => value.replace(/'/g, "\\'");

async function fetchAirtableTable(tableName: string, type: ParticipantType, tripId: string, tripName: string) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId || !tableName) return { configured: false, rows: [] as ReturnType<typeof participantPayloadToRow>[], error: null as string | null };

  const records: AirtableRecord[] = [];
  let offset = "";
  const tripField = process.env.AIRTABLE_TRIP_FIELD;
  do {
    const url = new URL(`https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    if (tripField) {
      url.searchParams.set(
        "filterByFormula",
        `OR({${tripField}}='${escapeAirtableString(tripId)}',{${tripField}}='${escapeAirtableString(tripName)}')`,
      );
    }
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { configured: true, rows: [] as ReturnType<typeof participantPayloadToRow>[], error: body || `Airtable error ${res.status}` };
    }
    const payload = (await res.json()) as { records?: AirtableRecord[]; offset?: string };
    records.push(...(payload.records || []));
    offset = payload.offset || "";
  } while (offset);

  return {
    configured: true,
    error: null,
    rows: records.map((record) =>
      participantPayloadToRow(tripId, {
        source: "airtable",
        sourceRecordId: record.id,
        type,
        name: pickField(record.fields, fieldCandidates.name) || "ללא שם",
        phone: pickField(record.fields, fieldCandidates.phone),
        contactPhone: pickField(record.fields, fieldCandidates.contactPhone),
        registrationStatus: pickField(record.fields, fieldCandidates.registrationStatus),
        paymentStatus: pickField(record.fields, fieldCandidates.paymentStatus),
        parentApproval: pickField(record.fields, fieldCandidates.parentApproval),
        medicalNotes: pickField(record.fields, fieldCandidates.medicalNotes),
        role: pickField(record.fields, fieldCandidates.role),
        notes: pickField(record.fields, fieldCandidates.notes),
        raw: normalizeImportedParticipantRaw({
          ...record.fields,
          gender: pickField(record.fields, fieldCandidates.gender) || record.fields.gender,
        }),
      }),
    ),
  };
}

async function fetchRegistrationSnapshotsByIdentities(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  identities: string[],
) {
  const unique = Array.from(new Set(identities.map((identity) => normalizeIdentityNumber(identity)).filter(Boolean)));
  const snapshots = new Map<string, RegistrationSnapshot>();
  if (!unique.length) return snapshots;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, official_name, last_name, identity_number, phone, email, birth_date, department")
    .in("identity_number", unique);

  const admin = createSupabaseServiceRoleClient();
  for (const profile of profiles || []) {
    const identity = normalizeIdentityNumber(profile.identity_number);
    if (!identity) continue;
    let metadata: Record<string, unknown> = {};
    if (admin && profile.id) {
      const { data } = await admin.auth.admin.getUserById(String(profile.id));
      metadata = (data?.user?.user_metadata || {}) as Record<string, unknown>;
    }
    snapshots.set(identity, buildRegistrationSnapshotFromProfile(profile, metadata));
  }

  return snapshots;
}

async function enrichParticipantsFromRegistration(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: LocalParticipant[],
) {
  const identities = rows
    .map((row) => resolveParticipantIdentity((row.raw_data || {}) as Record<string, unknown>, row.notes))
    .filter(Boolean);
  const registrationSnapshots = await fetchRegistrationSnapshotsByIdentities(supabase, identities);
  const hints = buildRegistrationHintsMap(registrationSnapshots);
  const genderHints = buildStaffGenderHintsFromRegistration(registrationSnapshots);

  const enrichedRows = rows.map((row) => {
    const raw = { ...((row.raw_data || {}) as Record<string, unknown>) };
    const normalizedRaw = mergeRegistrationIntoRaw(raw, readRegistrationFieldsFromRaw(raw));
    const identity = resolveParticipantIdentity(normalizedRaw, row.notes);
    const registration = identity ? registrationSnapshots.get(identity) : undefined;
    const nextRaw = registration ? mergeRegistrationIntoRaw(normalizedRaw, registration) : normalizedRaw;
    if (JSON.stringify(nextRaw) === JSON.stringify(row.raw_data || {})) return row;
    return { ...row, raw_data: nextRaw };
  });

  return { rows: enrichedRows, hints, genderHints };
}

async function applyRegistrationFillOnSave(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  row: ReturnType<typeof participantPayloadToRow>,
) {
  const raw = mergeRegistrationIntoRaw({}, readRegistrationFieldsFromRaw((row.raw_data || {}) as Record<string, unknown>));
  const identity = resolveParticipantIdentity(raw, row.notes);
  if (!identity) {
    return { ...row, raw_data: raw };
  }

  const registrationSnapshots = await fetchRegistrationSnapshotsByIdentities(supabase, [identity]);
  const registration = registrationSnapshots.get(identity);
  if (!registration) {
    return { ...row, raw_data: raw };
  }

  return {
    ...row,
    raw_data: mergeRegistrationIntoRaw(raw, registration),
  };
}

const isMissingLocalSchemaError = (message?: string | null) =>
  Boolean(
    message &&
      (message.includes("trip_plan_buses") ||
        message.includes("trip_plan_groups") ||
        message.includes("trip_plan_participants") ||
        message.includes("trip_plan_assignment_sets") ||
        message.includes("trip_plan_assignment_items") ||
        message.includes("trip_plan_assignment_members")),
  );

const assignmentKindLabel = (kind: AssignmentKind, customLabel?: string | null) => {
  if (kind === "groups") return "קבוצות";
  if (kind === "buses") return "אוטובוסים";
  if (kind === "rooms") return "חדרים";
  return customLabel?.trim() || "אחר";
};

const assignmentItemPrefix = (kind: AssignmentKind) => {
  if (kind === "buses") return "אוטובוס מס׳";
  if (kind === "rooms") return "חדר מס׳";
  return "קבוצה מס׳";
};

const audienceAllows = (audience: AssignmentAudience, type: ParticipantType) =>
  audience === "both" || (audience === "participants" && type === "participant") || (audience === "staff" && type === "staff");

const rawArray = (raw: Record<string, unknown> | null | undefined, key: string) => {
  const value = raw?.[key];
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
};

const isExclusiveRequiredRole = (labels: string[]) => labels.some((label) => /חובש|רפוא|מאבטח|נשק/.test(label));

type StaffParticipantRow = {
  id: string;
  full_name?: string | null;
  role?: string | null;
  participant_type?: string | null;
  raw_data?: Record<string, unknown> | null;
};

async function mergeStaffPlaceholdersIntoParticipant(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tripId: string,
  participantId: string,
  placeholderIds: string[],
) {
  const uniquePlaceholderIds = Array.from(new Set(placeholderIds.map((value) => String(value || "").trim()).filter(Boolean)));
  if (!uniquePlaceholderIds.length) return { ok: false as const, error: "לא נבחרו תפקידים לשיוך", status: 400 as const };

  const { data: rows, error: readError } = await supabase
    .from("trip_plan_participants")
    .select("id, full_name, role, raw_data, participant_type")
    .eq("trip_id", tripId)
    .in("id", [participantId, ...uniquePlaceholderIds]);
  if (readError) return { ok: false as const, error: readError.message, status: 500 as const };

  const target = (rows || []).find((row) => row.id === participantId) as StaffParticipantRow | undefined;
  const placeholders = (rows || []).filter((row) => uniquePlaceholderIds.includes(row.id)) as StaffParticipantRow[];
  if (!target || target.participant_type !== "staff") {
    return { ok: false as const, error: "איש הצוות לא נמצא", status: 404 as const };
  }
  if (placeholders.length !== uniquePlaceholderIds.length) {
    return { ok: false as const, error: "חלק מתפקידי החובה לא נמצאו", status: 404 as const };
  }

  const mergeValidation = validateStaffRoleMerge(target, placeholders);
  if (!mergeValidation.ok) {
    return { ok: false as const, error: mergeValidation.message, status: 400 as const };
  }

  const targetRaw = (target.raw_data || {}) as Record<string, unknown>;
  let nextRoleKeys = rawArray(targetRaw, REQUIRED_STAFF_RAW.roleKeys);
  let nextRoleLabels = rawArray(targetRaw, REQUIRED_STAFF_RAW.roleLabels);

  for (const placeholder of placeholders) {
    const placeholderRaw = (placeholder.raw_data || {}) as Record<string, unknown>;
    if (!placeholderRaw[REQUIRED_STAFF_RAW.placeholder]) {
      return { ok: false as const, error: "השורה שנבחרה אינה תקן חובה חסר", status: 400 as const };
    }
    const placeholderLabels = rawArray(placeholderRaw, REQUIRED_STAFF_RAW.roleLabels);
    const targetExistingLabels = rawArray(targetRaw, REQUIRED_STAFF_RAW.roleLabels);
    const hasAnyExistingRole = targetExistingLabels.length > 0 || Boolean(String(target.role || "").trim());
    if ((hasAnyExistingRole && isExclusiveRequiredRole(placeholderLabels)) || isExclusiveRequiredRole(targetExistingLabels)) {
      return { ok: false as const, error: "חובש/מאבטח/מלווה נשק לא יכולים להתמזג עם תפקיד נוסף.", status: 403 as const };
    }
    nextRoleKeys = Array.from(new Set([...nextRoleKeys, ...rawArray(placeholderRaw, REQUIRED_STAFF_RAW.roleKeys)]));
    nextRoleLabels = Array.from(new Set([...nextRoleLabels, ...placeholderLabels]));
  }

  const updatedRaw = {
    ...targetRaw,
    [REQUIRED_STAFF_RAW.protected]: true,
    [REQUIRED_STAFF_RAW.placeholder]: false,
    [REQUIRED_STAFF_RAW.roleKeys]: nextRoleKeys,
    [REQUIRED_STAFF_RAW.roleLabels]: nextRoleLabels,
    [REQUIRED_STAFF_RAW.source]: targetRaw[REQUIRED_STAFF_RAW.source] || "approved_required_staff",
    staffRole: nextRoleLabels.join(", "),
  };
  const update = await supabase
    .from("trip_plan_participants")
    .update({
      role: nextRoleLabels.join(", "),
      raw_data: updatedRaw,
      registration_status: "תקן חובה",
      updated_at: new Date().toISOString(),
    })
    .eq("id", participantId)
    .eq("trip_id", tripId);
  if (update.error) return { ok: false as const, error: update.error.message, status: 500 as const };

  const remove = await supabase.from("trip_plan_participants").delete().in("id", uniquePlaceholderIds).eq("trip_id", tripId);
  if (remove.error) return { ok: false as const, error: remove.error.message, status: 500 as const };
  return { ok: true as const };
}

async function splitStaffRoleFromParticipant(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tripId: string,
  participantId: string,
  roleLabel: string,
) {
  const trimmedLabel = String(roleLabel || "").trim();
  if (!trimmedLabel) return { ok: false as const, error: "לא נבחר תפקיד להפרדה", status: 400 as const };

  const { data: target, error: readError } = await supabase
    .from("trip_plan_participants")
    .select("id, full_name, role, raw_data, participant_type")
    .eq("trip_id", tripId)
    .eq("id", participantId)
    .maybeSingle();
  if (readError) return { ok: false as const, error: readError.message, status: 500 as const };
  if (!target || target.participant_type !== "staff") {
    return { ok: false as const, error: "איש הצוות לא נמצא", status: 404 as const };
  }

  const targetRaw = (target.raw_data || {}) as Record<string, unknown>;
  if (targetRaw[REQUIRED_STAFF_RAW.placeholder]) {
    return { ok: false as const, error: "לא ניתן להפריד תפקיד מתקן חסר", status: 400 as const };
  }

  const roleKeys = rawArray(targetRaw, REQUIRED_STAFF_RAW.roleKeys);
  const roleLabels = rawArray(targetRaw, REQUIRED_STAFF_RAW.roleLabels);
  if (!canSplitStaffRole(roleLabels)) {
    return { ok: false as const, error: "לא ניתן להפריד — לאיש הצוות משויך תפקיד אחד בלבד", status: 400 as const };
  }

  const pairs = pairStaffRoles(roleKeys, roleLabels);
  const splitResult = removeStaffRolePair(pairs, trimmedLabel);
  if (!splitResult) return { ok: false as const, error: "התפקיד לא נמצא אצל איש הצוות", status: 404 as const };

  const placeholderRow = buildSplitPlaceholderRow({
    tripId,
    roleKey: splitResult.removed.roleKey,
    roleLabel: splitResult.removed.roleLabel,
    requiredStaffSource: String(targetRaw[REQUIRED_STAFF_RAW.source] || ""),
    notes: "הופרד מתפקיד משורת צוות",
  });
  const insert = await supabase.from("trip_plan_participants").insert(placeholderRow);
  if (insert.error) return { ok: false as const, error: insert.error.message, status: 500 as const };

  const nextStaff = buildUpdatedStaffAfterSplit({ raw: targetRaw, remaining: splitResult.remaining });
  const update = await supabase
    .from("trip_plan_participants")
    .update({
      role: nextStaff.role,
      raw_data: nextStaff.raw_data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", participantId)
    .eq("trip_id", tripId);
  if (update.error) return { ok: false as const, error: update.error.message, status: 500 as const };

  return { ok: true as const };
}

const normalizeAssignmentSets = (sets: AssignmentSetRow[], items: AssignmentItemRow[], members: AssignmentMemberRow[]) =>
  sets.map((set) => ({
    id: set.id,
    kind: set.kind,
    customKindLabel: set.custom_kind_label || "",
    audience: set.audience,
    title: set.title,
    orderIndex: set.order_index,
    items: items
      .filter((item) => item.assignment_set_id === set.id)
      .map((item) => ({
        id: item.id,
        busId: item.bus_id || null,
        name: item.name,
        orderIndex: item.order_index,
        members: members
          .filter((member) => member.assignment_item_id === item.id)
          .map((member) => ({
            id: member.id,
            participantId: member.participant_id,
          })),
      })),
  }));

async function readLocalData(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tripId: string) {
  const [participantsRes, busesRes, groupsRes, assignmentSetsRes, assignmentItemsRes, assignmentMembersRes] = await Promise.all([
    supabase
      .from("trip_plan_participants")
      .select(
        "id, trip_id, source, source_record_id, participant_type, full_name, phone, contact_phone, registration_status, payment_status, parent_approval, medical_notes, role, notes, bus_id, group_id, local_notes, raw_data",
      )
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true }),
    supabase
      .from("trip_plan_buses")
      .select("id, trip_id, name, bus_number, driver_name, driver_phone, company, capacity, leader_name, leader_phone, leader_email, notes")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true }),
    supabase.from("trip_plan_groups").select("id, trip_id, name, target_size, notes").eq("trip_id", tripId).order("created_at", { ascending: true }),
    supabase.from("trip_plan_assignment_sets").select("id, trip_id, kind, custom_kind_label, audience, title, order_index").eq("trip_id", tripId).order("order_index", { ascending: true }),
    supabase.from("trip_plan_assignment_items").select("id, trip_id, assignment_set_id, bus_id, name, order_index").eq("trip_id", tripId).order("order_index", { ascending: true }),
    supabase.from("trip_plan_assignment_members").select("id, trip_id, assignment_set_id, assignment_item_id, participant_id").eq("trip_id", tripId).order("created_at", { ascending: true }),
  ]);

  const localSchemaMissing =
    isMissingLocalSchemaError(participantsRes.error?.message) ||
    isMissingLocalSchemaError(busesRes.error?.message) ||
    isMissingLocalSchemaError(groupsRes.error?.message) ||
    isMissingLocalSchemaError(assignmentSetsRes.error?.message) ||
    isMissingLocalSchemaError(assignmentItemsRes.error?.message) ||
    isMissingLocalSchemaError(assignmentMembersRes.error?.message);

  if (!localSchemaMissing && (participantsRes.error || busesRes.error || groupsRes.error || assignmentSetsRes.error || assignmentItemsRes.error || assignmentMembersRes.error)) {
    return {
      error:
        participantsRes.error?.message ||
        busesRes.error?.message ||
        groupsRes.error?.message ||
        assignmentSetsRes.error?.message ||
        assignmentItemsRes.error?.message ||
        assignmentMembersRes.error?.message ||
        "Failed to read participants",
      localSchemaMissing,
      participants: [],
      buses: [],
      groups: [],
      assignmentSets: [],
    };
  }

  const people = (localSchemaMissing ? [] : participantsRes.data || []) as LocalParticipant[];
  const registrationEnrichment = localSchemaMissing
    ? { rows: people, hints: {} as Record<string, RegistrationSnapshot>, genderHints: {} as Record<string, StaffGender> }
    : await enrichParticipantsFromRegistration(supabase, people);

  return {
    error: null,
    localSchemaMissing,
    participants: registrationEnrichment.rows
      .filter((person) => person.participant_type === "participant")
      .map(normalizeParticipant),
    staff: registrationEnrichment.rows.filter((person) => person.participant_type === "staff").map(normalizeParticipant),
    registrationByIdentity: registrationEnrichment.hints,
    staffGenderByIdentity: registrationEnrichment.genderHints,
    buses: localSchemaMissing ? [] : busesRes.data || [],
    groups: localSchemaMissing ? [] : groupsRes.data || [],
    assignmentSets: localSchemaMissing
      ? []
      : normalizeAssignmentSets((assignmentSetsRes.data || []) as AssignmentSetRow[], (assignmentItemsRes.data || []) as AssignmentItemRow[], (assignmentMembersRes.data || []) as AssignmentMemberRow[]),
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
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
  const data = await readLocalData(supabase, id);
  if (data.error) return NextResponse.json({ error: data.error }, { status: 500 });
  return NextResponse.json({
    ok: true,
    tripDepartment: access.trip?.department || null,
    airtable: {
      configured: Boolean(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID),
      error: null,
      refreshedAt: new Date().toISOString(),
    },
    ...data,
  });
}

async function nextAssignmentSetOrder(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tripId: string) {
  const { data } = await supabase.from("trip_plan_assignment_sets").select("order_index").eq("trip_id", tripId).order("order_index", { ascending: false }).limit(1).maybeSingle();
  return Number(data?.order_index || 0) + 1;
}

async function nextAssignmentItemOrder(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tripId: string, assignmentSetId: string) {
  const { data } = await supabase
    .from("trip_plan_assignment_items")
    .select("order_index")
    .eq("trip_id", tripId)
    .eq("assignment_set_id", assignmentSetId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  return Number(data?.order_index || 0) + 1;
}

async function getAssignmentSet(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tripId: string, assignmentSetId?: string) {
  if (!assignmentSetId) return null;
  const { data } = await supabase
    .from("trip_plan_assignment_sets")
    .select("id, trip_id, kind, custom_kind_label, audience, title, order_index")
    .eq("trip_id", tripId)
    .eq("id", assignmentSetId)
    .maybeSingle();
  return (data || null) as AssignmentSetRow | null;
}

async function buildAssignmentItemName(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tripId: string,
  set: AssignmentSetRow,
  name?: string,
  busId?: string | null,
) {
  const trimmed = String(name || "").trim();
  if (trimmed) return trimmed;

  if (set.kind === "buses" && busId) {
    const { data: bus } = await supabase.from("trip_plan_buses").select("name, bus_number").eq("trip_id", tripId).eq("id", busId).maybeSingle();
    const busNumber = String(bus?.bus_number || bus?.name || "").trim();
    if (busNumber) return busNumber.startsWith("אוטובוס") ? busNumber : `אוטובוס מס׳ ${busNumber}`;
  }

  const nextOrder = await nextAssignmentItemOrder(supabase, tripId, set.id);
  return `${assignmentItemPrefix(set.kind)} ${nextOrder}`;
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
  if (!access.ok || !access.trip) return NextResponse.json({ error: access.code === 404 ? "Trip not found" : "Forbidden" }, { status: access.code });

  if (body.action === "createParticipant") {
    let row = participantPayloadToRow(id, body);
    if (!row.full_name) return NextResponse.json({ error: "שם מלא הוא שדה חובה" }, { status: 400 });
    row = await applyRegistrationFillOnSave(supabase, row);
    const { data: createdRow, error } = await supabase.from("trip_plan_participants").insert(row).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: createdRow?.id || null });
  }

  if (body.action === "updateParticipant") {
    if (!body.id) return NextResponse.json({ error: "Missing participant id" }, { status: 400 });
    const { data: existing, error: existingError } = await supabase
      .from("trip_plan_participants")
      .select("source, source_record_id, raw_data")
      .eq("id", body.id)
      .eq("trip_id", id)
      .maybeSingle();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
    let row = participantPayloadToRow(id, body);
    if (existing) {
      row.source = existing.source || row.source;
      row.source_record_id = body.sourceRecordId ?? existing.source_record_id ?? row.source_record_id;
      const existingRaw = (existing.raw_data || {}) as Record<string, unknown>;
      const nextRaw = (row.raw_data || {}) as Record<string, unknown>;
      row.raw_data = {
        ...existingRaw,
        ...nextRaw,
        ...(existingRaw[REQUIRED_STAFF_RAW.protected]
          ? {
              [REQUIRED_STAFF_RAW.protected]: existingRaw[REQUIRED_STAFF_RAW.protected],
              [REQUIRED_STAFF_RAW.roleKeys]: nextRaw[REQUIRED_STAFF_RAW.roleKeys] ?? existingRaw[REQUIRED_STAFF_RAW.roleKeys],
              [REQUIRED_STAFF_RAW.roleLabels]: nextRaw[REQUIRED_STAFF_RAW.roleLabels] ?? existingRaw[REQUIRED_STAFF_RAW.roleLabels],
              [REQUIRED_STAFF_RAW.placeholder]: nextRaw[REQUIRED_STAFF_RAW.placeholder] ?? existingRaw[REQUIRED_STAFF_RAW.placeholder],
              [REQUIRED_STAFF_RAW.source]: existingRaw[REQUIRED_STAFF_RAW.source] ?? nextRaw[REQUIRED_STAFF_RAW.source],
            }
          : {}),
      };
    }
    if (!row.full_name) return NextResponse.json({ error: "שם מלא הוא שדה חובה" }, { status: 400 });
    row = await applyRegistrationFillOnSave(supabase, row);
    const { error } = await supabase.from("trip_plan_participants").update(row).eq("id", body.id).eq("trip_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "deleteParticipant") {
    if (!body.id) return NextResponse.json({ error: "Missing participant id" }, { status: 400 });
    const { data: existing } = await supabase.from("trip_plan_participants").select("raw_data").eq("id", body.id).eq("trip_id", id).maybeSingle();
    const raw = (existing?.raw_data || {}) as Record<string, unknown>;
    if (raw[REQUIRED_STAFF_RAW.protected]) {
      return NextResponse.json({ error: "תקן צוות חובה מוגן ממחיקה. רק מחלקת מפעלים/בטיחות יכולה לשנות את מצבת המינימום." }, { status: 403 });
    }
    const { error } = await supabase.from("trip_plan_participants").delete().eq("id", body.id).eq("trip_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "upsertAssignment") {
    if (!body.recordId) return NextResponse.json({ error: "Invalid assignment payload" }, { status: 400 });
    const { error } = await supabase
      .from("trip_plan_participants")
      .update({
        bus_id: body.busId || null,
        group_id: body.groupId || null,
        local_notes: body.localNotes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.recordId)
      .eq("trip_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "assignRequiredRole") {
    if (!body.placeholderId || !body.participantId) return NextResponse.json({ error: "Missing required role assignment details" }, { status: 400 });
    const merged = await mergeStaffPlaceholdersIntoParticipant(supabase, id, body.participantId, [body.placeholderId]);
    if (!merged.ok) return NextResponse.json({ error: merged.error }, { status: merged.status });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "assignRolesToParticipant") {
    if (!body.participantId || !Array.isArray(body.placeholderIds) || !body.placeholderIds.length) {
      return NextResponse.json({ error: "Missing role merge details" }, { status: 400 });
    }
    const merged = await mergeStaffPlaceholdersIntoParticipant(supabase, id, body.participantId, body.placeholderIds);
    if (!merged.ok) return NextResponse.json({ error: merged.error }, { status: merged.status });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "splitStaffRole") {
    if (!body.participantId || !body.roleLabel) {
      return NextResponse.json({ error: "Missing staff role split details" }, { status: 400 });
    }
    const split = await splitStaffRoleFromParticipant(supabase, id, String(body.participantId), String(body.roleLabel));
    if (!split.ok) return NextResponse.json({ error: split.error }, { status: split.status });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "addStaffRoleSlot") {
    const roleKey = String(body.roleKey || "").trim() || `custom_${Date.now()}`;
    const roleLabel = String(body.roleLabel || "").trim();
    if (!roleLabel) return NextResponse.json({ error: "יש להזין שם תפקיד" }, { status: 400 });
    const { error } = await supabase.from("trip_plan_participants").insert({
      trip_id: id,
      source: "manual",
      source_record_id: `extra-role:${roleKey}:${Date.now()}`,
      participant_type: "staff",
      full_name: `תקן חסר: ${roleLabel}`,
      phone: null,
      contact_phone: null,
      registration_status: "חסר איוש",
      payment_status: null,
      parent_approval: null,
      medical_notes: null,
      role: roleLabel,
      notes: "תפקיד נוסף שהרכז הוסיף",
      raw_data: {
        [REQUIRED_STAFF_RAW.placeholder]: true,
        [REQUIRED_STAFF_RAW.roleKeys]: [roleKey],
        [REQUIRED_STAFF_RAW.roleLabels]: [roleLabel],
        [REQUIRED_STAFF_RAW.source]: "coordinator_extra_role",
        staffRole: roleLabel,
        firstName: "תקן חסר:",
        lastName: "",
      },
      updated_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "importAirtable") {
    const [participantsRes, staffRes] = await Promise.all([
      fetchAirtableTable(String(process.env.AIRTABLE_PARTICIPANTS_TABLE || ""), "participant", id, String(access.trip.name || "")),
      fetchAirtableTable(String(process.env.AIRTABLE_STAFF_TABLE || ""), "staff", id, String(access.trip.name || "")),
    ]);
    if (participantsRes.error || staffRes.error) return NextResponse.json({ error: participantsRes.error || staffRes.error }, { status: 502 });
    const rows = [...participantsRes.rows, ...staffRes.rows];
    if (rows.length > 0) {
      const { error } = await supabase.from("trip_plan_participants").upsert(rows, {
        onConflict: "trip_id,source,source_record_id",
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, imported: rows.length, airtableConfigured: participantsRes.configured || staffRes.configured });
  }

  if (body.action === "createBus") {
    const { error } = await supabase.from("trip_plan_buses").insert({
      trip_id: id,
      name: String(body.name || "אוטובוס חדש"),
      bus_number: body.busNumber || null,
      driver_name: body.driverName || null,
      driver_phone: body.driverPhone || null,
      company: body.company || null,
      capacity: body.capacity ? Number(body.capacity) : 0,
      leader_name: body.leaderName || null,
      leader_phone: body.leaderPhone || null,
      leader_email: body.leaderEmail || null,
      notes: body.notes || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "updateBus") {
    if (!body.id) return NextResponse.json({ error: "Missing bus id" }, { status: 400 });
    const { error } = await supabase
      .from("trip_plan_buses")
      .update({
        name: body.name,
        bus_number: body.busNumber || null,
        driver_name: body.driverName || null,
        driver_phone: body.driverPhone || null,
        company: body.company || null,
        capacity: body.capacity ? Number(body.capacity) : 0,
        leader_name: body.leaderName || null,
        leader_phone: body.leaderPhone || null,
        leader_email: body.leaderEmail || null,
        notes: body.notes || null,
      })
      .eq("id", body.id)
      .eq("trip_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "deleteBus") {
    if (!body.id) return NextResponse.json({ error: "Missing bus id" }, { status: 400 });
    const { error } = await supabase.from("trip_plan_buses").delete().eq("id", body.id).eq("trip_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "createGroup") {
    const { error } = await supabase.from("trip_plan_groups").insert({
      trip_id: id,
      name: String(body.name || "קבוצה חדשה"),
      target_size: Number(body.targetSize || 10),
      notes: body.notes || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "updateGroup") {
    if (!body.id) return NextResponse.json({ error: "Missing group id" }, { status: 400 });
    const { error } = await supabase
      .from("trip_plan_groups")
      .update({ name: body.name, target_size: body.targetSize, notes: body.notes })
      .eq("id", body.id)
      .eq("trip_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "deleteGroup") {
    if (!body.id) return NextResponse.json({ error: "Missing group id" }, { status: 400 });
    const { error } = await supabase.from("trip_plan_groups").delete().eq("id", body.id).eq("trip_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "createAssignmentSet") {
    const kind = body.kind;
    const audience = body.audience;
    if (!kind || !["groups", "buses", "rooms", "other"].includes(kind)) return NextResponse.json({ error: "סוג שיבוץ לא תקין" }, { status: 400 });
    if (!audience || !["participants", "staff", "both"].includes(audience)) return NextResponse.json({ error: "קהל יעד לא תקין" }, { status: 400 });
    const customKindLabel = kind === "other" ? String(body.customKindLabel || "").trim() : "";
    if (kind === "other" && !customKindLabel) return NextResponse.json({ error: "יש להזין פירוט לשיבוץ אחר" }, { status: 400 });
    const orderIndex = await nextAssignmentSetOrder(supabase, id);
    const { error } = await supabase.from("trip_plan_assignment_sets").insert({
      trip_id: id,
      kind,
      custom_kind_label: customKindLabel || null,
      audience,
      title: assignmentKindLabel(kind, customKindLabel),
      order_index: orderIndex,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "renameAssignmentSet") {
    if (!body.id) return NextResponse.json({ error: "Missing assignment set id" }, { status: 400 });
    const title = String(body.title || "").trim();
    if (!title) return NextResponse.json({ error: "שם לשונית הוא שדה חובה" }, { status: 400 });
    const { error } = await supabase.from("trip_plan_assignment_sets").update({ title, updated_at: new Date().toISOString() }).eq("id", body.id).eq("trip_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "deleteAssignmentSet") {
    if (!body.id) return NextResponse.json({ error: "Missing assignment set id" }, { status: 400 });
    const { error } = await supabase.from("trip_plan_assignment_sets").delete().eq("id", body.id).eq("trip_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "createAssignmentItem") {
    const set = await getAssignmentSet(supabase, id, body.assignmentSetId);
    if (!set) return NextResponse.json({ error: "לשונית השיבוץ לא נמצאה" }, { status: 404 });
    const busId = body.busId || null;
    if (set.kind === "buses" && busId) {
      const { data: bus } = await supabase.from("trip_plan_buses").select("id").eq("trip_id", id).eq("id", busId).maybeSingle();
      if (!bus) return NextResponse.json({ error: "האוטובוס לא נמצא" }, { status: 404 });
    }
    const orderIndex = await nextAssignmentItemOrder(supabase, id, set.id);
    const name = await buildAssignmentItemName(supabase, id, set, body.name, busId);
    const { data: item, error } = await supabase
      .from("trip_plan_assignment_items")
      .insert({
        trip_id: id,
        assignment_set_id: set.id,
        bus_id: set.kind === "buses" ? busId : null,
        name,
        order_index: orderIndex,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, itemId: item?.id });
  }

  if (body.action === "renameAssignmentItem") {
    if (!body.id) return NextResponse.json({ error: "Missing assignment item id" }, { status: 400 });
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "שם שיבוץ הוא שדה חובה" }, { status: 400 });
    const { error } = await supabase.from("trip_plan_assignment_items").update({ name, updated_at: new Date().toISOString() }).eq("id", body.id).eq("trip_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "deleteAssignmentItem") {
    if (!body.id) return NextResponse.json({ error: "Missing assignment item id" }, { status: 400 });
    const { error } = await supabase.from("trip_plan_assignment_items").delete().eq("id", body.id).eq("trip_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "assignMembersToItem") {
    const set = await getAssignmentSet(supabase, id, body.assignmentSetId);
    if (!set || !body.assignmentItemId) return NextResponse.json({ error: "פרטי השיבוץ חסרים" }, { status: 400 });
    const participantIds = Array.from(new Set((body.participantIds || []).filter(Boolean)));
    if (participantIds.length === 0) return NextResponse.json({ error: "יש לבחור לפחות משתתף אחד לשיבוץ" }, { status: 400 });
    const { data: item } = await supabase
      .from("trip_plan_assignment_items")
      .select("id, bus_id, assignment_set_id")
      .eq("trip_id", id)
      .eq("assignment_set_id", set.id)
      .eq("id", body.assignmentItemId)
      .maybeSingle();
    if (!item) return NextResponse.json({ error: "פריט השיבוץ לא נמצא" }, { status: 404 });

    const { data: people, error: peopleError } = await supabase.from("trip_plan_participants").select("id, participant_type").eq("trip_id", id).in("id", participantIds);
    if (peopleError) return NextResponse.json({ error: peopleError.message }, { status: 500 });
    if ((people || []).length !== participantIds.length) return NextResponse.json({ error: "אחד המשתתפים לא נמצא" }, { status: 404 });
    const invalidAudience = (people || []).some((person) => !audienceAllows(set.audience, person.participant_type as ParticipantType));
    if (invalidAudience) return NextResponse.json({ error: "חלק מהמסומנים לא שייכים לקהל היעד של הלשונית" }, { status: 400 });

    if (set.kind === "buses" && item.bus_id) {
      const { data: bus } = await supabase.from("trip_plan_buses").select("capacity").eq("trip_id", id).eq("id", item.bus_id).maybeSingle();
      const capacity = Number(bus?.capacity || 0);
      if (capacity > 0) {
        const { data: itemMembers, error: itemMembersError } = await supabase.from("trip_plan_assignment_members").select("participant_id").eq("trip_id", id).eq("assignment_item_id", item.id);
        if (itemMembersError) return NextResponse.json({ error: itemMembersError.message }, { status: 500 });
        const selected = new Set(participantIds);
        const existingKept = (itemMembers || []).filter((member) => !selected.has(String(member.participant_id))).length;
        const finalCount = existingKept + participantIds.length;
        if (finalCount > capacity) {
          return NextResponse.json({ error: `אי אפשר לשבץ ${finalCount} אנשים לאוטובוס עם ${capacity} מקומות.` }, { status: 400 });
        }
      }
    }

    const { error: deleteError } = await supabase.from("trip_plan_assignment_members").delete().eq("trip_id", id).eq("assignment_set_id", set.id).in("participant_id", participantIds);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
    const { error: insertError } = await supabase.from("trip_plan_assignment_members").insert(
      participantIds.map((participantId) => ({
        trip_id: id,
        assignment_set_id: set.id,
        assignment_item_id: item.id,
        participant_id: participantId,
      })),
    );
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "removeAssignmentMember") {
    let query = supabase.from("trip_plan_assignment_members").delete().eq("trip_id", id);
    if (body.memberId) query = query.eq("id", body.memberId);
    else if (body.assignmentSetId && body.participantId) query = query.eq("assignment_set_id", body.assignmentSetId).eq("participant_id", body.participantId);
    else return NextResponse.json({ error: "Missing assignment member details" }, { status: 400 });
    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
