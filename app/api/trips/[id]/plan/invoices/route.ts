import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";
import { canEditTripPlan } from "@/lib/tripPlan";

type RouteContext = { params: Promise<{ id: string }> };
type PatchBody = {
  id?: string;
  equipmentId?: string | null;
  amount?: number | string | null;
  supplierName?: string | null;
  invoiceNumber?: string | null;
  notes?: string | null;
  submissionStatus?: string | null;
};

const isMissingInvoicesSchema = (message?: string | null) => Boolean(message && message.includes("trip_plan_invoices"));

async function canEdit(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, user: User, tripId: string) {
  const { data: profile } = await supabase.from("profiles").select("role, department, is_tech_admin").eq("id", user.id).single();
  const { data: trip } = await supabase.from("trips").select("id, user_id").eq("id", tripId).single();
  if (!trip) return { ok: false, code: 404 as const };
  return { ok: canEditTripPlan({ user, profile: profile || null, tripUserId: String(trip.user_id) }), code: 403 as const };
}

const moneyValue = (value: unknown) => {
  if (value === "" || value == null) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const textValue = (value: unknown) => String(value ?? "").trim();

const storageSafeFileName = (fileName: string) => {
  const extension = fileName.includes(".") ? fileName.split(".").pop() || "bin" : "bin";
  const safeExtension = extension.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
  return `${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;
};

const removeStorageFiles = async (admin: SupabaseClient, urls: string[]) => {
  const paths = urls
    .map((url) => textValue(url))
    .filter((url) => url.startsWith("trip-files/"))
    .map((url) => url.slice("trip-files/".length));
  if (paths.length) await admin.storage.from("trip-files").remove(paths);
};

const serverError = (step: string, error: unknown, status = 500) => {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
  console.error(`[trip-plan-invoices] ${step}`, error);
  return NextResponse.json({ error: message || "פעולת החשבונית נכשלה" }, { status });
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await canEdit(supabase, user as User, id);
  if (!access.ok) return NextResponse.json({ error: access.code === 404 ? "Trip not found" : "Forbidden" }, { status: access.code });

  const { data, error } = await supabase
    .from("trip_plan_invoices")
    .select("id, trip_id, equipment_id, amount, supplier_name, invoice_number, notes, file_url, file_name, file_type, file_size, submission_status, submitted_at, submitted_to_profile_id, created_by, created_at, updated_at")
    .eq("trip_id", id)
    .order("created_at", { ascending: false });
  if (isMissingInvoicesSchema(error?.message)) return NextResponse.json({ ok: true, schemaMissing: true, invoices: [] });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, schemaMissing: false, invoices: data || [] });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await canEdit(supabase, user as User, id);
  if (!access.ok) return NextResponse.json({ error: access.code === 404 ? "Trip not found" : "Forbidden" }, { status: access.code });
  const admin = createSupabaseServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 503 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "יש לבחור קובץ חשבונית" }, { status: 400 });
  if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "ניתן להעלות PDF או תמונה בלבד" }, { status: 400 });
  }

  const amount = moneyValue(formData.get("amount"));
  const storagePath = `${user.id}/trip-plan-invoices/${id}/${storageSafeFileName(file.name)}`;
  const upload = await admin.storage.from("trip-files").upload(storagePath, file, { upsert: false });
  if (upload.error) return serverError("storage upload failed", upload.error);

  const row = {
    trip_id: id,
    equipment_id: textValue(formData.get("equipmentId")) || null,
    amount,
    supplier_name: textValue(formData.get("supplierName")) || null,
    invoice_number: textValue(formData.get("invoiceNumber")) || null,
    notes: textValue(formData.get("notes")) || null,
    file_url: `trip-files/${storagePath}`,
    file_name: file.name,
    file_type: file.type || null,
    file_size: file.size || null,
    submission_status: "draft",
    created_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin.from("trip_plan_invoices").insert(row).select("*").single();
  if (isMissingInvoicesSchema(error?.message)) {
    await removeStorageFiles(admin, [`trip-files/${storagePath}`]);
    return NextResponse.json({ error: "Invoices schema missing" }, { status: 500 });
  }
  if (error) {
    await removeStorageFiles(admin, [`trip-files/${storagePath}`]);
    return serverError("invoice insert failed", error);
  }
  return NextResponse.json({ ok: true, invoice: data });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as PatchBody;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await canEdit(supabase, user as User, id);
  if (!access.ok) return NextResponse.json({ error: access.code === 404 ? "Trip not found" : "Forbidden" }, { status: access.code });
  if (!body.id) return NextResponse.json({ error: "Missing invoice id" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("equipmentId" in body) patch.equipment_id = textValue(body.equipmentId) || null;
  if ("amount" in body) patch.amount = moneyValue(body.amount);
  if ("supplierName" in body) patch.supplier_name = textValue(body.supplierName) || null;
  if ("invoiceNumber" in body) patch.invoice_number = textValue(body.invoiceNumber) || null;
  if ("notes" in body) patch.notes = textValue(body.notes) || null;
  if ("submissionStatus" in body) patch.submission_status = textValue(body.submissionStatus) || "draft";

  const { error } = await supabase.from("trip_plan_invoices").update(patch).eq("id", body.id).eq("trip_id", id);
  if (isMissingInvoicesSchema(error?.message)) return NextResponse.json({ error: "Invoices schema missing" }, { status: 500 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { id?: string };
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await canEdit(supabase, user as User, id);
  if (!access.ok) return NextResponse.json({ error: access.code === 404 ? "Trip not found" : "Forbidden" }, { status: access.code });
  if (!body.id) return NextResponse.json({ error: "Missing invoice id" }, { status: 400 });
  const admin = createSupabaseServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 503 });

  const existing = await admin.from("trip_plan_invoices").select("file_url").eq("id", body.id).eq("trip_id", id).maybeSingle();
  if (isMissingInvoicesSchema(existing.error?.message)) return NextResponse.json({ error: "Invoices schema missing" }, { status: 500 });
  if (existing.error) return serverError("invoice lookup failed", existing.error);
  if (existing.data?.file_url) await removeStorageFiles(admin, [existing.data.file_url]);

  const { error } = await admin.from("trip_plan_invoices").delete().eq("id", body.id).eq("trip_id", id);
  if (error) return serverError("invoice delete failed", error);
  return NextResponse.json({ ok: true });
}
