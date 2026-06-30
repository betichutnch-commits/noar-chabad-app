"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

export type SelectAccent = "cyan" | "amber" | "pink" | "purple" | "fuchsia" | "emerald";

export type SelectSize = "sm" | "md";

export type SelectVariant = "default" | "status" | "pill";

const accentClasses: Record<SelectAccent, { active: string; buttonFocus: string; buttonOpen: string }> = {
  cyan: {
    active: "bg-cyan-50 text-cyan-700",
    buttonFocus: "focus:border-cyan-400 focus:ring-cyan-100",
    buttonOpen: "border-cyan-300 ring-2 ring-cyan-100",
  },
  amber: {
    active: "bg-amber-50 text-amber-800",
    buttonFocus: "focus:border-amber-400 focus:ring-amber-100",
    buttonOpen: "border-amber-300 ring-2 ring-amber-100",
  },
  pink: {
    active: "bg-pink-50 text-pink-700",
    buttonFocus: "focus:border-pink-400 focus:ring-pink-100",
    buttonOpen: "border-pink-300 ring-2 ring-pink-100",
  },
  purple: {
    active: "bg-purple-50 text-purple-700",
    buttonFocus: "focus:border-purple-400 focus:ring-purple-100",
    buttonOpen: "border-purple-300 ring-2 ring-purple-100",
  },
  fuchsia: {
    active: "bg-fuchsia-50 text-fuchsia-700",
    buttonFocus: "focus:border-fuchsia-400 focus:ring-fuchsia-100",
    buttonOpen: "border-fuchsia-300 ring-2 ring-fuchsia-100",
  },
  emerald: {
    active: "bg-emerald-50 text-emerald-700",
    buttonFocus: "focus:border-emerald-400 focus:ring-emerald-100",
    buttonOpen: "border-emerald-300 ring-2 ring-emerald-100",
  },
};

const sizeClasses: Record<SelectSize, string> = {
  sm: "h-9 text-xs",
  md: "h-10 text-sm",
};

type SelectProps<T extends string> = {
  value: T | "";
  options: Array<SelectOption<T>>;
  onChange: (value: T | "") => void;
  placeholder: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  accent?: SelectAccent;
  size?: SelectSize;
  textAlign?: "right" | "center";
  variant?: SelectVariant;
  /** When false, the placeholder row is hidden and the value cannot be cleared. */
  clearable?: boolean;
  /** Pill variant: custom classes per option value. */
  getOptionClassName?: (value: string, selected: boolean) => string;
};

export function Select<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  disabled = false,
  accent = "pink",
  size = "md",
  textAlign = "right",
  variant = "default",
  clearable = true,
  getOptionClassName,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const accentStyle = accentClasses[accent];
  const isOpen = open && !disabled;
  const alignClass = textAlign === "center" ? "text-center" : "text-right";
  const activeLabel = options.find((option) => option.value === value)?.label || placeholder;
  const showPlaceholder = !value;

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const buttonBase =
    variant === "pill"
      ? `relative inline-flex ${sizeClasses[size]} min-w-28 items-center justify-center rounded-full border px-4 pl-9 font-black shadow-sm outline-none transition-all hover:shadow disabled:cursor-not-allowed disabled:opacity-60`
      : variant === "status"
        ? `relative ${sizeClasses[size]} w-full rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-slate-50 px-3 pl-9 font-black text-gray-700 shadow-sm outline-none transition-all hover:border-gray-300 hover:shadow disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`
        : `inline-flex ${sizeClasses[size]} w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-2.5 font-bold text-gray-700 outline-none transition-colors hover:border-gray-300 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60`;

  const pillTone = getOptionClassName?.(value || "", true) || accentStyle.active;

  return (
    <div className={`relative ${variant === "pill" ? "flex justify-center" : ""} ${className}`} ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`${buttonBase} ${alignClass} ${variant === "pill" ? pillTone : ""} ${isOpen ? accentStyle.buttonOpen : accentStyle.buttonFocus} ${buttonClassName}`}
      >
        <span className={`min-w-0 flex-1 truncate ${showPlaceholder ? "text-gray-400" : ""}`}>{activeLabel}</span>
        <ChevronDown
          size={14}
          className={`pointer-events-none shrink-0 text-gray-400 transition-transform ${variant === "default" ? "" : "absolute left-3 top-1/2 -translate-y-1/2"} ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen ? (
        <div
          className={`absolute top-full z-[140] mt-1.5 min-w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl ${variant === "pill" ? "right-1/2 min-w-48 translate-x-1/2" : "right-0"} ${menuClassName}`}
        >
          <div className={`max-h-60 overflow-y-auto p-1.5 ${variant === "status" || variant === "pill" ? "text-center" : ""}`}>
            {clearable ? (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${alignClass} ${
                  value === "" ? accentStyle.active : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {placeholder}
              </button>
            ) : null}
            {options.map((option) => {
              const selected = value === option.value;
              const customTone = getOptionClassName?.(option.value, selected);
              const itemClass =
                customTone && variant === "pill"
                  ? `${customTone} ${selected ? "ring-1 ring-inset ring-current/20" : "opacity-85 hover:opacity-100"}`
                  : selected
                    ? accentStyle.active
                    : "text-gray-700 hover:bg-gray-50";

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${alignClass} ${itemClass} ${
                    variant === "status" ? "rounded-xl px-3 py-2 font-black" : ""
                  }`}
                >
                  {variant === "status" ? (
                    <>
                      <Check size={13} className={selected ? "opacity-100" : "opacity-0"} />
                      <span className="flex-1">{option.label}</span>
                      <span className="w-[13px]" />
                    </>
                  ) : (
                    option.label
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
