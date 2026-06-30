import type { SupabaseClient } from "@supabase/supabase-js";

export const APP_SETTING_KEYS = {
  sustainabilityMotifsEnabled: "sustainability_motifs_enabled",
} as const;

type AppSettingKey = (typeof APP_SETTING_KEYS)[keyof typeof APP_SETTING_KEYS];

function parseBooleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export async function getAppSettingBoolean(
  supabase: SupabaseClient,
  key: AppSettingKey,
  fallback = true,
): Promise<boolean> {
  const { data, error } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
  if (error) {
    if (String(error.message || "").includes("app_settings")) return fallback;
    throw error;
  }
  return parseBooleanValue(data?.value, fallback);
}

export async function setAppSettingBoolean(
  supabase: SupabaseClient,
  key: AppSettingKey,
  enabled: boolean,
  updatedBy: string,
): Promise<void> {
  const { error } = await supabase.from("app_settings").upsert(
    {
      key,
      value: enabled,
      updated_by: updatedBy,
    },
    { onConflict: "key" },
  );
  if (error) throw error;
}
