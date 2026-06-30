import { getRowRegulationHints } from "@/lib/regulation/compliance";
import type { UploadedDocumentFile } from "@/lib/tripDocumentAutofill";

export type TripPlanLicenseTarget = {
  planRowId: string;
  scheduleLabel: string;
  occurrenceLabel: string;
  businessName: string;
  licenseFiles: UploadedDocumentFile[];
  insuranceFiles: UploadedDocumentFile[];
  uploadedFiles: UploadedDocumentFile[];
  status: "open" | "done";
};

export type PlanRowLicenseInput = {
  id: string;
  eventText?: string | null;
  locationText?: string | null;
  locationSensitive?: boolean | null;
  scheduleLabel?: string | null;
  equipment?: Array<{ source_details?: string | null; source_type?: string | null }>;
};

export function classifyLicenseUploadKind(file: UploadedDocumentFile): "license" | "insurance" {
  return file.uploadKind === "insurance" ? "insurance" : "license";
}

export function splitLicenseUploadFiles(files: UploadedDocumentFile[]) {
  const licenseFiles: UploadedDocumentFile[] = [];
  const insuranceFiles: UploadedDocumentFile[] = [];
  for (const file of files) {
    if (classifyLicenseUploadKind(file) === "insurance") insuranceFiles.push(file);
    else licenseFiles.push(file);
  }
  return { licenseFiles, insuranceFiles };
}

export function licenseTargetStatus(licenseFiles: UploadedDocumentFile[], insuranceFiles: UploadedDocumentFile[]): TripPlanLicenseTarget["status"] {
  return licenseFiles.length > 0 && insuranceFiles.length > 0 ? "done" : "open";
}

export function resolveBusinessNameForPlanRow(row: PlanRowLicenseInput): string {
  const location = String(row.locationText || "").trim();
  const suppliers = new Set<string>();
  for (const equipment of row.equipment || []) {
    const details = String(equipment.source_details || "").trim();
    if (details) suppliers.add(details);
  }
  const supplierList = Array.from(suppliers);
  if (location && supplierList.some((name) => name !== location)) {
    return `${location} · ${supplierList.join(", ")}`;
  }
  if (location) return location;
  if (supplierList.length) return supplierList.join(", ");
  return "לא צוין — עדכנו מקום או ספק בלו״ז";
}

export function buildTripPlanLicenseTargets(planRows: PlanRowLicenseInput[]): TripPlanLicenseTarget[] {
  const targets: TripPlanLicenseTarget[] = [];
  for (const row of planRows) {
    if (!row.id) continue;
    if (!getRowRegulationHints(null, row.eventText).needsLicense) continue;
    const occurrenceLabel = String(row.eventText || "").trim() || "התרחשות";
    targets.push({
      planRowId: row.id,
      scheduleLabel: String(row.scheduleLabel || "").trim() || occurrenceLabel,
      occurrenceLabel,
      businessName: resolveBusinessNameForPlanRow(row),
      licenseFiles: [],
      insuranceFiles: [],
      uploadedFiles: [],
      status: "open",
    });
  }
  return targets;
}

function applyFilesToTarget(target: TripPlanLicenseTarget, files: UploadedDocumentFile[]) {
  target.uploadedFiles = files;
  const split = splitLicenseUploadFiles(files);
  target.licenseFiles = split.licenseFiles;
  target.insuranceFiles = split.insuranceFiles;
  target.status = licenseTargetStatus(split.licenseFiles, split.insuranceFiles);
}

export function assignLicenseFilesToTargets(
  targets: TripPlanLicenseTarget[],
  allFiles: UploadedDocumentFile[],
): { targets: TripPlanLicenseTarget[]; unmatchedFiles: UploadedDocumentFile[] } {
  const nextTargets: TripPlanLicenseTarget[] = targets.map((target) => ({
    ...target,
    licenseFiles: [],
    insuranceFiles: [],
    uploadedFiles: [],
    status: "open" as const,
  }));
  const byRowId = new Map(nextTargets.map((target) => [target.planRowId, target]));
  const unmatchedFiles: UploadedDocumentFile[] = [];

  for (const file of allFiles) {
    const rowId = String(file.planRowId || "").trim();
    const target = rowId ? byRowId.get(rowId) : undefined;
    if (target) target.uploadedFiles.push(file);
    else unmatchedFiles.push(file);
  }

  if (nextTargets.length === 1 && unmatchedFiles.length) {
    applyFilesToTarget(nextTargets[0], [...nextTargets[0].uploadedFiles, ...unmatchedFiles]);
    return { targets: nextTargets, unmatchedFiles: [] };
  }

  for (const target of nextTargets) {
    applyFilesToTarget(target, target.uploadedFiles);
  }

  return { targets: nextTargets, unmatchedFiles };
}

export function formatUploadedFileAssociation(file: UploadedDocumentFile): string {
  const schedule = String(file.scheduleLabel || "").trim();
  const business = String(file.businessName || "").trim();
  const occurrence = String(file.occurrenceLabel || "").trim();
  const kindLabel = file.uploadKind === "insurance" ? "ביטוח" : file.uploadKind === "license" ? "רישוי עסק" : "";
  const parts = [kindLabel, schedule || occurrence, business ? `עסק: ${business}` : ""].filter(Boolean);
  return parts.join(" · ");
}
