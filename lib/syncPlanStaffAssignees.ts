import {
  buildPlanningRoleOptions,
  buildStaffRoster,
  resolveStaffAssigneeFromText,
  staffAssigneeDisplayName,
  type StaffParticipantLike,
} from "@/lib/staffRoster";
import type { RequiredStaffPlanRow } from "@/lib/tripRequiredRoles";

type SupabaseLike = {
  from: (table: string) => {
    select: (columns?: string) => unknown;
    update: (values: unknown) => unknown;
  };
};

type QueryResult<T> = PromiseLike<{ data: T | null; error: { message?: string } | null }>;

const textValue = (value: unknown) => String(value ?? "").trim();

const isMissingParticipantRefColumn = (message?: string | null) =>
  Boolean(
    message &&
      (message.includes("owner_participant_id") ||
        message.includes("owner_role_key") ||
        message.includes("assignee_participant_id") ||
        message.includes("assignee_role_key")),
  );

export async function syncPlanAssigneesToStaffRoster(
  supabase: SupabaseLike,
  tripId: string,
  approvedRows: RequiredStaffPlanRow[] = [],
) {
  const planningRoles = buildPlanningRoleOptions(approvedRows);

  const staffQuery = supabase.from("trip_plan_participants").select("id, full_name, role, raw_data, participant_type") as {
    eq: (column: string, value: string) => QueryResult<Array<Record<string, unknown>>>;
  };
  const staffRes = await staffQuery.eq("trip_id", tripId);
  if (staffRes.error) throw new Error(staffRes.error.message || "Failed to load staff roster");

  const staff = (staffRes.data || [])
    .filter((row) => textValue(row.participant_type) === "staff")
    .map(
      (row): StaffParticipantLike => ({
        id: String(row.id),
        full_name: textValue(row.full_name),
        role: textValue(row.role),
        raw_data: (row.raw_data || {}) as Record<string, unknown>,
      }),
    );
  const roster = buildStaffRoster(staff);
  if (!roster.length) return { updatedRows: 0, updatedTasks: 0, updatedSafety: 0 };

  const planQuery = supabase.from("trip_plans").select("id") as {
    eq: (column: string, value: string) => { maybeSingle: () => QueryResult<{ id: string }> };
  };
  const planRes = await planQuery.eq("trip_id", tripId).maybeSingle();
  if (planRes.error || !planRes.data?.id) return { updatedRows: 0, updatedTasks: 0, updatedSafety: 0 };
  const planId = planRes.data.id;

  const rowsQuery = supabase.from("trip_plan_rows").select("id, owner_name, owner_participant_id, owner_role_key") as {
    eq: (column: string, value: string) => QueryResult<Array<Record<string, unknown>>>;
  };
  const rowsRes = await rowsQuery.eq("plan_id", planId);
  if (rowsRes.error) {
    if (isMissingParticipantRefColumn(rowsRes.error.message)) {
      return { updatedRows: 0, updatedTasks: 0, updatedSafety: 0 };
    }
    throw new Error(rowsRes.error.message || "Failed to load plan rows");
  }

  let updatedRows = 0;
  let updatedTasks = 0;
  let updatedSafety = 0;

  for (const row of rowsRes.data || []) {
    const rowId = String(row.id);
    const ownerText = textValue(row.owner_name);
    if (ownerText && !row.owner_participant_id && !row.owner_role_key) {
      const resolved = resolveStaffAssigneeFromText(ownerText, roster, planningRoles);
      const updateQuery = supabase.from("trip_plan_rows").update({
        owner_participant_id: resolved.participantId,
        owner_role_key: resolved.roleKey,
        owner_name: staffAssigneeDisplayName(resolved) || ownerText,
      }) as { eq: (column: string, value: string) => QueryResult<unknown> };
      const updateRes = await updateQuery.eq("id", rowId);
      if (!updateRes.error) updatedRows += 1;
    }

    const tasksQuery = supabase
      .from("trip_plan_row_tasks")
      .select("id, assignee_name, assignee_participant_id, assignee_role_key") as {
      eq: (column: string, value: string) => QueryResult<Array<Record<string, unknown>>>;
    };
    const tasksRes = await tasksQuery.eq("row_id", rowId);
    if (!tasksRes.error) {
      for (const task of tasksRes.data || []) {
        const assigneeText = textValue(task.assignee_name);
        if (!assigneeText || task.assignee_participant_id || task.assignee_role_key) continue;
        const resolved = resolveStaffAssigneeFromText(assigneeText, roster, planningRoles);
        const updateQuery = supabase.from("trip_plan_row_tasks").update({
          assignee_participant_id: resolved.participantId,
          assignee_role_key: resolved.roleKey,
          assignee_name: staffAssigneeDisplayName(resolved) || assigneeText,
        }) as { eq: (column: string, value: string) => QueryResult<unknown> };
        const updateRes = await updateQuery.eq("id", String(task.id));
        if (!updateRes.error) updatedTasks += 1;
      }
    }

    const safetyQuery = supabase
      .from("trip_plan_row_safety")
      .select("id, owner, owner_participant_id, owner_role_key") as {
      eq: (column: string, value: string) => QueryResult<Array<Record<string, unknown>>>;
    };
    const safetyRes = await safetyQuery.eq("row_id", rowId);
    if (!safetyRes.error) {
      for (const safety of safetyRes.data || []) {
        const ownerText = textValue(safety.owner);
        if (!ownerText || safety.owner_participant_id || safety.owner_role_key) continue;
        const resolved = resolveStaffAssigneeFromText(ownerText, roster, planningRoles);
        const updateQuery = supabase.from("trip_plan_row_safety").update({
          owner_participant_id: resolved.participantId,
          owner_role_key: resolved.roleKey,
          owner: staffAssigneeDisplayName(resolved) || ownerText,
        }) as { eq: (column: string, value: string) => QueryResult<unknown> };
        const updateRes = await updateQuery.eq("id", String(safety.id));
        if (!updateRes.error) updatedSafety += 1;
      }
    }
  }

  return { updatedRows, updatedTasks, updatedSafety };
}
