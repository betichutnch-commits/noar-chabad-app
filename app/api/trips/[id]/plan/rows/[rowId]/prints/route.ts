import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";
import { getRouteAuthUser } from "@/lib/supabaseRouteHandler";
import { canEditTripPlan } from "@/lib/tripPlan";

type RouteContext = { params: Promise<{ id: string; rowId: string }> };

const storageSafeFileName = (fileName: string) => {
  const extension = fileName.includes(".") ? fileName.split(".").pop() || "bin" : "bin";
  const safeExtension = extension.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
  const base = fileName.replace(/\.[^.]+$/, "").replace(/\s+/g, "_").replace(/[^\w.-]/g, "").slice(0, 80);
  return `${Date.now()}-${base || "print"}.${safeExtension}`;
};

const removeStorageFile = async (admin: SupabaseClient, storagePath: string) => {
  const normalized = storagePath.startsWith("trip-files/") ? storagePath.slice("trip-files/".length) : storagePath;
  if (normalized) await admin.storage.from("trip-files").remove([normalized]);
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id, rowId } = await params;
  const { supabase, user } = await getRouteAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "יש להתחבר מחדש כדי להעלות הדפסה" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, department, is_tech_admin")
    .eq("id", user.id)
    .single();
  const { data: trip } = await supabase.from("trips").select("id, user_id").eq("id", id).single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (!canEditTripPlan({ user: user as User, profile: profile || null, tripUserId: String(trip.user_id) })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "שרת לא מוגדר להעלאת קבצים" }, { status: 503 });
  }

  const { data: planRow } = await supabase.from("trip_plan_rows").select("id, plan_id").eq("id", rowId).maybeSingle();
  if (!planRow) {
    return NextResponse.json({ error: "שורת הלו״ז לא נמצאה. שמור את השורה ונסה שוב." }, { status: 404 });
  }
  const { data: plan } = await supabase.from("trip_plans").select("trip_id").eq("id", planRow.plan_id).maybeSingle();
  if (!plan || String(plan.trip_id) !== id) {
    return NextResponse.json({ error: "שורה לא שייכת לטיול" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  const quantity = Number(String(formData.get("quantity") || "0")) || null;
  const print_size = String(formData.get("print_size") || "").trim() || null;
  const page_type = String(formData.get("page_type") || "").trim() || null;
  const print_location = String(formData.get("print_location") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  const storagePath = `${user.id}/trip-plan-prints/${id}/${rowId}/${storageSafeFileName(file.name)}`;
  const upload = await admin.storage.from("trip-files").upload(storagePath, file, { upsert: false });
  if (upload.error) {
    return NextResponse.json({ error: upload.error.message || "העלאת הקובץ נכשלה" }, { status: 500 });
  }

  const { count } = await admin
    .from("trip_plan_row_prints")
    .select("id", { count: "exact", head: true })
    .eq("row_id", rowId);
  const orderIndex = count || 0;

  const printPayload = {
    row_id: rowId,
    order_index: orderIndex,
    file_path: storagePath,
    file_name: file.name,
    quantity,
    print_size,
    page_type,
    print_location,
    file_size_bytes: file.size,
    notes,
  };
  const basePrintPayload = {
    row_id: rowId,
    order_index: orderIndex,
    file_path: storagePath,
    file_name: file.name,
    quantity,
    file_size_bytes: file.size,
    notes,
  };

  let inserted = await admin.from("trip_plan_row_prints").insert(printPayload).select("*").single();
  if (inserted.error && String(inserted.error.message || "").match(/print_size|page_type|print_location/)) {
    inserted = await admin.from("trip_plan_row_prints").insert(basePrintPayload).select("*").single();
  }
  if (inserted.error || !inserted.data) {
    await removeStorageFile(admin, storagePath);
    return NextResponse.json(
      { error: inserted.error?.message || "שמירת פרטי ההדפסה נכשלה" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, item: inserted.data });
}
