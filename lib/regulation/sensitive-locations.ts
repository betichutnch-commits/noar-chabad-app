import data from "@/lib/regulation/sensitive-locations.json";
import { normalizeScheduleLabel } from "@/lib/regulation/normalize";

export type SensitiveLocationDetection = {
  sensitive: boolean;
  matchedLabel?: string;
};

type SensitiveLocationsConfig = {
  exactPhrases: string[];
  settlements: string[];
  excludeIfOnly?: string[];
};

const config = data as SensitiveLocationsConfig;

function normalizeLocationText(value: string): string {
  return normalizeScheduleLabel(value)
    .replace(/[""]/g, '"')
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function matchesPhrase(normalized: string, phrase: string): boolean {
  const p = normalizeLocationText(phrase);
  if (!p) return false;
  return normalized.includes(p);
}

/** זיהוי מיקום באזור רגיש לפי חוזר 585 (איו״ש, ירושלים מזרחית, גנ״י וכו׳) */
export function detectSensitiveLocation(...parts: Array<string | null | undefined>): SensitiveLocationDetection {
  const combined = parts
    .map((p) => String(p || "").trim())
    .filter(Boolean)
    .join(" ");
  const normalized = normalizeLocationText(combined);
  if (!normalized) {
    return { sensitive: false };
  }

  for (const phrase of config.exactPhrases) {
    if (matchesPhrase(normalized, phrase)) {
      return { sensitive: true, matchedLabel: phrase };
    }
  }

  for (const settlement of config.settlements) {
    if (matchesPhrase(normalized, settlement)) {
      return { sensitive: true, matchedLabel: settlement };
    }
  }

  const excludes = config.excludeIfOnly || [];
  const onlyExcluded =
    excludes.length > 0 &&
    excludes.some((ex) => normalized === normalizeLocationText(ex)) &&
    !config.exactPhrases.some((p) => matchesPhrase(normalized, p)) &&
    !config.settlements.some((s) => matchesPhrase(normalized, s));

  if (onlyExcluded) {
    return { sensitive: false };
  }

  return { sensitive: false };
}

export type TripSensitiveContext = {
  tripDetails?: {
    sensitiveArea?: boolean;
    inSensitiveArea?: boolean;
    requiresSensitiveCoordination?: boolean;
    timeline?: Array<{
      sensitiveLocation?: boolean;
      finalLocation?: string;
      locationValue?: string;
      otherDetail?: string;
    }>;
  };
  planRows?: Array<{
    location_sensitive?: boolean;
    location_text?: string | null;
  }>;
};

/** האם לפחות שורה אחת בטיול מסומנת/מזוהה כאזור רגיש */
export function tripHasSensitiveActivity(input: TripSensitiveContext): boolean {
  const d = input.tripDetails;
  if (d?.sensitiveArea || d?.inSensitiveArea || d?.requiresSensitiveCoordination) {
    return true;
  }

  const timeline = Array.isArray(d?.timeline) ? d.timeline : [];
  for (const item of timeline) {
    if (item.sensitiveLocation) return true;
    const loc = [item.finalLocation, item.locationValue, item.otherDetail].filter(Boolean).join(" ");
    if (detectSensitiveLocation(loc).sensitive) return true;
  }

  for (const row of input.planRows || []) {
    if (row.location_sensitive) return true;
    if (row.location_text && detectSensitiveLocation(row.location_text).sensitive) return true;
  }

  return false;
}
