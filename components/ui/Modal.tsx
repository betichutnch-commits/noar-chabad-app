"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { Button } from "./Button";

type ModalType = "success" | "error" | "info" | "confirm";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  type = "info",
  title,
  message,
  onConfirm,
  confirmText = "אישור",
  cancelText = "ביטול",
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const config = {
    success: { icon: CheckCircle, color: "text-state-success", bg: "bg-state-success-bg" },
    error: { icon: AlertCircle, color: "text-state-danger", bg: "bg-state-danger-bg" },
    confirm: { icon: AlertTriangle, color: "text-state-warning", bg: "bg-state-warning-bg" },
    info: { icon: Info, color: "text-brand-cyan", bg: "bg-state-info-bg" },
  }[type];

  const Icon = config.icon;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div
        className="relative z-10 w-full max-w-sm rounded-3xl bg-surface-card p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="סגירת חלון"
          className="absolute top-4 left-4 rounded-full bg-surface-muted p-2 text-text-muted transition-colors hover:bg-gray-100 hover:text-text-secondary"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${config.bg} ${config.color}`}>
            <Icon size={32} strokeWidth={2.5} />
          </div>

          <h3 className="mb-2 text-xl font-black text-text-primary">{title}</h3>

          <p className="mb-6 whitespace-pre-line text-sm font-medium leading-relaxed text-text-secondary">
            {message}
          </p>

          <div className="flex w-full gap-3">
            {onConfirm ? (
              <>
                <Button variant="outline" onClick={onClose} className="flex-1">
                  {cancelText}
                </Button>
                <Button
                  variant={type === "error" || type === "confirm" ? "danger" : "primary"}
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1"
                >
                  {confirmText}
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={onClose} className="w-full">
                {confirmText || "סגור"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
