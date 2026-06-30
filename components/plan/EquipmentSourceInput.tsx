"use client";

import React, { useMemo, useState } from "react";

type EquipmentSourceInputProps = {
  value: string;
  onChange: (value: string) => void;
  sourceType: string;
  suggestions: string[];
  fieldClass: string;
  className?: string;
  onBlur?: () => void;
};

export function EquipmentSourceInput({
  value,
  onChange,
  sourceType,
  suggestions,
  fieldClass,
  className = "",
  onBlur,
}: EquipmentSourceInputProps) {
  const [open, setOpen] = useState(false);
  const placeholder =
    sourceType === "רכש" ? "ספק" : sourceType === "קיים" || sourceType === "מקור" ? "מקור" : "מקור / ספק";

  const visibleSuggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return suggestions;
    return suggestions.filter((item) => item.toLowerCase().includes(query));
  }, [suggestions, value]);

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        className={`h-9 w-full ${fieldClass}`}
        placeholder={placeholder}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setOpen(true);
          onChange(event.target.value);
        }}
        onBlur={() => {
          onBlur?.();
          window.setTimeout(() => setOpen(false), 120);
        }}
      />
      {open && visibleSuggestions.length > 0 ? (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-44 min-w-full overflow-auto rounded-2xl border border-cyan-200 bg-cyan-50/95 p-1.5 shadow-2xl ring-2 ring-cyan-100">
          {visibleSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(suggestion);
                setOpen(false);
              }}
              className="block h-8 w-full rounded-xl px-3 text-center text-xs font-bold text-gray-700 transition-colors hover:bg-white hover:text-brand-cyan"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
