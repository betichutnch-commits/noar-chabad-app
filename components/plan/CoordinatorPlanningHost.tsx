"use client";

/**
 * Previously auto-opened TripPlanningApprovalModal on every /dashboard/* route.
 * That full-screen backdrop blocked clicks on all dashboard screens when the
 * modal could not be dismissed (or reappeared after refresh).
 *
 * Auto-popup is disabled. Coordinators open planning from the trip card
 * (`?planning=` → TripPlanningHubHost) or from the trip page.
 */
export function CoordinatorPlanningHost(_props: { userId?: string | null }) {
  return null;
}
