import type { ReactNode } from "react";
import { DesktopPlanOnly } from "@/components/DesktopPlanOnly";
import { Header } from "@/components/layout/Header";
import { MobilePlanUnavailableBanner } from "@/components/MobilePlanUnavailableBanner";
import { PLAN_TRIP_PAGE_TITLE } from "@/lib/planTripLabels";

export default function TripPlanLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="print:hidden">
        <Header title={PLAN_TRIP_PAGE_TITLE} />
      </div>
      <div className="hidden lg:block">
        <DesktopPlanOnly>{children}</DesktopPlanOnly>
      </div>
      <MobilePlanUnavailableBanner />
    </>
  );
}
