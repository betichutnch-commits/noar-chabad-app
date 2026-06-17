"use client";

import { ArrowRight, MonitorSmartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function MobilePlanUnavailableBanner() {
  const router = useRouter();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    const syncOverflow = () => {
      if (mediaQuery.matches) {
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
      } else {
        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.style.overflow = previousHtmlOverflow;
      }
    };

    syncOverflow();
    mediaQuery.addEventListener("change", syncOverflow);
    return () => {
      mediaQuery.removeEventListener("change", syncOverflow);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return (
    <div
      className="relative z-0 flex h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_16%_18%,rgba(236,72,153,0.16),transparent_28%),radial-gradient(circle_at_84%_16%,rgba(34,197,94,0.16),transparent_30%),radial-gradient(circle_at_50%_92%,rgba(250,204,21,0.18),transparent_32%),linear-gradient(135deg,rgba(6,182,212,0.12),#fff_48%,rgba(6,182,212,0.14))] px-5 py-6 lg:hidden"
      dir="rtl"
    >
      <button
        type="button"
        onClick={() => router.back()}
        className="absolute right-5 top-4 inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/75 px-3 py-2 text-xs font-black text-gray-600 shadow-sm backdrop-blur-md transition-colors hover:bg-white hover:text-brand-dark"
      >
        <ArrowRight size={15} />
        חזרה
      </button>
      <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-cyan-100 bg-white/95 p-6 text-center shadow-2xl shadow-cyan-900/10">
        <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-brand-green/15" />
        <div className="absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-brand-cyan/15" />
        <div className="absolute left-8 top-8 h-16 w-16 rounded-full bg-brand-pink/10" />
        <div className="absolute bottom-7 right-10 h-12 w-12 rounded-full bg-brand-yellow/25" />

        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-brand-green/10 text-brand-cyan shadow-inner">
          <MonitorSmartphone size={32} />
        </div>

        <div className="relative">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-600">תכנון הטיול</p>
          <h1 className="text-2xl font-black text-brand-dark">שלב תכנון הטיול</h1>
          <div className="mx-auto my-4 h-1 w-20 rounded-full bg-gradient-to-l from-brand-cyan via-brand-green to-brand-pink" />
          <p className="text-base font-bold leading-8 text-gray-700">
            הפלטפורמה לתכנון הטיול על כל פרטיו דורשת אחריות ותשומת לב, וניתן לפתוח ולעבוד איתה במחשב בלבד.
          </p>
          <p className="mt-5 text-lg font-black text-brand-dark">בהצלחה רבה.</p>
        </div>
      </div>
    </div>
  );
}

export default MobilePlanUnavailableBanner;
