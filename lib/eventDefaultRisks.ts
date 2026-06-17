import type { SupabaseClient } from "@supabase/supabase-js";

export type EventDefaultRiskRecord = {
  id?: string;
  category_key: string;
  category_label: string;
  event_label: string;
  risk_text: string;
  risk_level: number | null;
  likelihood: number | null;
  order_index: number;
};

export type EventDefaultRiskInput = {
  riskText?: string | null;
  riskLevel?: number | null;
  likelihood?: number | null;
  orderIndex?: number | null;
};

export const normalizeEventLabel = (value: unknown) => String(value || "").trim();

const normalizeRiskLevel = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue >= 1 && numberValue <= 5 ? numberValue : null;
};

export const normalizeEventDefaultRiskInput = (risk: EventDefaultRiskInput, index: number) => ({
  risk_text: String(risk.riskText || "").trim(),
  risk_level: normalizeRiskLevel(risk.riskLevel),
  likelihood: normalizeRiskLevel(risk.likelihood),
  order_index: Number.isFinite(Number(risk.orderIndex)) ? Number(risk.orderIndex) : index,
});

export async function getDefaultRisksForEvent(supabase: SupabaseClient, eventLabel: string) {
  const normalizedEvent = normalizeEventLabel(eventLabel);
  if (!normalizedEvent) return [];
  const { data, error } = await supabase
    .from("event_default_risks")
    .select("id, category_key, category_label, event_label, risk_text, risk_level, likelihood, order_index")
    .eq("event_label", normalizedEvent)
    .order("category_key", { ascending: true })
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as EventDefaultRiskRecord[];
}

export async function replaceRowSafetyWithDefaultRisks(
  supabase: SupabaseClient,
  rowId: string,
  eventLabel: string,
  options: { deleteWhenEmpty?: boolean } = {},
) {
  const risks = await getDefaultRisksForEvent(supabase, eventLabel);
  if (!risks.length && !options.deleteWhenEmpty) return;
  const deleteExisting = await supabase.from("trip_plan_row_safety").delete().eq("row_id", rowId);
  if (deleteExisting.error) throw new Error(deleteExisting.error.message);
  if (!risks.length) return;
  const payload = risks.map((risk, index) => ({
    row_id: rowId,
    order_index: index,
    risk: risk.risk_text,
    mitigation: null,
    owner: null,
    risk_level_before: risk.risk_level,
    likelihood_before: risk.likelihood,
    risk_level_after: null,
    likelihood_after: null,
  }));
  const { error } = await supabase.from("trip_plan_row_safety").insert(payload);
  if (error) throw new Error(error.message);
}

export async function applyDefaultRisksToExistingRows(supabase: SupabaseClient, eventLabel: string) {
  const normalizedEvent = normalizeEventLabel(eventLabel);
  if (!normalizedEvent) return { updatedRows: 0 };
  const { data: rows, error } = await supabase.from("trip_plan_rows").select("id").eq("event_text", normalizedEvent);
  if (error) throw new Error(error.message);
  const rowIds = (rows || []).map((row) => String(row.id)).filter(Boolean);
  for (const rowId of rowIds) {
    await replaceRowSafetyWithDefaultRisks(supabase, rowId, normalizedEvent, { deleteWhenEmpty: true });
  }
  return { updatedRows: rowIds.length };
}
