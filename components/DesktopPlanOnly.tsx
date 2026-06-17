"use client";

import { useEffect, useState, type ReactNode } from "react";

export function DesktopPlanOnly({ children }: { children: ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  if (!isDesktop) return null;
  return <>{children}</>;
}

export default DesktopPlanOnly;
