"use client";

import { LayoutGrid, Rows3 } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

export type TripsViewMode = "cards" | "table";

const STORAGE_KEY = "tripsViewMode";

export function readTripsViewModeFromStorage(): TripsViewMode {
  if (typeof window === "undefined") return "cards";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "table" ? "table" : "cards";
}

export function persistTripsViewMode(mode: TripsViewMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, mode);
}

type Props = {
  value: TripsViewMode;
  onChange: (mode: TripsViewMode) => void;
  className?: string;
};

/** טוגל תצוגת כרטיסים / טבלה — מוצג בדסקטופ בלבד (ההורה עוטף ב־hidden md:flex) */
export function ViewModeToggle({ value, onChange, className = "" }: Props) {
  return (
    <div
      role="group"
      aria-label="מצב תצוגת רשימה"
      className={`inline-flex items-center gap-0.5 rounded-xl border border-border-subtle bg-surface-card p-0.5 shadow-sm ${className}`}
    >
      <Tooltip label="כרטיסים">
        <button
          type="button"
          onClick={() => onChange("cards")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
            value === "cards"
              ? "bg-gray-800 text-white shadow-sm"
              : "text-gray-500 hover:bg-gray-50"
          }`}
          aria-pressed={value === "cards"}
        >
          <LayoutGrid size={16} aria-hidden />
          כרטיסים
        </button>
      </Tooltip>
      <Tooltip label="תצוגה קומפקטית">
        <button
          type="button"
          onClick={() => onChange("table")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
            value === "table"
              ? "bg-gray-800 text-white shadow-sm"
              : "text-gray-500 hover:bg-gray-50"
          }`}
          aria-pressed={value === "table"}
        >
          <Rows3 size={16} aria-hidden />
          קומפקטי
        </button>
      </Tooltip>
    </div>
  );
}
