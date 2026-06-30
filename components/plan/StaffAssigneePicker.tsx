"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus, UserRound } from "lucide-react";
import {
  emptyStaffAssignee,
  staffAssigneeDisplayName,
  staffAssigneeFromPlanningRole,
  staffAssigneeFromRosterEntry,
  staffAssigneeMatches,
  type PlanningRoleOption,
  type StaffAssigneeValue,
  type StaffRosterEntry,
} from "@/lib/staffRoster";

type StaffAssigneePickerProps = {
  mode: "planning" | "roster";
  value: StaffAssigneeValue;
  onChange: (value: StaffAssigneeValue) => void;
  roster: StaffRosterEntry[];
  planningRoles: PlanningRoleOption[];
  fieldClass: string;
  placeholder?: string;
  disabled?: boolean;
  tripId?: string;
  onPersonCreated?: () => void;
  className?: string;
};

export function StaffAssigneePicker({
  mode,
  value,
  onChange,
  roster,
  planningRoles,
  fieldClass,
  placeholder = "בחר תפקיד או איש צוות",
  disabled = false,
  tripId,
  onPersonCreated,
  className = "",
}: StaffAssigneePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [newPersonName, setNewPersonName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      const menu = document.getElementById("staff-assignee-picker-menu");
      if (menu?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const openMenu = () => {
    if (disabled) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setOpen(true);
    setCreateError("");
  };

  const pickValue = (next: StaffAssigneeValue) => {
    onChange(next);
    setOpen(false);
  };

  const createPerson = async () => {
    const trimmed = newPersonName.trim();
    if (!trimmed || !tripId) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/plan/participants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "createParticipant",
          type: "staff",
          name: trimmed,
          registrationStatus: "צוות",
          raw: {
            staffRole: "",
            firstName: trimmed.split(/\s+/)[0] || trimmed,
            lastName: trimmed.split(/\s+/).slice(1).join(" "),
          },
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(payload?.error || "יצירת איש צוות נכשלה"));
      const createdId = typeof payload?.id === "string" ? payload.id : "";
      if (createdId) {
        pickValue({ participantId: createdId, roleKey: null, displayName: trimmed });
        onPersonCreated?.();
        setNewPersonName("");
        return;
      }
      const reload = await fetch(`/api/trips/${tripId}/plan/participants`, { credentials: "include", cache: "no-store" });
      const reloadPayload = await reload.json().catch(() => ({}));
      const staff = Array.isArray(reloadPayload?.staff) ? reloadPayload.staff : [];
      const created = staff.find((person: { name?: string }) => String(person?.name || "").trim() === trimmed);
      if (!created?.id) throw new Error("איש הצוות נוצר אך לא נמצא ברשימה");
      pickValue({ participantId: created.id, roleKey: null, displayName: trimmed });
      onPersonCreated?.();
      setNewPersonName("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "יצירת איש צוות נכשלה");
    } finally {
      setCreating(false);
    }
  };

  const displayValue = staffAssigneeDisplayName(value) || placeholder;
  const rosterPeople = roster.filter((entry) => !entry.isPlaceholder);
  const rosterRoles = roster.filter((entry) => entry.isPlaceholder);

  const menu =
    open && menuPos && typeof document !== "undefined"
      ? createPortal(
          <StaffAssigneeMenu
            menuPos={menuPos}
            mode={mode}
            planningRoles={planningRoles}
            rosterPeople={rosterPeople}
            rosterRoles={rosterRoles}
            value={value}
            onPick={pickValue}
            newPersonName={newPersonName}
            onNewPersonNameChange={setNewPersonName}
            onCreatePerson={createPerson}
            creating={creating}
            createError={createError}
            tripId={tripId}
          />,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={openMenu}
        className={`flex h-9 w-full items-center justify-between gap-2 px-2 text-right text-sm font-bold ${fieldClass} disabled:opacity-50`}
      >
        <span className={`truncate ${staffAssigneeDisplayName(value) ? "text-gray-900" : "text-gray-400"}`}>{displayValue}</span>
        <ChevronDown size={14} className="shrink-0 text-gray-500" />
      </button>
      {menu}
    </div>
  );
}

function StaffAssigneeMenu({
  menuPos,
  mode,
  planningRoles,
  rosterPeople,
  rosterRoles,
  value,
  onPick,
  newPersonName,
  onNewPersonNameChange,
  onCreatePerson,
  creating,
  createError,
  tripId,
}: {
  menuPos: { top: number; left: number; width: number };
  mode: "planning" | "roster";
  planningRoles: PlanningRoleOption[];
  rosterPeople: StaffRosterEntry[];
  rosterRoles: StaffRosterEntry[];
  value: StaffAssigneeValue;
  onPick: (value: StaffAssigneeValue) => void;
  newPersonName: string;
  onNewPersonNameChange: (value: string) => void;
  onCreatePerson: () => void;
  creating: boolean;
  createError: string;
  tripId?: string;
}) {
  return (
    <div
      id="staff-assignee-picker-menu"
      className="fixed z-[300] max-h-72 min-w-[12rem] overflow-auto rounded-2xl border border-violet-200 bg-white p-1.5 shadow-2xl ring-2 ring-violet-100"
      style={{ top: menuPos.top, left: menuPos.left, width: Math.max(menuPos.width, 220) }}
    >
      <button
        type="button"
        onClick={() => onPick(emptyStaffAssignee())}
        className={`flex w-full rounded-lg px-2 py-1.5 text-right text-[11px] font-bold hover:bg-gray-50 ${
          !staffAssigneeDisplayName(value) ? "bg-violet-50 text-violet-800" : "text-gray-600"
        }`}
      >
        ללא אחראי
      </button>

      {mode === "planning" && planningRoles.length ? (
        <>
          <p className="px-2 py-1 text-[10px] font-black text-gray-400">תפקידים (תכנון)</p>
          {planningRoles.map((role) => {
            const option = staffAssigneeFromPlanningRole(role);
            const active = staffAssigneeMatches(value, option);
            return (
              <button
                key={role.role_key}
                type="button"
                onClick={() => onPick(option)}
                className={`flex w-full rounded-lg px-2 py-1.5 text-right text-[11px] font-bold hover:bg-violet-50 ${
                  active ? "bg-violet-100 text-violet-900" : "text-gray-800"
                }`}
              >
                {role.role_label}
              </button>
            );
          })}
        </>
      ) : null}

      {rosterRoles.length ? (
        <>
          <p className="px-2 py-1 text-[10px] font-black text-amber-700">תפקידים פתוחים</p>
          {rosterRoles.map((entry) => {
            const option = staffAssigneeFromRosterEntry(entry);
            const active = staffAssigneeMatches(value, option);
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onPick(option)}
                className={`flex w-full rounded-lg px-2 py-1.5 text-right text-[11px] font-bold hover:bg-amber-50 ${
                  active ? "bg-amber-100 text-amber-900" : "text-amber-900"
                }`}
              >
                {entry.roleLabels[0] || entry.displayName}
              </button>
            );
          })}
        </>
      ) : null}

      {rosterPeople.length ? (
        <>
          <p className="px-2 py-1 text-[10px] font-black text-gray-400">אנשי צוות</p>
          {rosterPeople.map((entry) => {
            const option = staffAssigneeFromRosterEntry(entry);
            const active = staffAssigneeMatches(value, option);
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onPick(option)}
                className={`flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-right text-[11px] font-bold hover:bg-violet-50 ${
                  active ? "bg-violet-100 text-violet-900" : "text-gray-800"
                }`}
              >
                <UserRound size={12} className="shrink-0" />
                <span className="truncate">{entry.displayName}</span>
              </button>
            );
          })}
        </>
      ) : null}

      {tripId ? (
        <div className="mt-1 border-t border-gray-100 px-1 pt-2">
          <p className="mb-1 text-[10px] font-black text-gray-500">הוסף איש צוות חדש</p>
          <div className="flex gap-1">
            <input
              value={newPersonName}
              onChange={(e) => onNewPersonNameChange(e.target.value)}
              className="h-8 min-w-0 flex-1 rounded-lg border border-gray-200 px-2 text-[11px] font-bold"
              placeholder="שם מלא"
            />
            <button
              type="button"
              disabled={creating || !newPersonName.trim()}
              onClick={onCreatePerson}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-violet-600 px-2 text-[10px] font-black text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Plus size={12} />
              {creating ? "..." : "הוסף"}
            </button>
          </div>
          {createError ? <p className="mt-1 text-[10px] font-bold text-red-600">{createError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
