import type { TripRecord } from "@/lib/types";

const MS_DAY = 86_400_000;

/** אחראי בטיחות: בקשה ממתינה מעל 3 ימים */
export function getApprovalTripAlert(
  trip: TripRecord & { created_at?: string | null },
): { tone: "amber" | "red"; label: string } | undefined {
  if (trip.status !== "pending") return undefined;
  const created = trip.created_at ? new Date(trip.created_at).getTime() : NaN;
  if (!Number.isFinite(created)) return undefined;
  if (Date.now() - created > 3 * MS_DAY) {
    return { tone: "amber", label: "ממתין מעל 3 ימים" };
  }
  return undefined;
}

/** אחראי מחלקה: הוחזר לתיקון והרכז לא מגיב מעל 7 ימים */
export function getDeptReviewTripAlert(
  trip: TripRecord & { dept_reviewed_at?: string | null },
): { tone: "amber" | "red"; label: string } | undefined {
  if (trip.status !== "returned_for_changes") return undefined;
  const reviewed = trip.dept_reviewed_at
    ? new Date(trip.dept_reviewed_at).getTime()
    : NaN;
  if (!Number.isFinite(reviewed)) return undefined;
  if (Date.now() - reviewed > 7 * MS_DAY) {
    return { tone: "red", label: "ממתין לתיקון רכז" };
  }
  return undefined;
}
