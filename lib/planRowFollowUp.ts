export const PLAN_ROW_FOLLOW_UP_ACTIONS = [
  { id: "responsibility", label: "אחריות", accentClass: "border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100" },
  { id: "purchase", label: "רכש", accentClass: "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" },
  { id: "equipment", label: "ציוד", accentClass: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" },
  { id: "print", label: "הדפסות", accentClass: "border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100" },
  { id: "guidelines", label: "הנחיות", accentClass: "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100" },
] as const;

export type PlanRowFollowUpActionId = (typeof PLAN_ROW_FOLLOW_UP_ACTIONS)[number]["id"];

export type PlanRowFollowUpMeta = {
  taskText?: string;
};
