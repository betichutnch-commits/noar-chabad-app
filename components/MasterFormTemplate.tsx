"use client";

import React from "react";
import { Select } from "@/components/ui/Select";

type PrimitiveValue = string | number | boolean | null | undefined;

export type MasterFormColumn<TData extends Record<string, unknown>> = {
  key: keyof TData & string;
  header: string;
  type?: "text" | "number" | "date" | "textarea" | "checkbox" | "select";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  widthClassName?: string;
  cellClassName?: string;
  headerClassName?: string;
  rows?: number;
  renderView?: (value: TData[keyof TData], row: TData, rowIndex: number) => React.ReactNode;
  renderEdit?: (value: TData[keyof TData], row: TData, rowIndex: number) => React.ReactNode;
};

export type SignatureFieldKey = string;

export type MasterSignatureField = {
  key: SignatureFieldKey;
  label: string;
  type?: "text" | "tel" | "date";
  renderEdit?: (value: string, onChange: (value: string) => void) => React.ReactNode;
  renderView?: (value: string) => React.ReactNode;
};

export type SignatureValues = Partial<Record<SignatureFieldKey, string>>;

export type MasterFormTemplateProps<TData extends Record<string, unknown>> = {
  title: React.ReactNode;
  description?: string;
  departmentName?: string;
  blessingPosition?: "right" | "center";
  blessingClassName?: string;
  headerRightMeta?: React.ReactNode;
  headerLogo?: React.ReactNode;
  organizationName?: string;
  submissionInstructions?: string;
  isEditable?: boolean;
  tableColumns?: Array<MasterFormColumn<TData>>;
  tableData?: TData[];
  onCellChange?: (rowIndex: number, key: keyof TData & string, value: string | boolean) => void;
  signatureValues?: SignatureValues;
  onSignatureChange?: (key: SignatureFieldKey, value: string) => void;
  signatureFields?: MasterSignatureField[];
  signatureLabelPosition?: "top" | "bottom";
  hideHeaderRule?: boolean;
  hideFooterRule?: boolean;
  actions?: React.ReactNode;
  beforeTable?: React.ReactNode;
  afterTable?: React.ReactNode;
  children?: React.ReactNode;
  showTable?: boolean;
  emptyStateText?: string;
  className?: string;
};

const defaultSignatureFields: MasterSignatureField[] = [
  { key: "checkerName", label: "שם הבודק/ת" },
  { key: "role", label: "התפקיד" },
  { key: "phone", label: "מספר הטלפון", type: "tel" },
  { key: "signature", label: "חתימה" },
  { key: "date", label: "תאריך", type: "date" },
];

const stringifyValue = (value: PrimitiveValue) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "כן" : "לא";
  return String(value);
};

const getSelectLabel = (value: PrimitiveValue, options?: Array<{ value: string; label: string }>) => {
  const stringValue = stringifyValue(value);
  return options?.find((option) => option.value === stringValue)?.label || stringValue;
};

export function MasterFormTemplate<TData extends Record<string, unknown>>({
  title,
  description,
  departmentName = "מחלקת הבטיחות",
  blessingPosition = "center",
  blessingClassName = "text-base",
  headerRightMeta,
  headerLogo,
  organizationName = "ארגון נוער חב\"ד פנסאים",
  submissionInstructions,
  isEditable = false,
  tableColumns,
  tableData,
  onCellChange,
  signatureValues = {},
  onSignatureChange,
  signatureFields = defaultSignatureFields,
  signatureLabelPosition = "top",
  hideHeaderRule = false,
  hideFooterRule = false,
  actions,
  beforeTable,
  afterTable,
  children,
  showTable,
  emptyStateText = "אין נתונים להצגה",
  className = "",
}: MasterFormTemplateProps<TData>) {
  const columns = tableColumns || [];
  const rows = tableData || [];
  const shouldRenderTable = showTable ?? columns.length > 0;

  const renderViewValue = (column: MasterFormColumn<TData>, row: TData, rowIndex: number) => {
    const value = row[column.key];
    if (column.renderView) return column.renderView(value, row, rowIndex);
    if (column.type === "select") return getSelectLabel(value as PrimitiveValue, column.options);
    return stringifyValue(value as PrimitiveValue) || "-";
  };

  const renderEditableCell = (column: MasterFormColumn<TData>, row: TData, rowIndex: number) => {
    const value = row[column.key];

    if (column.renderEdit) {
      return (
        <>
          <div className="print:hidden">{column.renderEdit(value, row, rowIndex)}</div>
          <div className="hidden print:block">{renderViewValue(column, row, rowIndex)}</div>
        </>
      );
    }

    const sharedClassName =
      "w-full rounded-none border-0 bg-transparent px-2 py-1 text-center text-sm font-medium text-brand-dark outline-none ring-0 placeholder:text-text-muted focus:bg-brand-cyan/5 print:hidden";

    if (column.type === "checkbox") {
      return (
        <>
          <label className="inline-flex items-center justify-center print:hidden">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(event) => onCellChange?.(rowIndex, column.key, event.target.checked)}
              className="h-4 w-4 rounded border-border-strong text-brand-cyan focus:ring-brand-cyan"
            />
          </label>
          <div className="hidden print:block">{renderViewValue(column, row, rowIndex)}</div>
        </>
      );
    }

    if (column.type === "textarea") {
      return (
        <>
          <textarea
            value={stringifyValue(value as PrimitiveValue)}
            onChange={(event) => onCellChange?.(rowIndex, column.key, event.target.value)}
            placeholder={column.placeholder}
            rows={column.rows || 2}
            className={`${sharedClassName} min-h-16 resize-y leading-relaxed`}
          />
          <div className="hidden whitespace-pre-wrap print:block">{renderViewValue(column, row, rowIndex)}</div>
        </>
      );
    }

    if (column.type === "select") {
      const selectValue = stringifyValue(value as PrimitiveValue);
      const selectOptions = (column.options || []).map((option) => ({
        value: option.value,
        label: option.label,
      }));

      return (
        <>
          <Select
            value={selectValue}
            onChange={(nextValue) => onCellChange?.(rowIndex, column.key, nextValue)}
            options={selectOptions}
            placeholder={column.placeholder || "בחר"}
            accent="cyan"
            size="sm"
            textAlign="center"
            clearable={selectOptions.some((option) => option.value === "")}
            className="print:hidden"
            buttonClassName="!h-auto !rounded-none !border-0 !bg-transparent !py-1 !px-2 !shadow-none focus:!ring-0"
          />
          <div className="hidden print:block">{renderViewValue(column, row, rowIndex)}</div>
        </>
      );
    }

    return (
      <>
        <input
          type={column.type || "text"}
          value={stringifyValue(value as PrimitiveValue)}
          onChange={(event) => onCellChange?.(rowIndex, column.key, event.target.value)}
          placeholder={column.placeholder}
          className={sharedClassName}
        />
        <div className="hidden print:block">{renderViewValue(column, row, rowIndex)}</div>
      </>
    );
  };

  return (
    <section dir="rtl" className={`master-form-template min-h-screen bg-surface-muted px-4 py-8 font-sans text-brand-dark print:bg-white print:p-0 ${className}`}>
      {actions ? <div className="mx-auto mb-4 flex max-w-[210mm] justify-end gap-2 print:hidden">{actions}</div> : null}

      <article className="master-form-page mx-auto min-h-[297mm] w-[210mm] max-w-full bg-white p-[14mm] shadow-md print:min-h-0 print:w-[210mm] print:max-w-none print:p-[10mm] print:shadow-none">
        <header className={`${hideHeaderRule ? "" : "border-b-2 border-brand-dark"} pb-5`}>
          <div className="grid grid-cols-3 items-start text-sm font-bold text-brand-dark">
            <div className="text-right">
              {blessingPosition === "right" ? (
                <span className={`inline-flex items-center gap-4 ${blessingClassName}`}>
                  <span>ב״ה</span>
                  {headerRightMeta}
                </span>
              ) : (
                departmentName
              )}
            </div>
            <div className="text-center">{blessingPosition === "center" ? <span className={blessingClassName}>ב״ה</span> : null}</div>
            <div className="text-left">{blessingPosition === "right" ? departmentName : null}</div>
          </div>
          {headerLogo ? <div className="mb-4 mt-1 flex justify-center">{headerLogo}</div> : null}

          <div className="mt-7 text-center">
            <h1 className="text-3xl font-black tracking-tight text-brand-dark">{title}</h1>
            {description ? <p className="mx-auto mt-3 max-w-3xl text-sm font-medium leading-7 text-text-secondary">{description}</p> : null}
          </div>
        </header>

        <main className="mt-8 space-y-6">
          {beforeTable}

          {children}

          {shouldRenderTable ? (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full border-collapse border border-brand-dark text-center text-sm">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={`border border-brand-dark bg-gray-200 px-2 py-2 text-center align-middle text-sm font-black text-brand-dark print:bg-gray-200 ${column.widthClassName || ""} ${
                          column.headerClassName || ""
                        }`}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="break-inside-avoid">
                        {columns.map((column) => (
                          <td key={column.key} className={`min-h-10 border border-brand-dark px-2 py-2 align-middle text-center text-brand-dark ${column.cellClassName || ""}`}>
                            {isEditable ? renderEditableCell(column, row, rowIndex) : renderViewValue(column, row, rowIndex)}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={Math.max(columns.length, 1)} className="border border-brand-dark px-4 py-10 text-center text-sm font-bold text-text-muted">
                        {emptyStateText}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}

          {afterTable}
        </main>

        <footer className={`mt-10 ${hideFooterRule ? "" : "border-t-2 border-brand-dark"} pt-5`}>
          {organizationName ? <div className="text-center text-sm font-bold text-brand-dark">{organizationName}</div> : null}
          {submissionInstructions ? <p className="mt-2 text-center text-xs font-medium leading-6 text-text-secondary">{submissionInstructions}</p> : null}

          <div className="mt-6 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(signatureFields.length, 1)}, minmax(0, 1fr))` }}>
            {signatureFields.map((field) => {
              const value = signatureValues[field.key] || "";
              const defaultView = <div className="min-h-10 border-b border-brand-dark px-2 py-2 text-center text-sm">{value}</div>;
              return (
                <label key={field.key} className="flex h-full flex-col justify-end">
                  {signatureLabelPosition === "top" ? <span className="mb-1 block text-center text-xs font-black text-brand-dark">{field.label}</span> : null}
                  {field.renderEdit || field.renderView ? (
                    isEditable ? (
                      <>
                        <div className="print:hidden">{field.renderEdit?.(value, (next) => onSignatureChange?.(field.key, next)) || defaultView}</div>
                        <div className="hidden print:block">{field.renderView?.(value) || defaultView}</div>
                      </>
                    ) : (
                      field.renderView?.(value) || defaultView
                    )
                  ) : isEditable ? (
                    <>
                      <input
                        type={field.type || "text"}
                        value={value}
                        onChange={(event) => onSignatureChange?.(field.key, event.target.value)}
                        className="h-10 w-full border-0 border-b border-brand-dark bg-transparent px-2 text-center text-sm font-medium outline-none focus:bg-brand-cyan/5 print:hidden"
                      />
                      <div className="hidden min-h-10 border-b border-brand-dark px-2 py-2 text-center text-sm print:block">{value}</div>
                    </>
                  ) : (
                    defaultView
                  )}
                  {signatureLabelPosition === "bottom" ? <span className="mt-1 block text-center text-xs font-black text-brand-dark">{field.label}</span> : null}
                </label>
              );
            })}
          </div>
        </footer>
      </article>

      <div className="master-form-print-footer hidden print:flex">
        <span className="truncate text-right">{title}</span>
        <span className="master-form-page-number shrink-0" />
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          html,
          body {
            background: #ffffff !important;
          }

          .master-form-template {
            min-height: auto !important;
          }

          .master-form-page {
            width: 210mm !important;
            max-width: 210mm !important;
            min-height: 297mm !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            padding-bottom: 16mm !important;
          }

          .master-form-page * {
            box-sizing: border-box !important;
          }

          .master-form-print-footer {
            position: fixed;
            bottom: 5mm;
            left: 10mm;
            right: 10mm;
            z-index: 9999;
            height: 7mm;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid rgba(38, 50, 56, 0.35);
            padding-top: 2mm;
            color: #263238;
            font-size: 10px;
            font-weight: 800;
            line-height: 1;
            background: transparent;
          }

          .master-form-page-number::before {
            content: "עמוד " counter(page);
          }

          .print\\:hidden,
          button,
          [role="button"] {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          table,
          tr,
          td,
          th {
            break-inside: avoid;
          }
        }
      `}</style>
    </section>
  );
}

export default MasterFormTemplate;
