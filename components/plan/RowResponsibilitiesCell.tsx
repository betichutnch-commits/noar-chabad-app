"use client";

import React, { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { PlanDialogSavePrompt } from "@/components/plan/PlanDialogSavePrompt";
import { PlanQuickDialog } from "@/components/plan/PlanQuickDialog";
import { StaffAssigneePicker } from "@/components/plan/StaffAssigneePicker";
import { TASK_PHASE_LABELS, TASK_PHASES, type PlanRowTask, type TaskPhase } from "@/lib/planRowTasks";
import {
  resolveStaffAssigneeFromFields,
  staffAssigneeDisplayName,
  type PlanningRoleOption,
  type StaffAssigneeValue,
  type StaffRosterEntry,
} from "@/lib/staffRoster";
import type { PlanRowFollowUpActionId, PlanRowFollowUpMeta } from "@/lib/planRowFollowUp";

type RowResponsibilitiesCellProps = {
  ownerValue: StaffAssigneeValue;
  tasks: PlanRowTask[];
  assigneeMode: "planning" | "roster";
  roster: StaffRosterEntry[];
  planningRoles: PlanningRoleOption[];
  tripId: string;
  fieldClass: string;
  disabled?: boolean;
  onOwnerChange: (value: StaffAssigneeValue) => void;
  onOwnerBlur: () => void;
  onTasksChange: (tasks: PlanRowTask[]) => void;
  onSave: () => void;
  onStaffRosterRefresh?: () => void;
  autoOpenTaskDialog?: boolean;
  onAutoOpenTaskDialogConsumed?: () => void;
  onFollowUpAction: (action: PlanRowFollowUpActionId, meta?: PlanRowFollowUpMeta) => void;
};

const taskAssigneeValue = (task: PlanRowTask, roster: StaffRosterEntry[]): StaffAssigneeValue =>
  resolveStaffAssigneeFromFields({
    participantId: task.assignee_participant_id,
    roleKey: task.assignee_role_key,
    displayName: task.assignee_name,
    roster,
  });

export function RowResponsibilitiesCell({
  ownerValue,
  tasks,
  assigneeMode,
  roster,
  planningRoles,
  tripId,
  fieldClass,
  disabled = false,
  onOwnerChange,
  onOwnerBlur,
  onTasksChange,
  onSave,
  onStaffRosterRefresh,
  autoOpenTaskDialog = false,
  onAutoOpenTaskDialogConsumed,
  onFollowUpAction,
}: RowResponsibilitiesCellProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [taskPhase, setTaskPhase] = useState<TaskPhase>("during");
  const [taskText, setTaskText] = useState("");
  const [taskAssignee, setTaskAssignee] = useState<StaffAssigneeValue>({ participantId: null, roleKey: null, displayName: "" });
  const [savePromptOpen, setSavePromptOpen] = useState(false);

  const resetTaskForm = (phase: TaskPhase = "during") => {
    setTaskPhase(phase);
    setTaskText("");
    setTaskAssignee({ participantId: null, roleKey: null, displayName: "" });
  };

  const openTaskDialog = (task?: PlanRowTask, index?: number) => {
    setEditingTaskIndex(typeof index === "number" ? index : null);
    setTaskPhase(task?.phase || "during");
    setTaskText(task?.task_text || "");
    setTaskAssignee(task ? taskAssigneeValue(task, roster) : { participantId: null, roleKey: null, displayName: "" });
    setSavePromptOpen(false);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!autoOpenTaskDialog) return;
    const timer = window.setTimeout(() => {
      setEditingTaskIndex(null);
      resetTaskForm("during");
      setDialogOpen(true);
      onAutoOpenTaskDialogConsumed?.();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [autoOpenTaskDialog, onAutoOpenTaskDialogConsumed]);

  const saveTask = () => {
    const trimmedTask = taskText.trim();
    if (!trimmedTask) return;
    const displayName = staffAssigneeDisplayName(taskAssignee);
    const nextTask: PlanRowTask = {
      phase: taskPhase,
      task_text: trimmedTask,
      assignee_name: displayName || null,
      assignee_participant_id: taskAssignee.participantId ?? null,
      assignee_role_key: taskAssignee.roleKey ?? null,
    };
    if (editingTaskIndex != null) {
      onTasksChange(
        tasks.map((task, idx) => (idx === editingTaskIndex ? { ...task, ...nextTask, id: task.id } : task)),
      );
      onSave();
      setDialogOpen(false);
      setSavePromptOpen(false);
      return;
    }
    onTasksChange([...tasks, nextTask]);
    onSave();
    setSavePromptOpen(true);
  };

  const closeTaskDialog = () => {
    setDialogOpen(false);
    setSavePromptOpen(false);
  };

  const addAnotherTask = () => {
    setEditingTaskIndex(null);
    resetTaskForm(taskPhase);
    setSavePromptOpen(false);
  };

  const handleTaskFollowUp = (action: PlanRowFollowUpActionId) => {
    if (action === "responsibility") {
      addAnotherTask();
      return;
    }
    const meta: PlanRowFollowUpMeta = { taskText: taskText.trim() };
    closeTaskDialog();
    onFollowUpAction(action, meta);
  };

  const removeTask = (index: number) => {
    onTasksChange(tasks.filter((_, idx) => idx !== index));
    onSave();
  };

  const hasAnyTasks = tasks.some((task) => String(task.task_text || "").trim());

  return (
    <>
      <div className="min-w-[220px] text-right">
        <label className="mb-1 block text-[10px] font-bold text-gray-500">אחראי כללי לשורה</label>
        <StaffAssigneePicker
          mode={assigneeMode}
          value={ownerValue}
          onChange={onOwnerChange}
          onPersonCreated={onStaffRosterRefresh}
          roster={roster}
          planningRoles={planningRoles}
          tripId={tripId}
          fieldClass={fieldClass}
          disabled={disabled}
          placeholder="תפקיד או איש צוות"
          className="mb-2"
        />
        <div onBlur={onOwnerBlur} />

        {TASK_PHASES.map((phase) => {
          const phaseTasks = tasks
            .map((task, index) => ({ task, index }))
            .filter(({ task }) => task.phase === phase && String(task.task_text || "").trim());
          if (!phaseTasks.length) return null;
          return (
            <div key={phase} className="mb-2 rounded-lg border border-violet-100 bg-violet-50/60 p-2">
              <div className="mb-1 text-[10px] font-black text-violet-800">{TASK_PHASE_LABELS[phase]}</div>
              <ul className="space-y-1">
                {phaseTasks.map(({ task, index }) => (
                  <li
                    key={`${phase}-${task.id || index}`}
                    className="group flex items-start gap-1 rounded-md border border-white/80 bg-white px-2 py-1.5 text-right shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-gray-900">{task.task_text}</div>
                      {staffAssigneeDisplayName(taskAssigneeValue(task, roster)) ? (
                        <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-violet-700">
                          <UserRound size={10} />
                          {staffAssigneeDisplayName(taskAssigneeValue(task, roster))}
                        </div>
                      ) : (
                        <div className="mt-0.5 text-[10px] text-gray-400">ללא אחראי</div>
                      )}
                    </div>
                    {!disabled ? (
                      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => openTaskDialog(task, index)}
                          className="rounded p-0.5 text-gray-500 hover:bg-violet-100 hover:text-violet-700"
                          aria-label="ערוך משימה"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTask(index)}
                          className="rounded p-0.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                          aria-label="הסר משימה"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {!hasAnyTasks ? (
          <p className="mb-2 text-[10px] font-bold text-gray-400">אין משימות לפי שלב — הוסף למטה</p>
        ) : null}

        <button
          type="button"
          disabled={disabled}
          onClick={() => openTaskDialog()}
          className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-violet-200 bg-white text-[11px] font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
        >
          <Plus size={12} />
          הוסף משימה ואחראי
        </button>
      </div>

      {dialogOpen ? (
        <PlanQuickDialog
          title={editingTaskIndex != null ? "עריכת משימה ואחראי" : "הוספת משימה ואחראי"}
          onClose={closeTaskDialog}
        >
          <div className="mb-3 flex flex-wrap gap-1">
            {TASK_PHASES.map((phase) => (
              <button
                key={phase}
                type="button"
                onClick={() => setTaskPhase(phase)}
                className={`rounded-lg border px-2 py-1 text-[11px] font-bold ${
                  taskPhase === phase
                    ? "border-violet-500 bg-violet-500 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {TASK_PHASE_LABELS[phase]}
              </button>
            ))}
          </div>
          <label className="mb-2 block text-xs font-bold text-gray-700">משימה</label>
          <textarea
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            className={`mb-3 w-full min-h-[72px] resize-none p-2 ${fieldClass}`}
            placeholder="לדוגמה: הקמת דוכן קבלה"
            autoFocus
          />
          <label className="mb-1 block text-xs font-bold text-gray-700">אחראי</label>
          <StaffAssigneePicker
            mode={assigneeMode}
            value={taskAssignee}
            onChange={setTaskAssignee}
            onPersonCreated={onStaffRosterRefresh}
            roster={roster}
            planningRoles={planningRoles}
            tripId={tripId}
            fieldClass={fieldClass}
            placeholder="תפקיד או איש צוות"
            className="mb-3"
          />
          {savePromptOpen ? (
            <PlanDialogSavePrompt onAction={handleTaskFollowUp} onClose={closeTaskDialog} />
          ) : (
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeTaskDialog}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={saveTask}
                disabled={!taskText.trim()}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                שמור
              </button>
            </div>
          )}
        </PlanQuickDialog>
      ) : null}
    </>
  );
}
