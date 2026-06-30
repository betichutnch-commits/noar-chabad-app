import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";
import { getRouteAuthUser } from "@/lib/supabaseRouteHandler";
import { canEditTripPlan } from "@/lib/tripPlan";

type RouteContext = { params: Promise<{ id: string; rowId: string }> };

const storageSafeFileName = (fileName: string, prefix = "design") => {
  const extension = fileName.includes(".") ? fileName.split(".").pop() || "bin" : "bin";
  const safeExtension = extension.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
  const base = fileName.replace(/\.[^.]+$/, "").replace(/\s+/g, "_").replace(/[^\w.-]/g, "").slice(0, 80);
  return `${Date.now()}-${prefix}-${base || "file"}.${safeExtension}`;
};

const removeStorageFile = async (admin: SupabaseClient, storagePath: string | null | undefined) => {
  if (!storagePath) return;
  const normalized = storagePath.startsWith("trip-files/") ? storagePath.slice("trip-files/".length) : storagePath;
  if (normalized) await admin.storage.from("trip-files").remove([normalized]);
};

async function requireRowAccess(id: string, rowId: string, request: Request) {
  const { supabase, user } = await getRouteAuthUser(request);
  if (!user) {
    return { error: NextResponse.json({ error: "יש להתחבר מחדש" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, department, is_tech_admin")
    .eq("id", user.id)
    .single();
  const { data: trip } = await supabase.from("trips").select("id, user_id").eq("id", id).single();
  if (!trip) return { error: NextResponse.json({ error: "Trip not found" }, { status: 404 }) };
  if (!canEditTripPlan({ user: user as User, profile: profile || null, tripUserId: String(trip.user_id) })) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const { data: planRow } = await supabase.from("trip_plan_rows").select("id, plan_id").eq("id", rowId).maybeSingle();
  if (!planRow) {
    return { error: NextResponse.json({ error: "שורת הלו״ז לא נמצאה. שמור את השורה ונסה שוב." }, { status: 404 }) };
  }
  const { data: plan } = await supabase.from("trip_plans").select("trip_id").eq("id", planRow.plan_id).maybeSingle();
  if (!plan || String(plan.trip_id) !== id) {
    return { error: NextResponse.json({ error: "שורה לא שייכת לטיול" }, { status: 404 }) };
  }
  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return { error: NextResponse.json({ error: "שרת לא מוגדר להעלאת קבצים" }, { status: 503 }) };
  }
  return { supabase, user, admin, rowId };
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id, rowId } = await params;
  const access = await requireRowAccess(id, rowId, request);
  if (access.error) return access.error;
  const { user, admin } = access;

  const formData = await request.formData();
  const document_name = String(formData.get("document_name") || "").trim();
  if (!document_name) return NextResponse.json({ error: "שם המסמך הוא שדה חובה" }, { status: 400 });

  const content_mode = String(formData.get("content_mode") || "text") === "file" ? "file" : "text";
  const designer_name = String(formData.get("designer_name") || "").trim() || null;
  const size_settings = String(formData.get("size_settings") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  const document_text = String(formData.get("document_text") || "").trim() || null;
  const designer_instructions = String(formData.get("designer_instructions") || "").trim() || null;
  const status = String(formData.get("status") || "").trim() || "לביצוע";

  let brief_file_path: string | null = null;
  let brief_file_name: string | null = null;
  let output_file_path: string | null = null;
  let output_file_name: string | null = null;

  const briefFile = formData.get("brief_file");
  if (briefFile instanceof File && briefFile.size > 0) {
    const storagePath = `${user!.id}/trip-plan-designs/${id}/${rowId}/${storageSafeFileName(briefFile.name, "brief")}`;
    const upload = await admin!.storage.from("trip-files").upload(storagePath, briefFile, { upsert: false });
    if (upload.error) return NextResponse.json({ error: upload.error.message || "העלאת קובץ ההנחיות נכשלה" }, { status: 500 });
    brief_file_path = storagePath;
    brief_file_name = briefFile.name;
  }

  const outputFile = formData.get("output_file");
  if (outputFile instanceof File && outputFile.size > 0) {
    const storagePath = `${user!.id}/trip-plan-designs/${id}/${rowId}/${storageSafeFileName(outputFile.name, "output")}`;
    const upload = await admin!.storage.from("trip-files").upload(storagePath, outputFile, { upsert: false });
    if (upload.error) {
      await removeStorageFile(admin!, brief_file_path);
      return NextResponse.json({ error: upload.error.message || "העלאת קובץ העיצוב נכשלה" }, { status: 500 });
    }
    output_file_path = storagePath;
    output_file_name = outputFile.name;
  }

  const { count } = await admin!
    .from("trip_plan_row_designs")
    .select("id", { count: "exact", head: true })
    .eq("row_id", rowId);
  const orderIndex = count || 0;

  const payload = {
    row_id: rowId,
    order_index: orderIndex,
    document_name,
    designer_name,
    size_settings,
    notes,
    content_mode: content_mode === "file" || brief_file_path ? "file" : "text",
    document_text: content_mode === "text" ? document_text : null,
    designer_instructions: content_mode === "text" ? designer_instructions : null,
    brief_file_path,
    brief_file_name,
    output_file_path,
    output_file_name,
    status,
    updated_at: new Date().toISOString(),
  };

  const inserted = await admin!.from("trip_plan_row_designs").insert(payload).select("*").single();
  if (inserted.error || !inserted.data) {
    await removeStorageFile(admin!, brief_file_path);
    await removeStorageFile(admin!, output_file_path);
    return NextResponse.json({ error: inserted.error?.message || "שמירת העיצוב נכשלה" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: inserted.data });
}
