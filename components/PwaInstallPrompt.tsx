"use client";

import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { registerServiceWorker } from "@/lib/pushClient";

/** Once dismissed (X), never show again on this browser. */
const DISMISS_KEY = "pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    void registerServiceWorker().catch(() => {});

    dismissedRef.current = wasDismissed();
    if (isStandalone() || dismissedRef.current) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      if (dismissedRef.current || wasDismissed() || isStandalone()) return;
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    dismissedRef.current = true;
    markDismissed();
    setVisible(false);
    setDeferred(null);
  };

  const install = async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      dismissedRef.current = true;
      markDismissed();
      setInstalling(false);
      setVisible(false);
      setDeferred(null);
    }
  };

  if (!visible || !deferred) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label="התקנת האפליקציה"
    >
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-border-subtle bg-white p-4 shadow-xl shadow-cyan-100/60">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-cyan/10 text-brand-cyan">
          <Download size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text-primary">התקן את האפליקציה</p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            גישה מהירה ממסך הבית, בלי לפתוח את הדפדפן בכל פעם.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              className="h-10 flex-1 px-4 py-2 text-sm"
              isLoading={installing}
              onClick={() => void install()}
            >
              התקן
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 px-3 text-sm"
              onClick={dismiss}
              aria-label="סגור"
            >
              <X size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
