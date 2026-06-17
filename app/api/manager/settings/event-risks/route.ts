import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isManagerUser } from "@/lib/auth";
import { applyDefaultRisksToExistingRows, normalizeEventDefaultRiskInput, normalizeEventLabel, type EventDefaultRiskInput } from "@/lib/eventDefaultRisks";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type Body = {
  categoryKey?: string | null;
  categoryLabel?: string | null;
  eventLabel?: string | null;
  risks?: EventDefaultRiskInput[];
};

async function requireManager() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role, department, is_tech_admin").eq("id", user.id).single();
  return { supabase, user: user as User, ok: isManagerUser(user as User, profile || null), status: 403 as const };
}

export async function GET() {
  const access = await requireManager();
  if (!access.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await access.supabase
    .from("event_default_risks")
    .select("id, category_key, category_label, event_label, risk_text, risk_level, likelihood, order_index")
    .order("category_key", { ascending: true })
    .order("event_label", { ascending: true })
    .order("order_index", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, risks: data || [] });
}

export async function PUT(request: Request) {
  const access = await requireManager();
  if (!access.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Body;
  const categoryKey = String(body.categoryKey || "").trim();
  const categoryLabel = String(body.categoryLabel || "").trim();
  const eventLabel = normalizeEventLabel(body.eventLabel);
  if (!categoryKey || !categoryLabel || !eventLabel) return NextResponse.json({ error: "Missing event definition" }, { status: 400 });

  const normalizedRisks = (Array.isArray(body.risks) ? body.risks : [])
    .map(normalizeEventDefaultRiskInput)
    .filter((risk) => risk.risk_text);

  const deleteExisting = await access.supabase.from("event_default_risks").delete().eq("category_key", categoryKey).eq("event_label", eventLabel);
  if (deleteExisting.error) return NextResponse.json({ error: deleteExisting.error.message }, { status: 500 });

  if (normalizedRisks.length) {
    const { error } = await access.supabase.from("event_default_risks").insert(
      normalizedRisks.map((risk, index) => ({
        category_key: categoryKey,
        category_label: categoryLabel,
        event_label: eventLabel,
        risk_text: risk.risk_text,
        risk_level: risk.risk_level,
        likelihood: risk.likelihood,
        order_index: index,
      })),
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const applyResult = await applyDefaultRisksToExistingRows(access.supabase, eventLabel);
    return NextResponse.json({ ok: true, ...applyResult });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to apply default risks" }, { status: 500 });
  }
}
