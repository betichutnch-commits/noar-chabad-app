import { AlertTriangle } from "lucide-react";

type RiskMitigationDisplayProps = {
  mitigation?: string | null;
  className?: string;
  variant?: "table" | "document";
};

export function RiskMitigationDisplay({
  mitigation,
  className = "",
  variant = "table",
}: RiskMitigationDisplayProps) {
  const trimmed = String(mitigation || "").trim();
  if (trimmed) {
    return (
      <div
        className={`whitespace-pre-wrap text-center leading-6 text-gray-800 ${
          variant === "table"
            ? "rounded-2xl border border-white/70 bg-white/55 p-3 text-xs"
            : ""
        } ${className}`}
      >
        {trimmed}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="חסר צמצום סיכון"
      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-red-400 bg-red-50 px-3 py-3 text-center shadow-sm ring-2 ring-red-200/80 ${
        variant === "table" ? "text-xs" : "text-sm"
      } ${className}`}
    >
      <AlertTriangle size={variant === "table" ? 16 : 18} className="shrink-0 text-red-600" aria-hidden />
      <span className="font-black text-red-700">חסר צמצום סיכון</span>
    </div>
  );
}
