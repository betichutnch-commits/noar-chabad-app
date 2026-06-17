import { supabase } from "@/lib/supabaseClient";

/** Fetch to app API routes with session cookies and Bearer token fallback. */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  const headers = new Headers(init?.headers);
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? "include",
    headers,
  });
}
