"use client";

import React from "react";

type PlanDesignBriefFieldProps = {
  documentText: string;
  designerInstructions: string;
  onDocumentTextChange: (value: string) => void;
  onDesignerInstructionsChange: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
};

export function PlanDesignBriefField({
  documentText,
  designerInstructions,
  onDocumentTextChange,
  onDesignerInstructionsChange,
  size = "md",
  className = "",
}: PlanDesignBriefFieldProps) {
  const isCompact = size === "sm";

  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm focus-within:border-fuchsia-300 focus-within:ring-2 focus-within:ring-fuchsia-100 ${className}`}
    >
      <div className="border-b border-gray-100 bg-white px-2.5 pb-1 pt-2">
        <span className={`font-black text-gray-700 ${isCompact ? "text-[10px]" : "text-[11px]"}`}>טקסט המסמך</span>
      </div>
      <textarea
        value={documentText}
        onChange={(event) => onDocumentTextChange(event.target.value)}
        placeholder="הטקסט שיופיע במסמך..."
        rows={isCompact ? 2 : 3}
        className={`w-full resize-y border-0 bg-white px-2.5 py-2 font-bold text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400 ${
          isCompact ? "min-h-[48px] text-xs" : "min-h-[72px] text-sm"
        }`}
      />
      <div className="border-y border-fuchsia-100 bg-fuchsia-50/60 px-2.5 py-1">
        <span className={`font-black text-fuchsia-700 ${isCompact ? "text-[10px]" : "text-[11px]"}`}>הנחיות למעצב</span>
      </div>
      <textarea
        value={designerInstructions}
        onChange={(event) => onDesignerInstructionsChange(event.target.value)}
        placeholder="גופנים, צבעים, פריסה, הערות..."
        rows={isCompact ? 2 : 2}
        className={`w-full resize-y border-0 bg-fuchsia-50/25 px-2.5 py-2 font-medium text-fuchsia-950/85 outline-none placeholder:text-fuchsia-400/80 ${
          isCompact ? "min-h-[44px] text-[11px]" : "min-h-[56px] text-xs"
        }`}
      />
    </div>
  );
}
