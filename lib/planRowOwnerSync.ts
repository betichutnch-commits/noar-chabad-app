import type { PlanRowTask } from "@/lib/planRowTasks";
import { staffAssigneeDisplayName, type StaffAssigneeValue } from "@/lib/staffRoster";

export type PlanRowOwnerFields = {
  owner_name?: string | null;
  owner_participant_id?: string | null;
  owner_role_key?: string | null;
  safety?: Array<{
    owner?: string | null;
    owner_participant_id?: string | null;
    owner_role_key?: string | null;
    risk?: string | null;
    mitigation?: string | null;
  }>;
  tasks?: PlanRowTask[];
};

const emptySafetyRow = () => ({
  risk: "",
  mitigation: "",
  owner: "",
  owner_participant_id: null as string | null,
  owner_role_key: null as string | null,
});

export function syncRowOwnerFields<T extends PlanRowOwnerFields>(row: T, assignee: StaffAssigneeValue | string): T {
  const resolved: StaffAssigneeValue =
    typeof assignee === "string"
      ? { participantId: null, roleKey: null, displayName: assignee }
      : assignee;
  const displayName = staffAssigneeDisplayName(resolved);
  const safety = (row.safety?.length ? row.safety : [emptySafetyRow()]).map((item) => ({
    ...item,
    owner: displayName,
    owner_participant_id: resolved.participantId ?? null,
    owner_role_key: resolved.roleKey ?? null,
  }));
  const tasks = (row.tasks || []).map((task) => {
    const hasAssignee =
      Boolean(String(task.assignee_name || "").trim()) ||
      Boolean(task.assignee_participant_id) ||
      Boolean(task.assignee_role_key);
    if (hasAssignee) return task;
    return {
      ...task,
      assignee_name: displayName || null,
      assignee_participant_id: resolved.participantId ?? null,
      assignee_role_key: resolved.roleKey ?? null,
    };
  });
  return {
    ...row,
    owner_name: displayName,
    owner_participant_id: resolved.participantId ?? null,
    owner_role_key: resolved.roleKey ?? null,
    safety,
    tasks,
  };
}
