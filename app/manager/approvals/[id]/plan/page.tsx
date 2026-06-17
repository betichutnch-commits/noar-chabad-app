"use client";

import React from "react";
import ManagerTripPlanPage from "@/app/dashboard/trip/[id]/plan/page";
import { DesktopPlanOnly } from "@/components/DesktopPlanOnly";
import { ManagerHeader } from "@/components/layout/ManagerHeader";
import { MobilePlanUnavailableBanner } from "@/components/MobilePlanUnavailableBanner";

export default function ManagerApprovalPlanPage() {
  return (
    <>
      <ManagerHeader title="תכנון טיול מפורט" />
      <div className="hidden lg:block">
        <DesktopPlanOnly>
          <div className="[&>header]:hidden">
            <ManagerTripPlanPage />
          </div>
        </DesktopPlanOnly>
      </div>
      <MobilePlanUnavailableBanner />
    </>
  );
}
