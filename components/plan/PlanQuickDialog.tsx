"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export function PlanQuickDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="סגור" />
      <div className="relative w-full max-w-md overflow-visible rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-black text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100" aria-label="סגור">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
