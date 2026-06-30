import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { canEditTripPlan } from "@/lib/tripPlan";

type RouteContext = { params: Promise<{ id: string }> };
const isMissingDoneColumnError = (message?: string | null) =>
  Boolean(
    message &&
      (message.includes("safety_done") ||
        message.includes("equipment_done") ||
        message.includes("prints_done") ||
        message.includes("notes_done") ||
        message.includes("details_done") ||
        message.includes("responsibilities_done")),
  );
const isMissingOccurrenceDetailsColumnError = (message?: string | null) => Boolean(message && message.includes("occurrence_details"));
const isMissingInstructionsColumnError = (message?: string | null) =>
  Boolean(message && (message.includes("staff_instructions") || message.includes("participant_instructions")));
const isMissingTasksTableError = (message?: string | null) => Boolean(message && message.includes("trip_plan_row_tasks"));
const isMissingDesignsTableError = (message?: string | null) =>
  Boolean(message && (message.includes("trip_plan_row_designs") || message.includes("design_id")));
const isMissingParticipantRefColumnError = (message?: string | null) =>
  Boolean(
    message &&
      (message.includes("owner_participant_id") ||
        message.includes("owner_role_key") ||
        message.includes("assignee_participant_id") ||
        message.includes("assignee_role_key")),
  );

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
    .select("id, user_id, name, branch, department, coordinator_name, details, start_date")
    .eq("id", id)
    .single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  if (!canEditTripPlan({ user: user as User, profile: profile || null, tripUserId: String(trip.user_id) })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: plan } = await supabase.from("trip_plans").select("id, trip_id, updated_at").eq("trip_id", id).maybeSingle();
  if (!plan) {
    return NextResponse.json({ ok: true, trip, plan: null, rows: [] });
  }

  const rowsWithDetails = await supabase
    .from("trip_plan_rows")
    .select(
      "id, plan_id, order_index, day_index, time_text, location_text, location_sensitive, event_text, occurrence_details, staff_instructions, participant_instructions, notes, owner_name, owner_participant_id, owner_role_key, safety_done, equipment_done, prints_done, notes_done, details_done, responsibilities_done",
    )
    .eq("plan_id", plan.id)
    .order("order_index", { ascending: true });
  const rowsWithoutInstructions =
    rowsWithDetails.error && isMissingInstructionsColumnError(rowsWithDetails.error.message)
      ? await supabase
          .from("trip_plan_rows")
          .select(
            "id, plan_id, order_index, day_index, time_text, location_text, event_text, occurrence_details, notes, owner_name, safety_done, equipment_done, prints_done, notes_done",
          )
          .eq("plan_id", plan.id)
          .order("order_index", { ascending: true })
      : rowsWithDetails;
  const rowsWithDone =
    rowsWithoutInstructions.error && isMissingOccurrenceDetailsColumnError(rowsWithoutInstructions.error.message)
      ? await supabase
          .from("trip_plan_rows")
          .select("id, plan_id, order_index, day_index, time_text, location_text, event_text, notes, owner_name, safety_done, equipment_done, prints_done, notes_done")
          .eq("plan_id", plan.id)
          .order("order_index", { ascending: true })
      : rowsWithoutInstructions;
  const rowsRes =
    rowsWithDone.error && isMissingDoneColumnError(rowsWithDone.error.message)
      ? await supabase
          .from("trip_plan_rows")
          .select("id, plan_id, order_index, day_index, time_text, location_text, event_text, notes, owner_name")
          .eq("plan_id", plan.id)
          .order("order_index", { ascending: true })
      : rowsWithDone;
  if (rowsRes.error) return NextResponse.json({ error: rowsRes.error.message }, { status: 500 });
  const rows = rowsRes.data || [];
  const rowIds = (rows || []).map((r) => r.id);

  const fetchEquipment = async () => {
    if (!rowIds.length) return { data: [] as unknown[] };
    const withUnit = await supabase
      .from("trip_plan_row_equipment")
      .select("id, row_id, order_index, item, quantity, quantity_unit, source_type, source_details")
      .in("row_id", rowIds)
      .order("order_index", { ascending: true });
    if (!withUnit.error) return withUnit;
    if (!String(withUnit.error.message || "").includes("quantity_unit")) return withUnit;
    return supabase
      .from("trip_plan_row_equipment")
      .select("id, row_id, order_index, item, quantity, source_type, source_details")
      .in("row_id", rowIds)
      .order("order_index", { ascending: true });
  };

  const fetchPrints = async () => {
    if (!rowIds.length) return { data: [] as unknown[] };
    const withDesign = await supabase
      .from("trip_plan_row_prints")
      .select("id, row_id, order_index, file_path, file_name, quantity, print_size, page_type, print_location, file_size_bytes, notes, status, design_id")
      .in("row_id", rowIds)
      .order("order_index", { ascending: true });
    if (!withDesign.error) return withDesign;
    if (!String(withDesign.error.message || "").match(/design_id/)) {
      const withStatus = await supabase
        .from("trip_plan_row_prints")
        .select("id, row_id, order_index, file_path, file_name, quantity, print_size, page_type, print_location, file_size_bytes, notes, status")
        .in("row_id", rowIds)
        .order("order_index", { ascending: true });
      if (!withStatus.error) return withStatus;
      if (!String(withStatus.error.message || "").match(/status/)) return withStatus;
    }
    const withPrintFields = await supabase
      .from("trip_plan_row_prints")
      .select("id, row_id, order_index, file_path, file_name, quantity, print_size, page_type, print_location, file_size_bytes, notes")
      .in("row_id", rowIds)
      .order("order_index", { ascending: true });
    if (!withPrintFields.error) return withPrintFields;
    if (!String(withPrintFields.error.message || "").match(/print_size|page_type|print_location/)) return withPrintFields;
    return supabase
      .from("trip_plan_row_prints")
      .select("id, row_id, order_index, file_path, file_name, quantity, file_size_bytes, notes")
      .in("row_id", rowIds)
      .order("order_index", { ascending: true });
  };

  const fetchDesigns = async () => {
    if (!rowIds.length) return { data: [] as unknown[], schemaMissing: false };
    const res = await supabase
      .from("trip_plan_row_designs")
      .select(
        "id, row_id, order_index, document_name, designer_name, size_settings, notes, content_mode, document_text, designer_instructions, brief_file_path, brief_file_name, output_file_path, output_file_name, status",
      )
      .in("row_id", rowIds)
      .order("order_index", { ascending: true });
    if (!res.error) return { data: res.data || [], schemaMissing: false };
    if (isMissingDesignsTableError(res.error.message)) {
      return { data: [] as unknown[], schemaMissing: true };
    }
    return { data: [] as unknown[], schemaMissing: false };
  };

  const fetchSafety = async () => {
    if (!rowIds.length) return { data: [] as unknown[] };
    const withRefs = await supabase
      .from("trip_plan_row_safety")
      .select(
        "id, row_id, order_index, risk, mitigation, owner, owner_participant_id, owner_role_key, risk_level_before, likelihood_before, risk_level_after, likelihood_after",
      )
      .in("row_id", rowIds)
      .order("order_index", { ascending: true });
    if (!withRefs.error) return withRefs;
    if (isMissingParticipantRefColumnError(withRefs.error.message)) {
      const withScore = await supabase
        .from("trip_plan_row_safety")
        .select("id, row_id, order_index, risk, mitigation, owner, risk_level_before, likelihood_before, risk_level_after, likelihood_after")
        .in("row_id", rowIds)
        .order("order_index", { ascending: true });
      if (!withScore.error) return withScore;
    }
    if (!String(withRefs.error.message || "").match(/risk_level_before|likelihood_before|risk_level_after|likelihood_after/)) {
      return withRefs;
    }
    return supabase
      .from("trip_plan_row_safety")
      .select("id, row_id, order_index, risk, mitigation, owner")
      .in("row_id", rowIds)
      .order("order_index", { ascending: true });
  };

  const fetchTasks = async () => {
    if (!rowIds.length) return { data: [] as unknown[], schemaMissing: false };
    const withRefs = await supabase
      .from("trip_plan_row_tasks")
      .select("id, row_id, order_index, phase, task_text, assignee_name, assignee_participant_id, assignee_role_key")
      .in("row_id", rowIds)
      .order("order_index", { ascending: true });
    if (!withRefs.error) return { data: withRefs.data || [], schemaMissing: false };
    if (isMissingTasksTableError(withRefs.error.message)) {
      return { data: [] as unknown[], schemaMissing: true };
    }
    const res = await supabase
      .from("trip_plan_row_tasks")
      .select("id, row_id, order_index, phase, task_text, assignee_name")
      .in("row_id", rowIds)
      .order("order_index", { ascending: true });
    return { data: res.data || [], schemaMissing: false };
  };

  const [safetyRes, equipmentRes, printsRes, designsRes, tasksRes] = await Promise.all([
    fetchSafety(),
    fetchEquipment(),
    fetchPrints(),
    fetchDesigns(),
    fetchTasks(),
  ]);

  const safety = (safetyRes.data || []) as Array<Record<string, unknown>>;
  const equipment = (equipmentRes.data || []) as Array<Record<string, unknown>>;
  const prints = (printsRes.data || []) as Array<Record<string, unknown>>;
  const designs = (designsRes.data || []) as Array<Record<string, unknown>>;
  const tasks = (tasksRes.data || []) as Array<Record<string, unknown>>;
  const byRow = new Map<string, { safety: unknown[]; equipment: unknown[]; prints: unknown[]; designs: unknown[]; tasks: unknown[] }>();
  for (const row of rows || []) byRow.set(String(row.id), { safety: [], equipment: [], prints: [], designs: [], tasks: [] });
  for (const item of safety) byRow.get(String(item.row_id))?.safety.push(item);
  for (const item of equipment) byRow.get(String(item.row_id))?.equipment.push(item);
  for (const item of prints) byRow.get(String(item.row_id))?.prints.push(item);
  for (const item of designs) byRow.get(String(item.row_id))?.designs.push(item);
  for (const item of tasks) byRow.get(String(item.row_id))?.tasks.push(item);

  const occurrenceDetailsSchemaMissing = Boolean(
    rowsWithDetails.error && isMissingOccurrenceDetailsColumnError(rowsWithDetails.error.message),
  );
  const instructionsSchemaMissing = Boolean(
    rowsWithDetails.error && isMissingInstructionsColumnError(rowsWithDetails.error.message),
  );

  const mergedRows = (rows || []).map((row) => ({
    ...row,
    occurrence_details: "occurrence_details" in row ? row.occurrence_details : null,
    staff_instructions: "staff_instructions" in row ? row.staff_instructions : null,
    participant_instructions: "participant_instructions" in row ? row.participant_instructions : null,
    safety: byRow.get(String(row.id))?.safety || [],
    equipment: byRow.get(String(row.id))?.equipment || [],
    prints: byRow.get(String(row.id))?.prints || [],
    designs: byRow.get(String(row.id))?.designs || [],
    tasks: byRow.get(String(row.id))?.tasks || [],
  }));

  return NextResponse.json({
    ok: true,
    trip,
    plan,
    rows: mergedRows,
    schemaMissing: {
      occurrenceDetails: occurrenceDetailsSchemaMissing,
      instructions: instructionsSchemaMissing,
      tasks: tasksRes.schemaMissing,
      designs: designsRes.schemaMissing,
    },
  });
}
