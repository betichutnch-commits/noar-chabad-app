"use client";



import React, { useEffect } from "react";

import { X } from "lucide-react";



export function PlanQuickDialog({

  title,

  onClose,

  children,

  footer,

  scrollable = true,

}: {

  title: string;

  onClose: () => void;

  children: React.ReactNode;

  footer?: React.ReactNode;

  scrollable?: boolean;

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

      <div className="relative flex w-full max-w-md max-h-[min(90vh,720px)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">

        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">

          <h3 className="text-sm font-black text-gray-900">{title}</h3>

          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100" aria-label="סגור">

            <X size={16} />

          </button>

        </div>

        <div className={`min-h-0 flex-1 px-4 py-3 ${scrollable ? "overflow-y-auto overscroll-contain" : ""}`}>{children}</div>

        {footer ? <div className="shrink-0 border-t border-gray-100 px-4 py-3">{footer}</div> : null}

      </div>

    </div>

  );

}

