"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/** גלילה ופתיחת טבלת היערכות לפי ?section=b.3.3 */
export function RegulationSectionDeepLink() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section");

  useEffect(() => {
    if (!section) return;
    const id = `regulation-section-${section.replace(/\./g, "-")}`;
    const el = document.getElementById(id);
    if (!el) return;
    if (el instanceof HTMLDetailsElement) {
      el.open = true;
    } else {
      const details = el.querySelector("details");
      if (details) details.open = true;
    }
    window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [section]);

  return null;
}
