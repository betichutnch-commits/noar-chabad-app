"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import MasterFormTemplate, { type SignatureFieldKey } from "@/components/MasterFormTemplate";

export type AppendixCFormValues = {
  approvalDate: string;
  schoolName: string;
  tripLeaderName: string;
  tripLeaderPhone: string;
  classes: string;
  branch: string;
  department: string;
  location: string;
  dates: string;
  durationDays: string;
  principalName: string;
  principalSignature: string;
  signatureDate: string;
  safetyOfficerName: string;
  safetyOfficerSignature: string;
};

export type AppendixCFormProps = {
  isEditable?: boolean;
  initialValues?: Partial<AppendixCFormValues>;
  languageGender?: "male" | "female";
  canSignSignature?: boolean;
  canSignSafetySignature?: boolean;
  onValuesChange?: (values: AppendixCFormValues) => void;
  actions?: React.ReactNode;
  className?: string;
};

const defaultValues: AppendixCFormValues = {
  approvalDate: "",
  schoolName: "",
  tripLeaderName: "",
  tripLeaderPhone: "",
  classes: "",
  branch: "",
  department: "",
  location: "",
  dates: "",
  durationDays: "",
  principalName: "הגב' חיה וולס",
  principalSignature: "",
  signatureDate: new Date().toISOString().slice(0, 10),
  safetyOfficerName: "",
  safetyOfficerSignature: "",
};

function OrganizationLogo() {
  return (
    <div className="relative h-16 w-44 print:h-14 print:w-40">
      <Image src="/logo.png" alt="ארגון נוער חב״ד" fill className="object-contain" priority unoptimized />
    </div>
  );
}

const formatDisplayDate = (value: string) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

function SignaturePreview({ value }: { value: string }) {
  return (
    <div className="flex h-14 items-end justify-center border-b border-brand-dark px-2 pb-1">
      {value ? <Image src={value} alt="חתימת המזכ״לית" width={240} height={80} className="max-h-11 max-w-full object-contain" unoptimized /> : null}
    </div>
  );
}

function SignaturePadDialog({ initialValue, onSave, onClose, title = "חתימת המזכ״לית" }: { initialValue: string; onSave: (value: string) => void; onClose: () => void; title?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#111827";

    if (initialValue) {
      const image = new window.Image();
      image.onload = () => {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      };
      image.src = initialValue;
    }
  }, [initialValue]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const point = getPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-500/25 p-4 backdrop-blur-sm print:hidden">
      <div className="w-full max-w-2xl rounded-3xl border border-border-subtle bg-white p-5 shadow-2xl">
        <div className="mb-4 text-right">
          <h3 className="text-xl font-black text-brand-dark">{title}</h3>
          <p className="mt-1 text-xs font-bold text-text-secondary">חתמו עם האצבע או העכבר בתוך המסגרת.</p>
        </div>
        <canvas
          ref={canvasRef}
          width={900}
          height={260}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          className="h-52 w-full touch-none rounded-2xl border-2 border-dashed border-border-strong bg-white"
        />
        <div className="mt-4 flex flex-wrap justify-between gap-2">
          <button type="button" onClick={clear} className="rounded-xl border border-border-subtle px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-muted">
            נקה חתימה
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-border-subtle px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-muted">
              ביטול
            </button>
            <button type="button" onClick={save} className="rounded-xl bg-brand-cyan px-5 py-2 text-sm font-black text-white shadow-sm hover:bg-cyan-600">
              שמור חתימה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppendixCForm({
  isEditable = false,
  initialValues = {},
  languageGender = "male",
  canSignSignature = false,
  canSignSafetySignature = false,
  onValuesChange,
  actions,
  className = "",
}: AppendixCFormProps) {
  const [values, setValues] = useState<AppendixCFormValues>({ ...defaultValues, ...initialValues });
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showSafetySignaturePad, setShowSafetySignaturePad] = useState(false);
  const isFemaleLanguage = languageGender === "female";
  const leaderLabel = isFemaleLanguage ? "אחראית על הטיול" : "אחראי על הטיול";
  const appointmentTarget = isFemaleLanguage ? "לאחראית הטיול" : "לאחראי הטיול";
  const studentsLabel = isFemaleLanguage ? "לתלמידות" : "לתלמידי";

  const updateField = (key: keyof AppendixCFormValues, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      onValuesChange?.(next);
      return next;
    });
  };

  const renderField = (key: keyof AppendixCFormValues, label: string, type: "text" | "date" | "number" = "text", className = "min-w-36") => {
    const value = values[key];
    const displayValue = value || "________";
    const widthCh = Math.max(8, Math.min(46, displayValue.length + 2));
    const fieldStyle = { width: `${widthCh}ch`, maxWidth: "100%" };

    if (!isEditable) {
      return (
        <span className="mx-1 inline-block align-baseline border-b border-brand-dark px-0 text-center font-bold text-brand-dark" style={fieldStyle}>
          {displayValue}
        </span>
      );
    }

    return (
      <>
        <label className={`mx-1 inline-flex items-center align-baseline print:hidden ${className}`} style={fieldStyle}>
          <span className="sr-only">{label}</span>
          <input
            dir="rtl"
            type={type}
            value={value}
            onChange={(event) => updateField(key, event.target.value)}
            placeholder={label}
            className="h-auto w-full border-0 border-b border-brand-dark bg-transparent px-0 text-center text-sm font-bold leading-inherit text-brand-dark outline-none transition-all placeholder:text-text-muted focus:border-brand-pink focus:bg-brand-pink/5"
          />
        </label>
        <span className="mx-1 hidden align-baseline border-b border-brand-dark px-0 text-center font-bold text-brand-dark print:inline-block" style={fieldStyle}>
          {displayValue}
        </span>
      </>
    );
  };

  const signatureValues = {
    principalName: values.principalName,
    principalSignature: values.principalSignature,
    signatureDate: values.signatureDate,
    safetyOfficerName: values.safetyOfficerName,
    safetyOfficerSignature: values.safetyOfficerSignature,
  };
  const signatureFields = [
    { key: "signatureDate", label: "תאריך", type: "date" as const },
    { key: "principalName", label: "שם מזכ״לית הארגון" },
    {
      key: "principalSignature",
      label: "חתימת המזכ״לית",
      renderEdit: (value: string) => (
        <div className="relative">
          <button
            type="button"
            onClick={() => canSignSignature && setShowSignaturePad(true)}
            className={`flex h-14 w-full items-end justify-center border-b border-brand-dark px-2 pb-1 ${
              canSignSignature ? "cursor-pointer hover:bg-brand-cyan/5" : "cursor-default"
            }`}
            title={canSignSignature ? "לחצו כדי לחתום" : "חתימה זמינה למזכ״לית הארגון"}
          >
            {value ? (
              <Image src={value} alt="חתימת המזכ״לית" width={240} height={80} className="max-h-11 max-w-full object-contain" unoptimized />
            ) : (
              <span className="mb-2 text-xs font-bold text-text-muted">{canSignSignature ? "לחצו לחתימה" : ""}</span>
            )}
          </button>
          {canSignSignature && value ? (
            <button
              type="button"
              onClick={() => updateField("principalSignature", "")}
              className="absolute left-0 top-0 rounded-full border border-red-100 bg-white px-2 py-0.5 text-[10px] font-black text-red-600 shadow-sm hover:bg-red-50 print:hidden"
            >
              נקה
            </button>
          ) : null}
        </div>
      ),
      renderView: (value: string) => <SignaturePreview value={value} />,
    },
    { key: "safetyOfficerName", label: "שם אחראי בטיחות ומפעלים" },
    {
      key: "safetyOfficerSignature",
      label: "חתימת אחראי בטיחות ומפעלים",
      renderEdit: (value: string) => (
        <div className="relative">
          <button
            type="button"
            onClick={() => canSignSafetySignature && setShowSafetySignaturePad(true)}
            className={`flex h-14 w-full items-end justify-center border-b border-brand-dark px-2 pb-1 ${
              canSignSafetySignature ? "cursor-pointer hover:bg-brand-cyan/5" : "cursor-default"
            }`}
            title={canSignSafetySignature ? "לחצו כדי לחתום" : "חתימה זמינה לאחראי בטיחות ומפעלים"}
          >
            {value ? (
              <Image src={value} alt="חתימת אחראי בטיחות" width={240} height={80} className="max-h-11 max-w-full object-contain" unoptimized />
            ) : (
              <span className="mb-2 text-xs font-bold text-text-muted">{canSignSafetySignature ? "לחצו לחתימה" : ""}</span>
            )}
          </button>
          {canSignSafetySignature && value ? (
            <button
              type="button"
              onClick={() => updateField("safetyOfficerSignature", "")}
              className="absolute left-0 top-0 rounded-full border border-red-100 bg-white px-2 py-0.5 text-[10px] font-black text-red-600 shadow-sm hover:bg-red-50 print:hidden"
            >
              נקה
            </button>
          ) : null}
        </div>
      ),
      renderView: (value: string) => (
        <div className="flex h-14 items-end justify-center border-b border-brand-dark px-2 pb-1">
          {value ? <Image src={value} alt="חתימת אחראי בטיחות" width={240} height={80} className="max-h-11 max-w-full object-contain" unoptimized /> : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <MasterFormTemplate<Record<string, never>>
        title={
          <>
            כתב מינוי ל{leaderLabel} <span className="text-xl font-normal text-text-muted">(נספח ג&apos;)</span>
          </>
        }
        departmentName=""
        blessingPosition="right"
        blessingClassName="text-xs font-normal"
        headerRightMeta={<span>תאריך: {formatDisplayDate(values.signatureDate || new Date().toISOString().slice(0, 10))}</span>}
        headerLogo={<OrganizationLogo />}
        organizationName=""
        isEditable={isEditable}
        showTable={false}
        hideHeaderRule
        hideFooterRule
        signatureFields={signatureFields}
        signatureLabelPosition="bottom"
        signatureValues={signatureValues}
        onSignatureChange={(key: SignatureFieldKey, value) => updateField(key as keyof AppendixCFormValues, value)}
        actions={actions}
        className={`font-sans ${className}`}
      >
        <div className="mx-auto max-w-[170mm] space-y-8 text-brand-dark">
          <section className="space-y-2 pr-[0.5cm] text-sm font-normal leading-8">
            <div className="whitespace-nowrap">
              <span className="font-black">אל:</span> {leaderLabel} {renderField("tripLeaderName", isFemaleLanguage ? "שם אחראית הטיול" : "שם אחראי הטיול", "text", "")}, טלפון:{" "}
              {renderField("tripLeaderPhone", isFemaleLanguage ? "טלפון אחראית הטיול" : "טלפון אחראי הטיול", "text", "")}.
            </div>
            <div className="whitespace-nowrap">
              <span className="font-black">מאת:</span> מזכ&quot;לית הארגון, <span className="font-bold">הגב&apos; חיה וולס</span>.
            </div>
          </section>

          <section className="space-y-3 text-justify text-base leading-9 print:text-sm print:leading-8">
            <p className="text-justify">
              אני ממנה אותך {appointmentTarget} {studentsLabel} כיתות {renderField("classes", "כיתות", "text", "")} בסניף{" "}
              {renderField("branch", "סניף", "text", "")} של מחלקת {renderField("department", "מחלקה", "text", "")}, שיתקיים במקום/באזור{" "}
              {renderField("location", "מקום או אזור", "text", "")} בתאריכים {renderField("dates", "תאריכים", "text", "")} למשך{" "}
              {renderField("durationDays", "מספר ימים", "number", "")} ימים.
            </p>

            <p className="text-justify">תפקידך לפעול בהתאם לתוכנית המאושרת, על פי הוראות חוזרי המנכ&quot;ל ואישור הטיול.</p>
            <p className="text-justify">כל שינוי במהלך הטיול מחייב את אישור המזכ&quot;לית החתומה מטה.</p>
          </section>
        </div>
      </MasterFormTemplate>
      {showSignaturePad ? (
        <SignaturePadDialog
          title="חתימת המזכ״לית"
          initialValue={values.principalSignature}
          onSave={(value) => updateField("principalSignature", value)}
          onClose={() => setShowSignaturePad(false)}
        />
      ) : null}
      {showSafetySignaturePad ? (
        <SignaturePadDialog
          title="חתימת אחראי בטיחות ומפעלים"
          initialValue={values.safetyOfficerSignature}
          onSave={(value) => updateField("safetyOfficerSignature", value)}
          onClose={() => setShowSafetySignaturePad(false)}
        />
      ) : null}
    </>
  );
}

export default AppendixCForm;
