import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { isManagerUser, isTechAdminUser } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";
import { notifyUserIds } from "@/lib/notifications";

type RouteContext = { params: Promise<unknown> };
type ReplyBody = { reply: string };

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = (await params) as { id: string };
  const body = (await request.json()) as ReplyBody;
  const reply = String(body?.reply || "").trim();

  if (!reply) {
    return NextResponse.json({ error: "Reply is required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, department, is_tech_admin")
    .eq("id", user.id)
    .single();

  const userLike = { id: user.id, user_metadata: user.user_metadata ?? {} } as User;
  if (!isManagerUser(userLike, profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: messageRow, error: messageLoadError } = await supabase
    .from("contact_messages")
    .select("id, user_id, subject, category")
    .eq("id", id)
    .single();

  if (messageLoadError || !messageRow) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const isBugCategory = String(messageRow.category || "general").toLowerCase() === "bug";
  if (isBugCategory && !isTechAdminUser(userLike, profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("contact_messages")
    .update({
      admin_response: reply,
      replied_at: now,
      status: "treated",
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await notifyUserIds([messageRow.user_id], {
    kind: "contact.reply",
    title: "התקבלה תשובה לפנייתך",
    body: `המנהל השיב לפנייתך בנושא: "${messageRow.subject}".`,
    url: "/dashboard/inbox",
    inAppType: "success",
  });

  return NextResponse.json({ ok: true });
}
