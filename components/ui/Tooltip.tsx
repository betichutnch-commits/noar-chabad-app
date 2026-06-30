import React from "react";

type TooltipProps = {
  label: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
  className?: string;
};

export function Tooltip({ label, children, side = "top", className = "" }: TooltipProps) {
  const positionClass = side === "bottom" ? "top-full mt-2" : "bottom-full mb-2";
  return (
    <span className={`group/tooltip relative inline-flex ${className}`}>
      {children}
      <span
        className={`pointer-events-none absolute left-1/2 z-[300] -translate-x-1/2 whitespace-nowrap rounded-xl border border-cyan-100 bg-white px-3 py-1.5 text-[11px] font-black text-gray-700 opacity-0 shadow-lg shadow-cyan-900/10 transition-all duration-150 group-hover/tooltip:translate-y-0 group-hover/tooltip:opacity-100 group-has-[:focus-visible]/tooltip:translate-y-0 group-has-[:focus-visible]/tooltip:opacity-100 ${positionClass}`}
      >
        {label}
      </span>
    </span>
  );
}
