import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const bearerFromRequest = (request?: Request) =>
  request?.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim() || "";

export async function createAuthedSupabaseClient(request?: Request): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const bearerToken = bearerFromRequest(request);

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
    ...(bearerToken
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          },
        }
      : {}),
  });
}

export async function getRouteAuthUser(request?: Request): Promise<{
  supabase: SupabaseClient;
  user: User | null;
}> {
  const supabase = await createAuthedSupabaseClient(request);
  const bearerToken = bearerFromRequest(request);

  const cookieResult = await supabase.auth.getUser();
  if (cookieResult.data.user) {
    return { supabase, user: cookieResult.data.user };
  }

  if (bearerToken) {
    const tokenResult = await supabase.auth.getUser(bearerToken);
    if (tokenResult.data.user) {
      return { supabase, user: tokenResult.data.user };
    }
  }

  return { supabase, user: null };
}
