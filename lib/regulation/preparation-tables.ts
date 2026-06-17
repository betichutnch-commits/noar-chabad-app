import chapterBTables from "@/lib/regulation/chapter-b/preparation-tables.json";
import chapterCTables from "@/lib/regulation/chapter-c/preparation-tables.json";
import { normalizeScheduleLabel } from "@/lib/regulation/normalize";
import type { ActivityPreparationTable } from "@/lib/regulation/types";

export const chapterBPreparationTables = chapterBTables as ActivityPreparationTable[];
export const chapterCPreparationTables = chapterCTables as ActivityPreparationTable[];
export const allActivityPreparationTables: ActivityPreparationTable[] = [
  ...chapterBPreparationTables,
  ...chapterCPreparationTables,
];

export function getPreparationTableBySectionId(sectionId: string): ActivityPreparationTable | undefined {
  return allActivityPreparationTables.find((t) => t.circularSectionId === sectionId);
}

export function findPreparationTablesForTripContext(input: {
  activityKeys?: string[];
  planSubCategoryLabels?: string[];
  activityTypeIds?: string[];
  circularSectionIds?: string[];
}): ActivityPreparationTable[] {
  const keys = new Set(input.activityKeys || []);
  const subs = new Set((input.planSubCategoryLabels || []).map(normalizeScheduleLabel));
  const typeIds = new Set(input.activityTypeIds || []);
  const sections = new Set(input.circularSectionIds || []);

  const matched = allActivityPreparationTables.filter((table) => {
    if (sections.has(table.circularSectionId)) return true;
    if (table.activityTypeId && typeIds.has(table.activityTypeId)) return true;
    if (table.regulationActivityKeys?.some((k) => keys.has(k))) return true;
    if (table.planSubCategoryLabels?.some((label) => subs.has(normalizeScheduleLabel(label)))) return true;
    return false;
  });

  const byId = new Map<string, ActivityPreparationTable>();
  for (const table of matched) byId.set(table.circularSectionId, table);
  return Array.from(byId.values());
}
