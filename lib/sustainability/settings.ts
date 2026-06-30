import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_SETTING_KEYS, getAppSettingBoolean, setAppSettingBoolean } from "@/lib/appSettings";

export async function getSustainabilityMotifsEnabledFromDb(
  supabase: SupabaseClient,
  fallback = true,
): Promise<boolean> {
  return getAppSettingBoolean(supabase, APP_SETTING_KEYS.sustainabilityMotifsEnabled, fallback);
}

export async function setSustainabilityMotifsEnabledInDb(
  supabase: SupabaseClient,
  enabled: boolean,
  updatedBy: string,
): Promise<void> {
  return setAppSettingBoolean(supabase, APP_SETTING_KEYS.sustainabilityMotifsEnabled, enabled, updatedBy);
}
