"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { PLAN_QUANTITY_UNITS } from "@/lib/planQuantityUnits";

type QuantityUnitPickerProps = {
  value: string;
  onChange: (value: string) => void;
  fieldClass: string;
  placeholder?: string;
  className?: string;
};

export function QuantityUnitPicker({
  value,
  onChange,
  fieldClass,
  placeholder = "יחידה",
  className = "",
}: QuantityUnitPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const isPreset = (unit: string) => (PLAN_QUANTITY_UNITS as readonly string[]).includes(unit);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      const menu = document.getElementById("quantity-unit-picker-menu");
      if (menu?.contains(target)) return;
      setOpen(false);
      setCustomOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const openMenu = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setOpen(true);
  };

  const pickUnit = (unit: string) => {
    if (unit === "אחר") {
      setCustomOpen(true);
      setCustomValue(value && !isPreset(value) ? value : "");
      return;
    }
    onChange(unit);
    setOpen(false);
    setCustomOpen(false);
  };

  const commitCustom = () => {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setOpen(false);
    setCustomOpen(false);
  };

  const displayValue = value.trim() || placeholder;

  const menu =
    open && menuPos && typeof document !== "undefined"
      ? createPortal(
          <div
            id="quantity-unit-picker-menu"
            className="fixed z-[300] max-h-56 min-w-[8rem] overflow-auto rounded-2xl border border-cyan-200 bg-white p-1.5 shadow-2xl ring-2 ring-cyan-100"
            style={{ top: menuPos.top, left: menuPos.left, width: Math.max(menuPos.width, 128) }}
          >
            {PLAN_QUANTITY_UNITS.map((unit) => (
              <button
                key={unit}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickUnit(unit)}
                className={`mb-0.5 flex h-8 w-full items-center justify-center rounded-xl px-2 text-xs font-bold transition-colors last:mb-0 ${
                  value === unit
                    ? "bg-brand-cyan text-white"
                    : "bg-white text-gray-700 hover:bg-cyan-50 hover:text-brand-cyan"
                }`}
              >
                {unit}
              </button>
            ))}
            {customOpen ? (
              <div className="mt-1 border-t border-cyan-100 pt-1">
                <input
                  autoFocus
                  value={customValue}
                  onMouseDown={(e) => e.preventDefault()}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitCustom();
                    if (e.key === "Escape") {
                      setCustomOpen(false);
                      setOpen(false);
                    }
                  }}
                  placeholder="יחידה אחרת"
                  className={`h-8 w-full px-2 text-xs font-bold ${fieldClass}`}
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={commitCustom}
                  className="mt-1 h-7 w-full rounded-lg bg-brand-cyan text-[11px] font-bold text-white hover:bg-cyan-700"
                >
                  אישור
                </button>
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={className}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`relative flex h-9 w-full items-center justify-center gap-1 px-2 ${fieldClass}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate text-xs font-bold">{displayValue}</span>
        <ChevronDown size={14} className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {menu}
    </div>
  );
}
