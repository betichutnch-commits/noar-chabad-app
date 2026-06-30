import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";
import { canEditTripPlan } from "@/lib/tripPlan";

type RouteContext = { params: Promise<{ id: string }> };
type Body = {
  action: "updateDocument" | "deleteDocumentFile";
  documentKey?: string;
  fileUrl?: string | null;
  status?: string | null;
  owner?: string | null;
  note?: string | null;
  editUrl?: string | null;
  pdfUrl?: string | null;
  formData?: Record<string, unknown> | null;
};

async function canEdit(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, user: User, tripId: string) {
  const { data: profile } = await supabase.from("profiles").select("role, department, is_tech_admin").eq("id", user.id).single();
  const { data: trip } = await supabase.from("trips").select("id, user_id").eq("id", tripId).single();
  if (!trip) return { ok: false, code: 404 as const };
  return { ok: canEditTripPlan({ user, profile: profile || null, tripUserId: String(trip.user_id) }), code: 403 as const };
}

const isMissingDocumentsSchema = (message?: string | null) => Boolean(message && message.includes("trip_plan_document_overrides"));
const isMissingFormDataColumn = (message?: string | null) => Boolean(message && /form_data/i.test(message));
const SAFETY_OWNER = "מחלקת בטיחות ומפעלים";
const SAFETY_OWNER_DOCUMENT_KEYS = new Set(["moked-teva-approval"]);
const EMPTY_OWNER_UPLOAD_DOCUMENT_KEYS = new Set(["police-approvals", "business-license-insurance", "medic-security-certificates"]);

const documentOwnerValue = (documentKey: string, owner?: string | null) => {
  const trimmed = String(owner || "").trim();
  if (EMPTY_OWNER_UPLOAD_DOCUMENT_KEYS.has(documentKey) && trimmed === SAFETY_OWNER) return null;
  return trimmed || null;
};

type UploadedDocumentFile = {
  url: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  planRowId?: string;
  scheduleLabel?: string;
  occurrenceLabel?: string;
  businessName?: string;
  uploadKind?: "license" | "insurance";
};

const getUploadedFiles = (formData: unknown, legacyPdfUrl?: string | null): UploadedDocumentFile[] => {
  const data = formData && typeof formData === "object" ? (formData as Record<string, unknown>) : {};
  const rawFiles = Array.isArray(data.uploadedFiles) ? data.uploadedFiles : [];
  const files = rawFiles
    .map((file): UploadedDocumentFile | null => {
      if (!file || typeof file !== "object") return null;
      const record = file as Record<string, unknown>;
      const url = String(record.url || "").trim();
      if (!url) return null;
      return {
        url,
        name: String(record.name || "מסמך"),
        type: String(record.type || ""),
        size: Number(record.size || 0),
        uploadedAt: String(record.uploadedAt || ""),
        planRowId: String(record.planRowId || "").trim() || undefined,
        scheduleLabel: String(record.scheduleLabel || "").trim() || undefined,
        occurrenceLabel: String(record.occurrenceLabel || "").trim() || undefined,
        businessName: String(record.businessName || "").trim() || undefined,
        uploadKind: record.uploadKind === "insurance" ? "insurance" : record.uploadKind === "license" ? "license" : undefined,
      };
    })
    .filter((file): file is UploadedDocumentFile => Boolean(file));
  const legacy = String(legacyPdfUrl || "").trim();
  if (legacy && !files.some((file) => file.url === legacy)) {
    files.unshift({ url: legacy, name: "מסמך קודם", type: "application/pdf", size: 0, uploadedAt: "" });
  }
  return files;
};

const removeStorageFiles = async (admin: SupabaseClient, urls: string[]) => {
  const paths = urls
    .map((url) => String(url || "").trim())
    .filter((url) => url.startsWith("trip-files/"))
    .map((url) => url.slice("trip-files/".length));
  if (paths.length) await admin.storage.from("trip-files").remove(paths);
};

const storageSafeFileName = (fileName: string) => {
  const extension = fileName.includes(".") ? fileName.split(".").pop() || "bin" : "bin";
  const safeExtension = extension.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
  return `${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;
};

const serverError = (step: string, error: unknown, status = 500) => {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
  console.error(`[trip-plan-documents] ${step}`, error);
  return NextResponse.json({ error: message || "פעולת המסמך נכשלה" }, { status });
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

  const query = await supabase
    .from("trip_plan_document_overrides")
    .select("id, document_key, status, owner, note, edit_url, pdf_url, form_data")
    .eq("trip_id", id);
  let data: Array<Record<string, unknown>> | null = query.data;
  let error = query.error;
  if (isMissingFormDataColumn(error?.message)) {
    const fallback = await supabase
      .from("trip_plan_document_overrides")
      .select("id, document_key, status, owner, note, edit_url, pdf_url")
      .eq("trip_id", id);
    data = fallback.data;
    error = fallback.error;
  }
  if (isMissingDocumentsSchema(error?.message)) return NextResponse.json({ ok: true, schemaMissing: true, documents: [] });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, schemaMissing: false, documents: data || [] });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Body;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await canEdit(supabase, user as User, id);
  if (!access.ok) return NextResponse.json({ error: access.code === 404 ? "Trip not found" : "Forbidden" }, { status: access.code });
  const admin = createSupabaseServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 503 });

  const documentKey = String(body.documentKey || "").trim();
  if (!documentKey) return NextResponse.json({ error: "Missing document key" }, { status: 400 });

  if (body.action === "deleteDocumentFile") {
    const { data: existing, error: existingError } = await admin
      .from("trip_plan_document_overrides")
      .select("owner, note, pdf_url, form_data")
      .eq("trip_id", id)
      .eq("document_key", documentKey)
      .maybeSingle();
    if (isMissingFormDataColumn(existingError?.message)) {
      return NextResponse.json({ error: "Missing form_data column. Please run the trip plan documents form_data migration." }, { status: 500 });
    }
    if (isMissingDocumentsSchema(existingError?.message)) return NextResponse.json({ error: "Documents schema missing" }, { status: 500 });
    if (existingError) return serverError("delete lookup failed", existingError);

    const files = getUploadedFiles(existing?.form_data, existing?.pdf_url);
    const requestedUrl = String(body.fileUrl || "").trim();
    const filesToDelete = requestedUrl ? files.filter((file) => file.url === requestedUrl) : files;
    await removeStorageFiles(
      admin,
      filesToDelete.map((file) => file.url),
    );
    const remainingFiles = requestedUrl ? files.filter((file) => file.url !== requestedUrl) : [];
    const nextFormData = { ...((existing?.form_data && typeof existing.form_data === "object" ? existing.form_data : {}) as Record<string, unknown>), uploadedFiles: remainingFiles };

    const { error } = await admin
      .from("trip_plan_document_overrides")
      .upsert(
        {
          trip_id: id,
          document_key: documentKey,
          status: remainingFiles.length ? "מוכן PDF" : null,
          owner: SAFETY_OWNER_DOCUMENT_KEYS.has(documentKey) ? SAFETY_OWNER : documentOwnerValue(documentKey, body.owner || existing?.owner),
          note: body.note || existing?.note || null,
          edit_url: null,
          pdf_url: remainingFiles[0]?.url || null,
          form_data: nextFormData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "trip_id,document_key" },
      );
    if (error) return serverError("delete upsert failed", error);
    return NextResponse.json({ ok: true });
  }

  if (body.action !== "updateDocument") return NextResponse.json({ error: "Unsupported action" }, { status: 400 });

  const row: Record<string, unknown> = {
      trip_id: id,
      document_key: documentKey,
      status: body.status || null,
      owner: body.owner || null,
      note: body.note || null,
      edit_url: body.editUrl || null,
      pdf_url: body.pdfUrl || null,
      updated_at: new Date().toISOString(),
    };
  if ("formData" in body) row.form_data = body.formData || null;

  let { error } = await supabase.from("trip_plan_document_overrides").upsert(
    row,
    { onConflict: "trip_id,document_key" },
  );
  if (isMissingFormDataColumn(error?.message)) {
    const fallbackRow = { ...row };
    delete fallbackRow.form_data;
    const fallback = await supabase.from("trip_plan_document_overrides").upsert(
      fallbackRow,
      { onConflict: "trip_id,document_key" },
    );
    error = fallback.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
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
  const action = String(formData.get("action") || "");
  const documentKey = String(formData.get("documentKey") || "").trim();
  const file = formData.get("file");
  if (action !== "uploadDocumentFile") return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  if (!documentKey) return NextResponse.json({ error: "Missing document key" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "ניתן להעלות PDF או תמונה בלבד" }, { status: 400 });
  }

  const storagePath = `${user.id}/trip-plan-documents/${id}/${documentKey}/${storageSafeFileName(file.name)}`;
  const upload = await admin.storage.from("trip-files").upload(storagePath, file, { upsert: false });
  if (upload.error) return serverError("storage upload failed", upload.error);

  const existingQuery = await admin
    .from("trip_plan_document_overrides")
    .select("owner, note, form_data, pdf_url")
    .eq("trip_id", id)
    .eq("document_key", documentKey)
    .maybeSingle();
  if (isMissingFormDataColumn(existingQuery.error?.message)) {
    await removeStorageFiles(admin, [`trip-files/${storagePath}`]);
    return NextResponse.json({ error: "Missing form_data column. Please run the trip plan documents form_data migration." }, { status: 500 });
  }
  if (existingQuery.error) {
    await removeStorageFiles(admin, [`trip-files/${storagePath}`]);
    return serverError("uploaded file metadata lookup failed", existingQuery.error);
  }

  const uploadedFile: UploadedDocumentFile = {
    url: `trip-files/${storagePath}`,
    name: file.name,
    type: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    planRowId: String(formData.get("planRowId") || "").trim() || undefined,
    scheduleLabel: String(formData.get("scheduleLabel") || "").trim() || undefined,
    occurrenceLabel: String(formData.get("occurrenceLabel") || "").trim() || undefined,
    businessName: String(formData.get("businessName") || "").trim() || undefined,
    uploadKind:
      String(formData.get("uploadKind") || "").trim() === "insurance"
        ? "insurance"
        : String(formData.get("uploadKind") || "").trim() === "license"
          ? "license"
          : undefined,
  };
  const existingFormData = existingQuery.data?.form_data && typeof existingQuery.data.form_data === "object" ? (existingQuery.data.form_data as Record<string, unknown>) : {};
  const uploadedFiles = [...getUploadedFiles(existingQuery.data?.form_data, existingQuery.data?.pdf_url), uploadedFile];
  const row: Record<string, unknown> = {
    trip_id: id,
    document_key: documentKey,
    status: "מוכן PDF",
    owner: SAFETY_OWNER_DOCUMENT_KEYS.has(documentKey) ? SAFETY_OWNER : documentOwnerValue(documentKey, existingQuery.data?.owner),
    note: existingQuery.data?.note || null,
    edit_url: null,
    pdf_url: uploadedFiles[0]?.url || uploadedFile.url,
    form_data: { ...existingFormData, uploadedFiles },
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("trip_plan_document_overrides").upsert(row, { onConflict: "trip_id,document_key" });
  if (isMissingDocumentsSchema(error?.message)) return NextResponse.json({ error: "Documents schema missing" }, { status: 500 });
  if (error) return serverError("uploaded file metadata upsert failed", error);
  return NextResponse.json({ ok: true, pdfUrl: uploadedFile.url, uploadedFile });
}
