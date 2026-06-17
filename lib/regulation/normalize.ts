/** נרמול תוויות עברית (גרשיים, NFC) להשוואת תת-קטגוריות בלו״ז */
export function normalizeScheduleLabel(value: string): string {
  return String(value || "")
    .replace(/['׳`]/g, "'")
    .normalize("NFKC")
    .trim();
}
