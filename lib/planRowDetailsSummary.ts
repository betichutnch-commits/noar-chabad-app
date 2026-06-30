import type { PlanRowTask } from "@/lib/planRowTasks";

export type RowDetailsSummaryCounts = {
  responsibilities: number;
  purchase: number;
  equipment: number;
  designs: number;
  prints: number;
  guidelines: number;
};

type EquipmentLike = {
  item?: string | null;
  source_type?: string | null;
};

function normalizeSourceType(sourceType?: string | null) {
  return sourceType === "מקור" ? "קיים" : String(sourceType || "").trim();
}

function isFilledEquipmentItem(item: EquipmentLike) {
  return Boolean(String(item.item || "").trim());
}

export function computeRowDetailsSummaryCounts(input: {
  tasks?: PlanRowTask[];
  equipment?: EquipmentLike[];
  designs?: unknown[];
  prints?: unknown[];
  staff_instructions?: string | null;
  participant_instructions?: string | null;
}): RowDetailsSummaryCounts {
  const tasks = input.tasks || [];
  const equipment = (input.equipment || []).filter(isFilledEquipmentItem);

  let purchase = 0;
  let equipmentCount = 0;
  for (const item of equipment) {
    const source = normalizeSourceType(item.source_type);
    if (source === "רכש") purchase += 1;
    else equipmentCount += 1;
  }

  const guidelines =
    (String(input.staff_instructions || "").trim() ? 1 : 0) +
    (String(input.participant_instructions || "").trim() ? 1 : 0);

  return {
    responsibilities: tasks.filter((task) => String(task.task_text || "").trim()).length,
    purchase,
    equipment: equipmentCount,
    designs: (input.designs || []).length,
    prints: (input.prints || []).length,
    guidelines,
  };
}

export function formatRowDetailsSummaryLine(counts: RowDetailsSummaryCounts): string | null {
  const parts: string[] = [];
  if (counts.responsibilities > 0) parts.push(`${counts.responsibilities} אחריות`);
  if (counts.purchase > 0) parts.push(`${counts.purchase} רכש`);
  if (counts.equipment > 0) parts.push(`${counts.equipment} ציוד`);
  if (counts.designs > 0) parts.push(`${counts.designs} עיצובים`);
  if (counts.prints > 0) parts.push(`${counts.prints} הדפסות`);
  if (counts.guidelines > 0) parts.push(`${counts.guidelines} הנחיות`);
  return parts.length ? parts.join(" · ") : null;
}
