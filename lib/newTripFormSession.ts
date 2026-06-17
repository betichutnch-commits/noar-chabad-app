import type { RowRegulationBrief } from "@/lib/regulation";

export const NEW_TRIP_FORM_SESSION_KEY = "chabad-trips:new-trip-form-snapshot";

export type NewTripFormSnapshot = {
  savedAt: number;
  step: number;
  generalInfo: Record<string, unknown>;
  timeline: unknown[];
  currentLine: Record<string, unknown>;
  isRowsLocked: boolean;
  expandedItem: string | null;
  editId: string | null;
  pendingRegulation?: {
    sensitiveFlags: { sensitiveLocation: boolean; sensitiveLocationLabel: string };
    brief: RowRegulationBrief;
  } | null;
};

export function saveNewTripFormSnapshot(snapshot: Omit<NewTripFormSnapshot, "savedAt">) {
  if (typeof window === "undefined") return;
  const payload: NewTripFormSnapshot = { ...snapshot, savedAt: Date.now() };
  sessionStorage.setItem(NEW_TRIP_FORM_SESSION_KEY, JSON.stringify(payload));
}

export function loadNewTripFormSnapshot(): NewTripFormSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(NEW_TRIP_FORM_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NewTripFormSnapshot;
    if (!parsed?.generalInfo) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearNewTripFormSnapshot() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(NEW_TRIP_FORM_SESSION_KEY);
}
