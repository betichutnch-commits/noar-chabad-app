"use client";

import React from "react";
import { UserRound } from "lucide-react";
import {
  TASK_PHASES,
  TASK_PHASE_LABELS,
  type AssigneeBoard,
} from "@/lib/planAssigneeResponsibilities";

export function AssigneeResponsibilitiesBoard({ boards }: { boards: AssigneeBoard[] }) {
  if (!boards.length) {
    return (
      <div className="rounded-3xl border border-dashed border-violet-200 bg-violet-50/40 p-10 text-center">
        <p className="text-sm font-black text-violet-900">עדיין לא הוגדרו אחראים במשימות בלו״ז</p>
        <p className="mt-2 text-xs font-bold text-violet-700">
          הוסף משימות ואחראים בעמודת &quot;באחריות&quot; או דרך תפריט פירוט ההתרחשות.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {boards.map((board) => (
        <article
          key={board.name}
          className="flex flex-col overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm"
        >
          <header className="flex items-center justify-between gap-2 border-b border-violet-100 bg-gradient-to-l from-violet-50 to-white px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
                <UserRound size={16} />
              </span>
              <h3 className="truncate text-sm font-black text-gray-900">{board.name}</h3>
            </div>
            <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-800">
              {board.totalCount} אחריות
            </span>
          </header>
          <div className="flex flex-1 flex-col gap-3 p-3">
            {TASK_PHASES.map((phase) => {
              const items = board.phases[phase];
              if (!items.length) return null;
              return (
                <section key={phase} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-2.5">
                  <h4 className="mb-2 text-[11px] font-black text-violet-800">{TASK_PHASE_LABELS[phase]}</h4>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li
                        key={`${item.rowId}-${item.phase}-${item.taskText}-${item.stageLabel}`}
                        className="rounded-xl border border-white bg-white px-2.5 py-2 shadow-sm"
                      >
                        <p className="text-[12px] font-bold leading-snug text-gray-900">{item.taskText}</p>
                        <p className="mt-1 text-[10px] font-bold leading-snug text-gray-500">{item.stageLabel}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}
