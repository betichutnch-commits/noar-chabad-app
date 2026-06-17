import {
  buildStaffRoster,
  resolveStaffAssigneeFromFields,
  staffAssigneeDisplayName,
  type StaffAssigneeValue,
  type StaffParticipantLike,
  type StaffRosterEntry,
} from "@/lib/staffRoster";

type SupabaseLike = {
  from: (table: string) => {
    select: (columns?: string) => unknown;
  };
};

type QueryResult<T> = PromiseLike<{ data: T | null; error: { message?: string } | null }>;

const textValue = (value: unknown) => String(value ?? "").trim();

export async function loadTripStaffRoster(supabase: SupabaseLike, tripId: string): Promise<StaffRosterEntry[]> {
  const staffQuery = supabase.from("trip_plan_participants").select("id, full_name, role, raw_data, participant_type") as {
    eq: (column: string, value: string) => QueryResult<Array<Record<string, unknown>>>;
  };
  const staffRes = await staffQuery.eq("trip_id", tripId);
  if (staffRes.error) return [];
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
  return buildStaffRoster(staff);
}

export function normalizeAssigneeForPersist(
  input: {
    participantId?: string | null;
    roleKey?: string | null;
    displayName?: string | null;
  },
  roster: StaffRosterEntry[],
): StaffAssigneeValue {
  return resolveStaffAssigneeFromFields({
    participantId: input.participantId,
    roleKey: input.roleKey,
    displayName: input.displayName,
    roster,
  });
}

export function assigneePersistPayload(
  resolved: StaffAssigneeValue,
  nameColumn: "owner_name" | "assignee_name" | "owner",
): Record<string, string | null> {
  const displayName = staffAssigneeDisplayName(resolved) || null;
  if (nameColumn === "owner_name") {
    return {
      owner_name: displayName,
      owner_participant_id: resolved.participantId ?? null,
      owner_role_key: resolved.roleKey ?? null,
    };
  }
  if (nameColumn === "assignee_name") {
    return {
      assignee_name: displayName,
      assignee_participant_id: resolved.participantId ?? null,
      assignee_role_key: resolved.roleKey ?? null,
    };
  }
  return {
    owner: displayName,
    owner_participant_id: resolved.participantId ?? null,
    owner_role_key: resolved.roleKey ?? null,
  };
}
