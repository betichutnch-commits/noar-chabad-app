import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { replaceRowSafetyWithDefaultRisks } from "@/lib/eventDefaultRisks";
import { assigneePersistPayload, loadTripStaffRoster, normalizeAssigneeForPersist } from "@/lib/planStaffAssigneeServer";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { canEditTripPlan } from "@/lib/tripPlan";

type RouteContext = { params: Promise<{ id: string; rowId: string }> };
type Body = {
  day_index?: number | null;
  time_text?: string | null;
  location_text?: string | null;
  location_sensitive?: boolean;
  event_text?: string | null;
  occurrence_details?: string | null;
  staff_instructions?: string | null;
  participant_instructions?: string | null;
  notes?: string | null;
  owner_name?: string | null;
  owner_participant_id?: string | null;
  owner_role_key?: string | null;
  tasks?: Array<{
    id?: string;
    phase?: string | null;
    task_text?: string | null;
    assignee_name?: string | null;
    assignee_participant_id?: string | null;
    assignee_role_key?: string | null;
  }>;
  safety_done?: boolean | null;
  equipment_done?: boolean | null;
  prints_done?: boolean | null;
  notes_done?: boolean | null;
  details_done?: boolean | null;
  responsibilities_done?: boolean | null;
  safety?: Array<{
    id?: string;
    risk?: string | null;
    mitigation?: string | null;
    owner?: string | null;
    owner_participant_id?: string | null;
    owner_role_key?: string | null;
    risk_level_before?: number | null;
    likelihood_before?: number | null;
    risk_level_after?: number | null;
    likelihood_after?: number | null;
  }>;
  equipment?: Array<{
    id?: string;
    item?: string | null;
    quantity?: string | null;
    quantity_unit?: string | null;
    source_type?: string | null;
    source_details?: string | null;
  }>;
};

async function canEdit(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, user: User, tripId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, department, is_tech_admin")
    .eq("id", user.id)
    .single();
  const { data: trip } = await supabase.from("trips").select("id, user_id").eq("id", tripId).single();
  if (!trip) return { ok: false, code: 404 as const, trip: null };
  const ok = canEditTripPlan({ user, profile: profile || null, tripUserId: String(trip.user_id) });
  return { ok, code: ok ? 200 : (403 as const), trip };
}

const isMissingRiskScoreColumnError = (message?: string | null) =>
  Boolean(
    message &&
      (message.includes("risk_level_before") ||
        message.includes("likelihood_before") ||
        message.includes("risk_level_after") ||
        message.includes("likelihood_after")),
  );

const isMissingQuantityUnitColumnError = (message?: string | null) => Boolean(message && message.includes("quantity_unit"));
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
const isMissingParticipantRefColumnError = (message?: string | null) =>
  Boolean(
    message &&
      (message.includes("owner_participant_id") ||
        message.includes("owner_role_key") ||
        message.includes("assignee_participant_id") ||
        message.includes("assignee_role_key")),
  );

const hasSafetyContent = (item: NonNullable<Body["safety"]>[number]) =>
  Boolean(
    item.id ||
      String(item.risk || "").trim() ||
      String(item.mitigation || "").trim() ||
      String(item.owner || "").trim() ||
      item.risk_level_before != null ||
      item.likelihood_before != null ||
      item.risk_level_after != null ||
      item.likelihood_after != null,
  );

const hasEquipmentContent = (item: NonNullable<Body["equipment"]>[number]) =>
  Boolean(
    item.id ||
      String(item.item || "").trim() ||
      String(item.quantity || "").trim() ||
      String(item.quantity_unit || "").trim() ||
      String(item.source_type || "").trim() ||
      String(item.source_details || "").trim(),
  );

const VALID_TASK_PHASES = new Set(["preparation", "during", "after"]);

const hasTaskContent = (item: NonNullable<Body["tasks"]>[number]) =>
  Boolean(
    item.id ||
      String(item.task_text || "").trim() ||
      String(item.assignee_name || "").trim() ||
      item.assignee_participant_id ||
      item.assignee_role_key,
  );

const normalizeTaskPhase = (phase?: string | null) => {
  const normalized = String(phase || "").trim();
  return VALID_TASK_PHASES.has(normalized) ? normalized : "during";
};

const hasIncomingRiskScores = (item: NonNullable<Body["safety"]>[number]) =>
  item.risk_level_before != null ||
  item.likelihood_before != null ||
  item.risk_level_after != null ||
  item.likelihood_after != null;

const missingRiskScoreMigrationResponse = () =>
  NextResponse.json(
    {
      error:
        "Risk score columns are missing. Run migration 20260506_add_risk_scoring_to_trip_plan_safety.sql before saving risk scores.",
    },
    { status: 500 },
  );

const readFullRow = async (supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, rowId: string) => {
  const rowWithInstructionsRes = await supabase
    .from("trip_plan_rows")
    .select(
      "id, plan_id, order_index, day_index, time_text, location_text, event_text, occurrence_details, staff_instructions, participant_instructions, notes, owner_name, safety_done, equipment_done, prints_done, notes_done",
    )
    .eq("id", rowId)
    .single();
  const rowWithDetailsRes =
    rowWithInstructionsRes.error && isMissingInstructionsColumnError(rowWithInstructionsRes.error.message)
      ? await supabase
          .from("trip_plan_rows")
          .select(
            "id, plan_id, order_index, day_index, time_text, location_text, event_text, occurrence_details, notes, owner_name, safety_done, equipment_done, prints_done, notes_done",
          )
          .eq("id", rowId)
          .single()
      : rowWithInstructionsRes;
  const rowWithDoneRes =
    rowWithDetailsRes.error && isMissingOccurrenceDetailsColumnError(rowWithDetailsRes.error.message)
      ? await supabase
          .from("trip_plan_rows")
          .select("id, plan_id, order_index, day_index, time_text, location_text, event_text, notes, owner_name, safety_done, equipment_done, prints_done, notes_done")
          .eq("id", rowId)
          .single()
      : rowWithDetailsRes;
  const rowRes =
    rowWithDoneRes.error && isMissingDoneColumnError(rowWithDoneRes.error.message)
      ? await supabase
          .from("trip_plan_rows")
          .select("id, plan_id, order_index, day_index, time_text, location_text, event_text, notes, owner_name")
          .eq("id", rowId)
          .single()
      : rowWithDoneRes;
  if (rowRes.error || !rowRes.data) return { row: null, error: rowRes.error?.message || "Row not found" };

  const safetyWithScore = await supabase
    .from("trip_plan_row_safety")
    .select("id, row_id, order_index, risk, mitigation, owner, risk_level_before, likelihood_before, risk_level_after, likelihood_after")
    .eq("row_id", rowId)
    .order("order_index", { ascending: true });
  const safetyRes =
    safetyWithScore.error && isMissingRiskScoreColumnError(safetyWithScore.error.message)
      ? await supabase
          .from("trip_plan_row_safety")
          .select("id, row_id, order_index, risk, mitigation, owner")
          .eq("row_id", rowId)
          .order("order_index", { ascending: true })
      : safetyWithScore;

  const equipmentWithUnit = await supabase
    .from("trip_plan_row_equipment")
    .select("id, row_id, order_index, item, quantity, quantity_unit, source_type, source_details")
    .eq("row_id", rowId)
    .order("order_index", { ascending: true });
  const equipmentRes = equipmentWithUnit.error && isMissingQuantityUnitColumnError(equipmentWithUnit.error.message)
    ? await supabase
        .from("trip_plan_row_equipment")
        .select("id, row_id, order_index, item, quantity, source_type, source_details")
        .eq("row_id", rowId)
        .order("order_index", { ascending: true })
    : equipmentWithUnit;

  const printsWithStatus = await supabase
    .from("trip_plan_row_prints")
    .select("id, row_id, order_index, file_path, file_name, quantity, print_size, page_type, print_location, file_size_bytes, notes, status")
    .eq("row_id", rowId)
    .order("order_index", { ascending: true });
  const printsWithFields =
    printsWithStatus.error && String(printsWithStatus.error.message || "").match(/status/)
      ? await supabase
        .from("trip_plan_row_prints")
        .select("id, row_id, order_index, file_path, file_name, quantity, print_size, page_type, print_location, file_size_bytes, notes")
        .eq("row_id", rowId)
        .order("order_index", { ascending: true })
      : printsWithStatus;
  const printsRes =
    printsWithFields.error && String(printsWithFields.error.message || "").match(/print_size|page_type|print_location/)
      ? await supabase
          .from("trip_plan_row_prints")
          .select("id, row_id, order_index, file_path, file_name, quantity, file_size_bytes, notes")
          .eq("row_id", rowId)
          .order("order_index", { ascending: true })
      : printsWithFields;

  const tasksWithRefs = await supabase
    .from("trip_plan_row_tasks")
    .select("id, row_id, order_index, phase, task_text, assignee_name, assignee_participant_id, assignee_role_key")
    .eq("row_id", rowId)
    .order("order_index", { ascending: true });
  const tasksRes =
    tasksWithRefs.error && isMissingParticipantRefColumnError(tasksWithRefs.error.message)
      ? await supabase
          .from("trip_plan_row_tasks")
          .select("id, row_id, order_index, phase, task_text, assignee_name")
          .eq("row_id", rowId)
          .order("order_index", { ascending: true })
      : tasksWithRefs;

  if (safetyRes.error) return { row: null, error: safetyRes.error.message };
  if (equipmentRes.error) return { row: null, error: equipmentRes.error.message };
  if (printsRes.error) return { row: null, error: printsRes.error.message };

  return {
    row: {
      ...rowRes.data,
      occurrence_details: "occurrence_details" in rowRes.data ? rowRes.data.occurrence_details : null,
      staff_instructions: "staff_instructions" in rowRes.data ? rowRes.data.staff_instructions : null,
      participant_instructions: "participant_instructions" in rowRes.data ? rowRes.data.participant_instructions : null,
      safety: safetyRes.data || [],
      equipment: equipmentRes.data || [],
      prints: printsRes.data || [],
      tasks: tasksRes.error && isMissingTasksTableError(tasksRes.error.message) ? [] : tasksRes.data || [],
    },
    error: null,
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id, rowId } = await params;
  const body = (await request.json().catch(() => ({}))) as Body;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await canEdit(supabase, user as User, id);
  if (!access.ok) return NextResponse.json({ error: access.code === 404 ? "Trip not found" : "Forbidden" }, { status: access.code });

  const staffRoster = await loadTripStaffRoster(supabase, id);
  const resolvedOwner = normalizeAssigneeForPersist(
    {
      participantId: body.owner_participant_id,
      roleKey: body.owner_role_key,
      displayName: body.owner_name,
    },
    staffRoster,
  );
  const ownerPersist = assigneePersistPayload(resolvedOwner, "owner_name");

  const updatePayload = {
    day_index: body.day_index ?? null,
    time_text: body.time_text ?? null,
    location_text: body.location_text ?? null,
    location_sensitive: Boolean(body.location_sensitive),
    event_text: body.event_text ?? null,
    occurrence_details: body.occurrence_details ?? null,
    staff_instructions: body.staff_instructions ?? null,
    participant_instructions: body.participant_instructions ?? null,
    notes: body.notes ?? null,
    owner_name: ownerPersist.owner_name ?? null,
    owner_participant_id: ownerPersist.owner_participant_id ?? null,
    owner_role_key: ownerPersist.owner_role_key ?? null,
    safety_done: Boolean(body.safety_done),
    equipment_done: Boolean(body.equipment_done),
    prints_done: Boolean(body.prints_done),
    notes_done: Boolean(body.notes_done),
    details_done: Boolean(body.details_done),
    responsibilities_done: Boolean(body.responsibilities_done),
  };
  const { error: rowError } = await supabase.from("trip_plan_rows").update(updatePayload).eq("id", rowId);
  if (rowError) {
    if (isMissingInstructionsColumnError(rowError.message)) {
      const { error: retryWithoutInstructions } = await supabase
        .from("trip_plan_rows")
        .update({
          day_index: body.day_index ?? null,
          time_text: body.time_text ?? null,
          location_text: body.location_text ?? null,
          event_text: body.event_text ?? null,
          occurrence_details: body.occurrence_details ?? null,
          notes: body.notes ?? null,
          owner_name: body.owner_name ?? null,
          safety_done: Boolean(body.safety_done),
          equipment_done: Boolean(body.equipment_done),
          prints_done: Boolean(body.prints_done),
          notes_done: Boolean(body.notes_done),
          details_done: Boolean(body.details_done),
          responsibilities_done: Boolean(body.responsibilities_done),
        })
        .eq("id", rowId);
      if (retryWithoutInstructions) return NextResponse.json({ error: retryWithoutInstructions.message }, { status: 500 });
    } else if (isMissingOccurrenceDetailsColumnError(rowError.message)) {
      const { error: retryWithoutDetails } = await supabase
        .from("trip_plan_rows")
        .update({
          day_index: body.day_index ?? null,
          time_text: body.time_text ?? null,
          location_text: body.location_text ?? null,
          event_text: body.event_text ?? null,
          notes: body.notes ?? null,
          owner_name: body.owner_name ?? null,
          safety_done: Boolean(body.safety_done),
          equipment_done: Boolean(body.equipment_done),
          prints_done: Boolean(body.prints_done),
          notes_done: Boolean(body.notes_done),
          details_done: Boolean(body.details_done),
          responsibilities_done: Boolean(body.responsibilities_done),
        })
        .eq("id", rowId);
      if (retryWithoutDetails) return NextResponse.json({ error: retryWithoutDetails.message }, { status: 500 });
    } else if (!isMissingDoneColumnError(rowError.message)) {
      return NextResponse.json({ error: rowError.message }, { status: 500 });
    } else {
      const { error: retryRowError } = await supabase
        .from("trip_plan_rows")
        .update({
          day_index: body.day_index ?? null,
          time_text: body.time_text ?? null,
          location_text: body.location_text ?? null,
          event_text: body.event_text ?? null,
          notes: body.notes ?? null,
          owner_name: body.owner_name ?? null,
        })
        .eq("id", rowId);
      if (retryRowError) return NextResponse.json({ error: retryRowError.message }, { status: 500 });
    }
  }

  if (Array.isArray(body.safety)) {
    const existingSafetyWithScores = await supabase
      .from("trip_plan_row_safety")
      .select("id, order_index, risk_level_before, likelihood_before, risk_level_after, likelihood_after")
      .eq("row_id", rowId)
      .order("order_index", { ascending: true });
    const existingSafetyRes =
      existingSafetyWithScores.error && isMissingRiskScoreColumnError(existingSafetyWithScores.error.message)
        ? await supabase
            .from("trip_plan_row_safety")
            .select("id, order_index")
            .eq("row_id", rowId)
            .order("order_index", { ascending: true })
        : existingSafetyWithScores;
    const { data: existingSafety, error: existingSafetyError } = existingSafetyRes;
    if (existingSafetyError) return NextResponse.json({ error: existingSafetyError.message }, { status: 500 });

    const withScorePayload = (item: NonNullable<Body["safety"]>[number], idx: number, existing?: Record<string, unknown>) => {
      const resolvedSafetyOwner = normalizeAssigneeForPersist(
        {
          participantId: item.owner_participant_id,
          roleKey: item.owner_role_key,
          displayName: item.owner,
        },
        staffRoster,
      );
      const safetyOwnerPersist = assigneePersistPayload(resolvedSafetyOwner, "owner");
      return {
        row_id: rowId,
        order_index: idx,
        risk: item.risk ?? null,
        mitigation: item.mitigation ?? null,
        owner: safetyOwnerPersist.owner ?? null,
        owner_participant_id: safetyOwnerPersist.owner_participant_id ?? null,
        owner_role_key: safetyOwnerPersist.owner_role_key ?? null,
        risk_level_before: item.risk_level_before ?? existing?.risk_level_before ?? null,
        likelihood_before: item.likelihood_before ?? existing?.likelihood_before ?? null,
        risk_level_after: item.risk_level_after ?? existing?.risk_level_after ?? null,
        likelihood_after: item.likelihood_after ?? existing?.likelihood_after ?? null,
      };
    };
    const basePayload = (item: NonNullable<Body["safety"]>[number], idx: number) => {
      const resolvedSafetyOwner = normalizeAssigneeForPersist(
        {
          participantId: item.owner_participant_id,
          roleKey: item.owner_role_key,
          displayName: item.owner,
        },
        staffRoster,
      );
      const safetyOwnerPersist = assigneePersistPayload(resolvedSafetyOwner, "owner");
      return {
        row_id: rowId,
        order_index: idx,
        risk: item.risk ?? null,
        mitigation: item.mitigation ?? null,
        owner: safetyOwnerPersist.owner ?? null,
        owner_participant_id: safetyOwnerPersist.owner_participant_id ?? null,
        owner_role_key: safetyOwnerPersist.owner_role_key ?? null,
      };
    };

    const incomingSafety = body.safety.filter(hasSafetyContent);
    const existingSafetyById = new Map((existingSafety || []).map((item) => [String(item.id), item]));
    const usedSafetyIds = new Set<string>();

    for (const [idx, item] of incomingSafety.entries()) {
      const fallbackExisting = existingSafety?.[idx];
      const targetId = item.id && existingSafetyById.has(item.id) ? item.id : fallbackExisting?.id;
      const existingForItem = targetId ? existingSafetyById.get(String(targetId)) : fallbackExisting;
      const payload = withScorePayload(item, idx, existingForItem as Record<string, unknown> | undefined);
      if (targetId) {
        usedSafetyIds.add(String(targetId));
        const { error } = await supabase.from("trip_plan_row_safety").update(payload).eq("id", targetId).eq("row_id", rowId);
        if (error) {
          if (isMissingRiskScoreColumnError(error.message)) {
            if (hasIncomingRiskScores(item)) return missingRiskScoreMigrationResponse();
            const { error: retryError } = await supabase.from("trip_plan_row_safety").update(basePayload(item, idx)).eq("id", targetId).eq("row_id", rowId);
            if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
            continue;
          }
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        continue;
      }

      const { error } = await supabase.from("trip_plan_row_safety").insert(payload);
      if (error) {
        if (isMissingRiskScoreColumnError(error.message)) {
          if (hasIncomingRiskScores(item)) return missingRiskScoreMigrationResponse();
          const { error: retryError } = await supabase.from("trip_plan_row_safety").insert(basePayload(item, idx));
          if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
          continue;
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const safetyIdsToDelete = (existingSafety || []).map((item) => String(item.id)).filter((existingId) => !usedSafetyIds.has(existingId));
    if (safetyIdsToDelete.length > 0) {
      const { error: deleteSafetyError } = await supabase.from("trip_plan_row_safety").delete().in("id", safetyIdsToDelete);
      if (deleteSafetyError) return NextResponse.json({ error: deleteSafetyError.message }, { status: 500 });
    }
  }

  if (Array.isArray(body.equipment)) {
    const { data: existingEquipment, error: existingEquipmentError } = await supabase
      .from("trip_plan_row_equipment")
      .select("id, order_index")
      .eq("row_id", rowId)
      .order("order_index", { ascending: true });
    if (existingEquipmentError) return NextResponse.json({ error: existingEquipmentError.message }, { status: 500 });

    const withQuantityUnitPayload = (item: NonNullable<Body["equipment"]>[number], idx: number) => ({
      row_id: rowId,
      order_index: idx,
      item: item.item ?? null,
      quantity: item.quantity ?? null,
      quantity_unit: item.quantity_unit ?? null,
      source_type: item.source_type ?? null,
      source_details: item.source_details ?? null,
    });
    const baseEquipmentPayload = (item: NonNullable<Body["equipment"]>[number], idx: number) => ({
      row_id: rowId,
      order_index: idx,
      item: item.item ?? null,
      quantity: item.quantity ?? null,
      source_type: item.source_type ?? null,
      source_details: item.source_details ?? null,
    });

    const incomingEquipment = body.equipment.filter(hasEquipmentContent);
    const existingEquipmentById = new Map((existingEquipment || []).map((item) => [String(item.id), item]));
    const usedEquipmentIds = new Set<string>();

    for (const [idx, item] of incomingEquipment.entries()) {
      const fallbackExisting = existingEquipment?.[idx];
      const targetId = item.id && existingEquipmentById.has(item.id) ? item.id : fallbackExisting?.id;
      const payload = withQuantityUnitPayload(item, idx);
      if (targetId) {
        usedEquipmentIds.add(String(targetId));
        const { error } = await supabase.from("trip_plan_row_equipment").update(payload).eq("id", targetId).eq("row_id", rowId);
        if (error) {
          if (isMissingQuantityUnitColumnError(error.message)) {
            const { error: retryError } = await supabase
              .from("trip_plan_row_equipment")
              .update(baseEquipmentPayload(item, idx))
              .eq("id", targetId)
              .eq("row_id", rowId);
            if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
            continue;
          }
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        continue;
      }

      const { error } = await supabase.from("trip_plan_row_equipment").insert(payload);
      if (error) {
        if (isMissingQuantityUnitColumnError(error.message)) {
          const { error: retryError } = await supabase.from("trip_plan_row_equipment").insert(baseEquipmentPayload(item, idx));
          if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
          continue;
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const equipmentIdsToDelete = (existingEquipment || []).map((item) => String(item.id)).filter((existingId) => !usedEquipmentIds.has(existingId));
    if (equipmentIdsToDelete.length > 0) {
      const { error: deleteEquipmentError } = await supabase.from("trip_plan_row_equipment").delete().in("id", equipmentIdsToDelete);
      if (deleteEquipmentError) return NextResponse.json({ error: deleteEquipmentError.message }, { status: 500 });
    }
  }

  if (Array.isArray(body.tasks)) {
    const { data: existingTasks, error: existingTasksError } = await supabase
      .from("trip_plan_row_tasks")
      .select("id, order_index")
      .eq("row_id", rowId)
      .order("order_index", { ascending: true });
    if (existingTasksError) {
      if (!isMissingTasksTableError(existingTasksError.message)) {
        return NextResponse.json({ error: existingTasksError.message }, { status: 500 });
      }
    } else {
      const taskPayload = (item: NonNullable<Body["tasks"]>[number], idx: number) => {
        const resolvedTaskAssignee = normalizeAssigneeForPersist(
          {
            participantId: item.assignee_participant_id,
            roleKey: item.assignee_role_key,
            displayName: item.assignee_name,
          },
          staffRoster,
        );
        const taskAssigneePersist = assigneePersistPayload(resolvedTaskAssignee, "assignee_name");
        return {
          row_id: rowId,
          order_index: idx,
          phase: normalizeTaskPhase(item.phase),
          task_text: String(item.task_text || "").trim(),
          assignee_name: taskAssigneePersist.assignee_name ?? null,
          assignee_participant_id: taskAssigneePersist.assignee_participant_id ?? null,
          assignee_role_key: taskAssigneePersist.assignee_role_key ?? null,
        };
      };

      const incomingTasks = body.tasks.filter(hasTaskContent);
      const existingTasksById = new Map((existingTasks || []).map((item) => [String(item.id), item]));
      const usedTaskIds = new Set<string>();

      for (const [idx, item] of incomingTasks.entries()) {
        const fallbackExisting = existingTasks?.[idx];
        const targetId = item.id && existingTasksById.has(item.id) ? item.id : fallbackExisting?.id;
        const payload = taskPayload(item, idx);
        if (targetId) {
          usedTaskIds.add(String(targetId));
          const { error } = await supabase.from("trip_plan_row_tasks").update(payload).eq("id", targetId).eq("row_id", rowId);
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          continue;
        }
        const { error } = await supabase.from("trip_plan_row_tasks").insert(payload);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const taskIdsToDelete = (existingTasks || []).map((item) => String(item.id)).filter((existingId) => !usedTaskIds.has(existingId));
      if (taskIdsToDelete.length > 0) {
        const { error: deleteTasksError } = await supabase.from("trip_plan_row_tasks").delete().in("id", taskIdsToDelete);
        if (deleteTasksError) return NextResponse.json({ error: deleteTasksError.message }, { status: 500 });
      }
    }
  }

  const normalizedEventText = String(body.event_text || "").trim();
  if (normalizedEventText) {
    try {
      await replaceRowSafetyWithDefaultRisks(supabase, rowId, normalizedEventText);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to apply default risks" }, { status: 500 });
    }
  }

  const updated = await readFullRow(supabase, rowId);
  if (updated.error) return NextResponse.json({ error: updated.error }, { status: 500 });
  return NextResponse.json({ ok: true, row: updated.row });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id, rowId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await canEdit(supabase, user as User, id);
  if (!access.ok) return NextResponse.json({ error: access.code === 404 ? "Trip not found" : "Forbidden" }, { status: access.code });

  const rowRes = await supabase.from("trip_plan_rows").select("plan_id, order_index").eq("id", rowId).single();
  if (rowRes.error || !rowRes.data) return NextResponse.json({ error: "Row not found" }, { status: 404 });
  const { plan_id: planId, order_index: deletedOrder } = rowRes.data;

  const { error: deleteError } = await supabase.from("trip_plan_rows").delete().eq("id", rowId);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  const { data: rowsAfter } = await supabase
    .from("trip_plan_rows")
    .select("id, order_index")
    .eq("plan_id", planId)
    .gt("order_index", deletedOrder)
    .order("order_index", { ascending: true });
  for (const row of rowsAfter || []) {
    await supabase.from("trip_plan_rows").update({ order_index: row.order_index - 1 }).eq("id", row.id);
  }

  return NextResponse.json({ ok: true });
}
