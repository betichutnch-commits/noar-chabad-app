import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isManagerUser } from "@/lib/auth";
import {
  getSustainabilityMotifsEnabledFromDb,
  setSustainabilityMotifsEnabledInDb,
} from "@/lib/sustainability/settings";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

async function requireManager() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false, status: 401 as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, department, is_tech_admin")
    .eq("id", user.id)
    .single();
  return { supabase, user: user as User, ok: isManagerUser(user as User, profile || null), status: 403 as const };
}

export async function GET() {
  const access = await requireManager();
  if (!access.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const enabled = await getSustainabilityMotifsEnabledFromDb(access.supabase);
  return NextResponse.json({ ok: true, enabled });
}

export async function PUT(request: Request) {
  const access = await requireManager();
  if (!access.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { enabled?: boolean };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Missing enabled flag" }, { status: 400 });
  }

  try {
    await setSustainabilityMotifsEnabledInDb(access.supabase, body.enabled, access.user.id);
    return NextResponse.json({ ok: true, enabled: body.enabled });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save setting" },
      { status: 500 },
    );
  }
}
