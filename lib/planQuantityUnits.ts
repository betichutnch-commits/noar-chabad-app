export const PLAN_QUANTITY_UNITS = ["יחידה", "חבילה", "ארגז", "מטר", "קילו", "ליטר", "אחר"] as const;

export type PlanQuantityUnit = (typeof PLAN_QUANTITY_UNITS)[number];
