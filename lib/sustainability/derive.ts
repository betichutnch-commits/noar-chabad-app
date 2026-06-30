import { resolvePlanCategoryFromEventLabel } from "@/lib/regulation";
import { isSustainabilityMotifsEnabled } from "./flags";
import type { SustainabilityMotif } from "./motifs";
import { SUSTAINABILITY_MOTIFS } from "./motifs";

export type TimelineRowLike = {
  category?: string | null;
  finalSubCategory?: string | null;
  subCategory?: string | null;
};

export type PlanRowLike = {
  category?: string | null;
  finalSubCategory?: string | null;
  subCategory?: string | null;
  eventText?: string | null;
};

type SustainabilityContext = "timeline" | "plan" | "purchase" | "hub";

type ResolvedRow = {
  category: string;
  subCategory: string;
};

function resolveRow(row: TimelineRowLike | PlanRowLike): ResolvedRow {
  const subCategory = String(
    row.finalSubCategory || row.subCategory || ("eventText" in row ? row.eventText : "") || "",
  ).trim();
  const explicitCategory = String(row.category || "").trim();
  if (explicitCategory) {
    return { category: explicitCategory, subCategory };
  }
  if (subCategory) {
    const resolved = resolvePlanCategoryFromEventLabel(subCategory);
    return { category: resolved.categoryKey || "", subCategory: resolved.subLabel || subCategory };
  }
  return { category: "", subCategory: "" };
}

function motifMatches(motif: SustainabilityMotif, row: ResolvedRow, context: SustainabilityContext): boolean {
  const { triggers } = motif;

  if (triggers.contexts?.length && !triggers.contexts.includes(context)) {
    return false;
  }

  if (motif.id === "field-environment") {
    if (row.category === "hiking") return true;
    const fieldSubs = new Set([
      "לינת שטח",
      "מסלול יום",
      "מסלול לילה",
      "פארק/גינה",
      "פעילות בשטח פתוח",
    ]);
    return fieldSubs.has(row.subCategory);
  }

  if (triggers.categories?.length && !triggers.categories.includes(row.category)) {
    return false;
  }

  if (triggers.subCategories?.length) {
    if (!row.subCategory || !triggers.subCategories.includes(row.subCategory)) {
      return false;
    }
  }

  return Boolean(row.category || row.subCategory);
}

function dedupeMotifs(motifs: SustainabilityMotif[]): SustainabilityMotif[] {
  const seen = new Set<string>();
  return motifs.filter((motif) => {
    if (seen.has(motif.id)) return false;
    seen.add(motif.id);
    return true;
  });
}

function resolveEnabled(enabled?: boolean): boolean {
  if (enabled === false) return false;
  if (enabled === true) return true;
  return isSustainabilityMotifsEnabled();
}

function collectMotifs(
  rows: Array<TimelineRowLike | PlanRowLike>,
  context: SustainabilityContext,
  enabled?: boolean,
): SustainabilityMotif[] {
  if (!resolveEnabled(enabled)) return [];
  const matched: SustainabilityMotif[] = [];

  for (const rowInput of rows) {
    const row = resolveRow(rowInput);
    if (!row.category && !row.subCategory) continue;
    for (const motif of SUSTAINABILITY_MOTIFS) {
      if (motifMatches(motif, row, context)) {
        matched.push(motif);
      }
    }
  }

  return dedupeMotifs(matched);
}

export function tripHasSustainabilityScope(rows: Array<TimelineRowLike | PlanRowLike>): boolean {
  return rows.some((row) => {
    const resolved = resolveRow(row);
    return Boolean(resolved.category || resolved.subCategory);
  });
}

export function getMotifsForTimelineRow(
  category: string,
  subCategory: string,
  enabled?: boolean,
): SustainabilityMotif[] {
  if (!resolveEnabled(enabled)) return [];
  const row = resolveRow({ category, subCategory });
  if (!row.category && !row.subCategory) return [];

  return dedupeMotifs(
    SUSTAINABILITY_MOTIFS.filter((motif) => motifMatches(motif, row, "timeline")),
  );
}

export function getMotifsForPlanRow(
  eventText: string | null | undefined,
  allRows: PlanRowLike[],
  enabled?: boolean,
): SustainabilityMotif[] {
  if (!resolveEnabled(enabled)) return [];
  const row = resolveRow({ eventText });
  if (!row.category && !row.subCategory) return [];

  return dedupeMotifs(
    SUSTAINABILITY_MOTIFS.filter((motif) => motifMatches(motif, row, "plan")),
  );
}

export function getMotifsForTrip(
  timeline: TimelineRowLike[],
  planRows: PlanRowLike[],
  enabled?: boolean,
): SustainabilityMotif[] {
  const rows = [...timeline, ...planRows];
  return collectMotifs(rows, "hub", enabled);
}

export function getMotifsForPurchaseContext(
  rows: Array<TimelineRowLike | PlanRowLike>,
  enabled?: boolean,
): SustainabilityMotif[] {
  if (!resolveEnabled(enabled)) return [];
  if (!tripHasSustainabilityScope(rows)) return [];

  const purchaseMotifIds = new Set(["reduce-consumption", "reuse", "recycling-waste"]);
  return collectMotifs(rows, "purchase", enabled).filter((motif) => purchaseMotifIds.has(motif.id));
}

export function getMotifsForSuppliersContext(enabled?: boolean): SustainabilityMotif[] {
  if (!resolveEnabled(enabled)) return [];
  return SUSTAINABILITY_MOTIFS.filter((motif) => motif.triggers.contexts?.includes("suppliers"));
}

export function hasSustainabilityEventText(eventText: string | null | undefined): boolean {
  const sub = String(eventText || "").trim();
  if (!sub) return false;
  return Boolean(resolvePlanCategoryFromEventLabel(sub).categoryKey);
}
