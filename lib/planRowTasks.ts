export type TaskPhase = "preparation" | "during" | "after";

export const TASK_PHASES: TaskPhase[] = ["preparation", "during", "after"];

export const TASK_PHASE_LABELS: Record<TaskPhase, string> = {
  preparation: "בהיערכות",
  during: "בשעת מעשה",
  after: "אחר מעשה",
};

export type PlanRowTask = {
  id?: string;
  phase: TaskPhase;
  task_text: string;
  assignee_name?: string | null;
  assignee_participant_id?: string | null;
  assignee_role_key?: string | null;
};

export const normalizeTaskPhase = (phase?: string | null): TaskPhase => {
  const normalized = String(phase || "").trim();
  if (normalized === "preparation" || normalized === "after") return normalized;
  return "during";
};

export const normalizePlanRowTasks = (tasks: Array<Partial<PlanRowTask>> | undefined | null): PlanRowTask[] =>
  (tasks || []).map((task) => ({
    id: task.id,
    phase: normalizeTaskPhase(task.phase),
    task_text: String(task.task_text || ""),
    assignee_name: task.assignee_name ?? null,
    assignee_participant_id: task.assignee_participant_id ?? null,
    assignee_role_key: task.assignee_role_key ?? null,
  }));
