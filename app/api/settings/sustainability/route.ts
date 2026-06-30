import { NextResponse } from "next/server";
import { getSustainabilityMotifsEnabledFromDb } from "@/lib/sustainability/settings";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";

export async function GET() {
  const serviceSupabase = createSupabaseServiceRoleClient();
  const supabase = serviceSupabase || (await createSupabaseServerClient());
  const enabled = await getSustainabilityMotifsEnabledFromDb(supabase, true);
  return NextResponse.json(
    { ok: true, enabled },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
