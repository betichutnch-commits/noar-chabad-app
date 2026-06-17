import { TASK_PHASES, TASK_PHASE_LABELS, type PlanRowTask, type TaskPhase } from "@/lib/planRowTasks";

export type PlanRowForAssigneeBoard = {
  id: string;
  order_index: number;
  day_index?: number | null;
  time_text?: string | null;
  location_text?: string | null;
  event_text?: string | null;
  owner_name?: string | null;
  tasks?: PlanRowTask[];
  safety?: Array<{
    owner?: string | null;
    risk?: string | null;
    mitigation?: string | null;
  }>;
};

export type AssigneeTaskEntry = {
  rowId: string;
  orderIndex: number;
  dayIndex: number;
  phase: TaskPhase;
  taskText: string;
  stageLabel: string;
};

export type AssigneeBoard = {
  name: string;
  phases: Record<TaskPhase, AssigneeTaskEntry[]>;
  totalCount: number;
};

export type DayDisplayParts = { greg: string; heb: string };

const compareEntries = (a: AssigneeTaskEntry, b: AssigneeTaskEntry) =>
  a.dayIndex - b.dayIndex ||
  a.orderIndex - b.orderIndex ||
  String(a.stageLabel).localeCompare(String(b.stageLabel), "he") ||
  a.taskText.localeCompare(b.taskText, "he");

export function buildTripStageLabel(
  row: PlanRowForAssigneeBoard,
  formatDay?: (dayIndex: number) => DayDisplayParts,
): string {
  const dayIndex = row.day_index ?? row.order_index + 1;
  const day = formatDay?.(dayIndex);
  const dayPart = day?.greg ? `יום ${dayIndex} (${day.greg})` : `יום ${dayIndex}`;
  const parts = [dayPart, row.time_text, row.event_text || row.location_text]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return parts.join(" · ");
}

const pushAssigneeEntry = (
  byName: Map<string, AssigneeTaskEntry[]>,
  assignee: string,
  entry: AssigneeTaskEntry,
) => {
  const list = byName.get(assignee) || [];
  list.push(entry);
  byName.set(assignee, list);
};

export function buildAssigneeBoards(
  rows: PlanRowForAssigneeBoard[],
  formatDay?: (dayIndex: number) => DayDisplayParts,
): AssigneeBoard[] {
  const byName = new Map<string, AssigneeTaskEntry[]>();

  for (const row of rows) {
    const stageLabel = buildTripStageLabel(row, formatDay);
    const dayIndex = row.day_index ?? row.order_index + 1;
    const rowHasNamedEntry = new Set<string>();

    for (const task of row.tasks || []) {
      const assignee = String(task.assignee_name || "").trim();
      const taskText = String(task.task_text || "").trim();
      if (!assignee || !taskText) continue;
      rowHasNamedEntry.add(assignee);
      pushAssigneeEntry(byName, assignee, {
        rowId: row.id,
        orderIndex: row.order_index,
        dayIndex,
        phase: task.phase,
        taskText,
        stageLabel,
      });
    }

    for (const safety of row.safety || []) {
      const assignee = String(safety.owner || "").trim();
      const risk = String(safety.risk || "").trim();
      if (!assignee || !risk) continue;
      rowHasNamedEntry.add(assignee);
      const mitigation = String(safety.mitigation || "").trim();
      pushAssigneeEntry(byName, assignee, {
        rowId: row.id,
        orderIndex: row.order_index,
        dayIndex,
        phase: "during",
        taskText: mitigation ? `${risk} · ${mitigation}` : risk,
        stageLabel,
      });
    }

    const rowOwner = String(row.owner_name || "").trim();
    if (rowOwner && !rowHasNamedEntry.has(rowOwner)) {
      const fallbackText = String(row.event_text || row.location_text || "").trim() || "אחריות כללי לשורה";
      pushAssigneeEntry(byName, rowOwner, {
        rowId: row.id,
        orderIndex: row.order_index,
        dayIndex,
        phase: "during",
        taskText: fallbackText,
        stageLabel,
      });
    }
  }

  return [...byName.entries()]
    .map(([name, entries]) => {
      const phases = TASK_PHASES.reduce(
        (acc, phase) => {
          acc[phase] = entries.filter((entry) => entry.phase === phase).sort(compareEntries);
          return acc;
        },
        {} as Record<TaskPhase, AssigneeTaskEntry[]>,
      );
      return {
        name,
        phases,
        totalCount: entries.length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "he"));
}

export function filterBoardsForTripLeader(boards: AssigneeBoard[], coordinatorName?: string | null) {
  const key = String(coordinatorName || "").trim().replace(/\s+/g, " ");
  if (!key) return [];
  return boards.filter((board) => board.name.trim().replace(/\s+/g, " ") === key);
}

export function countAssigneeTasks(rows: PlanRowForAssigneeBoard[]) {
  return buildAssigneeBoards(rows).reduce((sum, board) => sum + board.totalCount, 0);
}

export function allResponsibilitiesColumnsDone(
  rows: Array<{ responsibilities_done?: boolean | null }>,
) {
  return rows.length > 0 && rows.every((row) => Boolean(row.responsibilities_done));
}

export { TASK_PHASES, TASK_PHASE_LABELS };
