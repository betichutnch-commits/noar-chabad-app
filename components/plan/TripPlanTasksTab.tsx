"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  ClipboardCopy,
  FileCheck2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MokedTevaTripDataDialog } from "@/components/plan/MokedTevaTripDataDialog";
import type { TripPlanTask, TripPlanTaskUploadContext } from "@/lib/tripPlanTasks";
import { formatUploadedFileAssociation, splitLicenseUploadFiles } from "@/lib/tripPlanLicenseTargets";
import type { UploadedDocumentFile } from "@/lib/tripDocumentAutofill";
import type { MokedTevaTripCopyData } from "@/lib/mokedTevaTripCopyData";

type TripPlanTasksTabProps = {
  active: boolean;
  tasks: TripPlanTask[];
  mokedTevaTripCopyData: MokedTevaTripCopyData;
  loading?: boolean;
  error?: string;
  uploadingDocumentKey?: string | null;
  onRefresh: () => void;
  onUploadFile: (documentKey: string, file: File, context?: TripPlanTaskUploadContext) => void | Promise<void>;
  onOpenFile: (url: string) => void;
  onDeleteFile: (documentKey: string, fileUrl?: string) => void;
  onNoteChange: (documentKey: string, note: string) => void;
  focusRowKey?: string | null;
  onFocusRowHandled?: () => void;
};

type TaskTableRow = {
  key: string;
  title: string;
  subtitle?: string;
  owner: string;
  status: TripPlanTask["status"];
  note: string;
  documentKey?: string;
  task: TripPlanTask;
  uploadContext?: TripPlanTaskUploadContext;
  files: UploadedDocumentFile[];
  licenseFiles: UploadedDocumentFile[];
  insuranceFiles: UploadedDocumentFile[];
  hasSplitUploads: boolean;
  showMokedTevaData: boolean;
};

function statusLabel(status: TripPlanTask["status"]) {
  if (status === "done") return "הושלם";
  if (status === "not_required") return "לא נדרש";
  return "פתוח";
}

function statusTone(status: TripPlanTask["status"]) {
  if (status === "done") return "border-emerald-100 bg-state-success-bg text-state-success";
  if (status === "not_required") return "border-border-subtle bg-surface-muted text-text-muted";
  return "border-amber-100 bg-state-warning-bg text-state-warning";
}

function rowTheme(row: TaskTableRow) {
  if (row.showMokedTevaData) {
    return {
      rowClass: "border-r-4 border-r-brand-cyan",
      iconWrap: "bg-cyan-50 text-brand-cyan ring-1 ring-cyan-100",
      Icon: ShieldCheck,
      ownerClass: "border-cyan-100 bg-cyan-50 text-cyan-700",
    };
  }
  if (row.hasSplitUploads) {
    return {
      rowClass: "border-r-4 border-r-brand-pink",
      iconWrap: "bg-pink-50 text-brand-pink ring-1 ring-pink-100",
      Icon: FileCheck2,
      ownerClass: "border-pink-100 bg-pink-50 text-pink-700",
    };
  }
  return {
    rowClass: "border-r-4 border-r-brand-yellow",
    iconWrap: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    Icon: ClipboardList,
    ownerClass: "border-cyan-100 bg-cyan-50 text-cyan-700",
  };
}

function buildTaskRows(tasks: TripPlanTask[]): TaskTableRow[] {
  const rows: TaskTableRow[] = [];
  for (const task of tasks) {
    if (task.licenseTargets?.length) {
      for (const target of task.licenseTargets) {
        rows.push({
          key: `${task.id}:${target.planRowId}`,
          title: `${task.title} — ${target.occurrenceLabel}`,
          subtitle: `${target.scheduleLabel} · ${target.businessName}`,
          owner: task.owner,
          status: target.status,
          note: task.note,
          documentKey: task.documentKey,
          task,
          uploadContext: {
            planRowId: target.planRowId,
            scheduleLabel: target.scheduleLabel,
            occurrenceLabel: target.occurrenceLabel,
            businessName: target.businessName,
          },
          files: target.uploadedFiles,
          licenseFiles: target.licenseFiles,
          insuranceFiles: target.insuranceFiles,
          hasSplitUploads: true,
          showMokedTevaData: false,
        });
      }
      if (task.unmatchedLicenseFiles?.length) {
        const split = splitLicenseUploadFiles(task.unmatchedLicenseFiles);
        rows.push({
          key: `${task.id}:unmatched`,
          title: `${task.title} — קבצים ללא שיוך`,
          subtitle: "העלו מחדש מתוך השורה הרלוונטית בלו״ז",
          owner: task.owner,
          status: "open",
          note: task.note,
          documentKey: task.documentKey,
          task,
          files: task.unmatchedLicenseFiles,
          licenseFiles: split.licenseFiles,
          insuranceFiles: split.insuranceFiles,
          hasSplitUploads: true,
          showMokedTevaData: false,
        });
      }
      continue;
    }

    rows.push({
      key: task.id,
      title: task.title,
      subtitle: task.description,
      owner: task.owner,
      status: task.status,
      note: task.note,
      documentKey: task.documentKey,
      task,
      files: task.uploadedFiles,
      licenseFiles: [],
      insuranceFiles: [],
      hasSplitUploads: false,
      showMokedTevaData: task.id === "moked-teva-coordination",
    });
  }
  return rows;
}

function FileList({
  files,
  documentKey,
  uploadingDocumentKey,
  canDelete,
  onOpenFile,
  onDeleteFile,
}: {
  files: UploadedDocumentFile[];
  documentKey: string;
  uploadingDocumentKey?: string | null;
  canDelete: boolean;
  onOpenFile: (url: string) => void;
  onDeleteFile: (documentKey: string, fileUrl?: string) => void;
}) {
  if (!files.length) return null;
  return (
    <ul className="mt-1.5 space-y-1">
      {files.map((file) => (
        <li key={file.url} className="flex flex-wrap items-center gap-2 text-xs">
          <button type="button" onClick={() => onOpenFile(file.url)} className="font-bold text-brand-cyan underline">
            {file.name}
          </button>
          {formatUploadedFileAssociation(file) ? (
            <span className="text-[10px] font-bold text-gray-400">{formatUploadedFileAssociation(file)}</span>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              onClick={() => void onDeleteFile(documentKey, file.url)}
              disabled={uploadingDocumentKey === documentKey}
              className="inline-flex items-center gap-1 font-bold text-red-600"
            >
              <Trash2 size={11} />
              הסר
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function TripPlanTasksTab({
  active,
  tasks,
  mokedTevaTripCopyData,
  loading = false,
  error = "",
  uploadingDocumentKey = null,
  onRefresh,
  onUploadFile,
  onOpenFile,
  onDeleteFile,
  onNoteChange,
  focusRowKey = null,
  onFocusRowHandled,
}: TripPlanTasksTabProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<{ documentKey: string; context?: TripPlanTaskUploadContext } | null>(null);
  const [showMokedTevaData, setShowMokedTevaData] = useState(false);
  const [highlightRowKey, setHighlightRowKey] = useState<string | null>(null);
  const tableRows = useMemo(() => buildTaskRows(tasks), [tasks]);

  useEffect(() => {
    if (!active || !focusRowKey) return;
    setHighlightRowKey(focusRowKey);
    const timer = window.setTimeout(() => {
      const row = document.getElementById(`trip-task-row-${focusRowKey}`);
      row?.scrollIntoView({ block: "center", inline: "nearest" });
      onFocusRowHandled?.();
    }, 120);
    const clearTimer = window.setTimeout(() => setHighlightRowKey(null), 2600);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearTimer);
    };
  }, [active, focusRowKey, onFocusRowHandled]);

  const triggerUpload = (documentKey: string, context?: TripPlanTaskUploadContext) => {
    pendingUploadRef.current = { documentKey, context };
    uploadInputRef.current?.click();
  };

  if (!active) return null;

  const openCount = tableRows.filter((row) => row.status === "open").length;
  const doneCount = tableRows.filter((row) => row.status === "done").length;

  return (
    <div className="relative z-20 -mt-px rounded-b-3xl border border-t-0 border-cyan-100 bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.10)] md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-gray-800">
            <ClipboardList size={22} className="text-brand-cyan" />
            משימות הטיול
          </h2>
          <p className="mt-1 text-xs font-bold text-gray-500">
            משימות רגולטוריות ומסמכים לפי תוכן הלו״ז — כולל תיאום מוקד טבע ברמת הטיול.
          </p>
          {tableRows.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">
                {openCount} פתוחות
              </span>
              <span className="inline-flex items-center rounded-full border border-emerald-100 bg-state-success-bg px-2.5 py-1 text-[10px] font-black text-state-success">
                {doneCount} הושלמו
              </span>
              <span className="inline-flex items-center rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-brand-cyan">
                {tableRows.length} סה״כ
              </span>
            </div>
          ) : null}
        </div>
        <Button variant="outline" onClick={onRefresh} disabled={loading} className="h-10 px-4 py-2 text-xs">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          רענן
        </Button>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>
      ) : null}

      {!tasks.length && !loading ? (
        <div className="rounded-2xl border border-dashed border-cyan-100 bg-cyan-50/40 p-8 text-center">
          <p className="text-sm font-black text-gray-800">אין משימות רגולטוריות פתוחות לטיול זה</p>
          <p className="mt-1 text-xs font-bold text-gray-500">משימות ייווצרו אוטומטית לפי ההתרחשויות בלו״ז.</p>
        </div>
      ) : null}

      <input
        ref={uploadInputRef}
        type="file"
        multiple
        className="sr-only"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          const pending = pendingUploadRef.current;
          event.target.value = "";
          pendingUploadRef.current = null;
          if (!files.length || !pending) return;
          void (async () => {
            for (const file of files) {
              await onUploadFile(pending.documentKey, file, pending.context);
            }
          })();
        }}
      />

      {tableRows.length ? (
        <div className="overflow-x-auto rounded-2xl border border-cyan-100 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b border-cyan-100 bg-gradient-to-l from-brand-cyan to-cyan-500 text-[11px] font-black text-white">
              <tr>
                <th className="p-3 text-center">המשימה</th>
                <th className="min-w-[148px] p-3 text-center">פעולות</th>
                <th className="w-40 p-3 text-center">באחריות</th>
                <th className="w-28 p-3 text-center">סטטוס</th>
                <th className="min-w-[220px] p-3 text-center">הערה</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                const canUpload = Boolean(row.task.coordinatorCanUpload && row.documentKey);
                const isUploading = uploadingDocumentKey === row.documentKey;
                const theme = rowTheme(row);
                const RowIcon = theme.Icon;
                return (
                  <tr
                    key={row.key}
                    id={`trip-task-row-${row.key}`}
                    className={`border-t border-gray-100 align-top transition-colors even:bg-surface-muted/60 ${
                      highlightRowKey === row.key
                        ? "bg-cyan-50 ring-2 ring-inset ring-brand-cyan/30"
                        : theme.rowClass
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl ${theme.iconWrap}`}>
                          <RowIcon size={15} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-black text-gray-900">{row.title}</p>
                          {row.subtitle ? <p className="mt-1 text-xs font-bold text-gray-500">{row.subtitle}</p> : null}
                        </div>
                      </div>

                      {row.hasSplitUploads && row.documentKey ? (
                        row.licenseFiles.length || row.insuranceFiles.length ? (
                          <div className="mt-2 mr-10">
                            <FileList
                              files={[...row.licenseFiles, ...row.insuranceFiles]}
                              documentKey={row.documentKey}
                              uploadingDocumentKey={uploadingDocumentKey}
                              canDelete={canUpload}
                              onOpenFile={onOpenFile}
                              onDeleteFile={onDeleteFile}
                            />
                          </div>
                        ) : null
                      ) : (
                        <FileList
                          files={row.files}
                          documentKey={row.documentKey || ""}
                          uploadingDocumentKey={uploadingDocumentKey}
                          canDelete={canUpload}
                          onOpenFile={onOpenFile}
                          onDeleteFile={onDeleteFile}
                        />
                      )}
                    </td>
                    <td className="p-3 align-top">
                      <div className="mx-auto flex min-w-[132px] max-w-[148px] flex-col gap-2">
                        {row.hasSplitUploads && row.documentKey && canUpload ? (
                          <>
                            <button
                              type="button"
                              disabled={isUploading}
                              onClick={() =>
                                triggerUpload(row.documentKey!, {
                                  ...row.uploadContext,
                                  uploadKind: "license",
                                })
                              }
                              className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-2xl border border-pink-100 bg-white px-2 text-[11px] font-black text-brand-pink shadow-sm transition hover:-translate-y-0.5 hover:bg-pink-50 hover:shadow-md disabled:opacity-60"
                            >
                              {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                              העלאת רישוי עסק
                            </button>
                            <button
                              type="button"
                              disabled={isUploading}
                              onClick={() =>
                                triggerUpload(row.documentKey!, {
                                  ...row.uploadContext,
                                  uploadKind: "insurance",
                                })
                              }
                              className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-2xl border border-cyan-100 bg-white px-2 text-[11px] font-black text-brand-cyan shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-md disabled:opacity-60"
                            >
                              {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                              העלאת ביטוח
                            </button>
                          </>
                        ) : null}
                        {row.showMokedTevaData ? (
                          <button
                            type="button"
                            onClick={() => setShowMokedTevaData(true)}
                            className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-2xl border border-cyan-100 bg-white px-2 text-[11px] font-black text-brand-cyan shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-md"
                          >
                            <ClipboardCopy size={13} />
                            נתוני הטיול
                          </button>
                        ) : null}
                        {!row.hasSplitUploads && canUpload ? (
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => triggerUpload(row.documentKey!, row.uploadContext)}
                            className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-2xl border border-pink-100 bg-white px-2 text-[11px] font-black text-brand-pink shadow-sm transition hover:-translate-y-0.5 hover:bg-pink-50 hover:shadow-md disabled:opacity-60"
                          >
                            {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                            העלאת אישור
                          </button>
                        ) : null}
                        {!canUpload && !row.showMokedTevaData ? (
                          <span className="text-xs font-bold text-gray-400">—</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-[10px] font-black leading-snug ${theme.ownerClass}`}
                      >
                        {row.owner}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black ${statusTone(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="p-3">
                      {row.documentKey ? (
                        <textarea
                          value={row.note}
                          onChange={(event) => onNoteChange(row.documentKey!, event.target.value)}
                          rows={3}
                          placeholder="הערות למשימה..."
                          className="w-full rounded-xl border border-border-subtle bg-white px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-brand-cyan focus:ring-4 focus:ring-pink-100"
                        />
                      ) : (
                        <span className="text-xs font-bold text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {showMokedTevaData ? (
        <MokedTevaTripDataDialog data={mokedTevaTripCopyData} onClose={() => setShowMokedTevaData(false)} />
      ) : null}
    </div>
  );
}
