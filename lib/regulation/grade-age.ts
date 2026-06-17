import { GRADES } from "@/lib/constants";

/** גיל משוער לתחילת כיתה (שנת לימודים) */
const GRADE_INDEX_TO_APPROX_AGE: Record<string, number> = {
  "א׳": 6,
  "ב׳": 7,
  "ג׳": 8,
  "ד׳": 9,
  "ה׳": 10,
  "ו׳": 11,
  "ז׳": 12,
  "ח׳": 13,
  "ט׳": 14,
  "י׳": 15,
  "י״א": 16,
  "י״ב": 17,
};

export function gradeToApproxAge(grade: string): number | null {
  const g = String(grade || "").trim();
  if (!g) return null;
  if (GRADE_INDEX_TO_APPROX_AGE[g] != null) return GRADE_INDEX_TO_APPROX_AGE[g];
  const idx = GRADES.indexOf(g);
  if (idx >= 0) return 6 + idx;
  return null;
}

export function gradeRangeToApproxAges(gradeFrom?: string, gradeTo?: string): {
  minAge: number | null;
  maxAge: number | null;
} {
  const from = gradeToApproxAge(gradeFrom || "");
  const to = gradeToApproxAge(gradeTo || gradeFrom || "");
  if (from == null && to == null) return { minAge: null, maxAge: null };
  if (from != null && to != null) {
    return { minAge: Math.min(from, to), maxAge: Math.max(from, to) };
  }
  const single = from ?? to;
  return { minAge: single, maxAge: single };
}
