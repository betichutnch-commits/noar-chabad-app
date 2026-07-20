"use client";

import { useEffect } from "react";

/**
 * Global recovery if a modal left body scroll locked or a stuck ?planning= overlay.
 * Escape always restores scroll; if URL has ?planning=, hard-clears it.
 */
export function OverlayEscapeHatch() {
  useEffect(() => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";

      try {
        const url = new URL(window.location.href);
        if (!url.searchParams.has("planning")) return;
        url.searchParams.delete("planning");
        const next = `${url.pathname}${url.search}${url.hash}`;
        // Full navigation so Next searchParams / portals unmount reliably.
        window.location.replace(next);
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
