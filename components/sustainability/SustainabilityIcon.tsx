import type { SVGProps } from "react";

type SustainabilityIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

/**
 * עלה קיימות — קו דק בלבד, בסגנון מינימלי.
 */
export function SustainabilityIcon({ size = 16, className, ...props }: SustainabilityIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    >
      <path
        d="M7.25 17.25c0 0-2.75-4.75-1.5-8.5 1-3 3.75-4.25 6.25-3.25 2.75 1.1 4.25 4.25 3.25 7.25-1 3.25-4.25 5.25-8 4.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.75 15.25c1.75-3.25 3.25-5.75 5.25-7.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SustainabilityIconBadge({
  size = 14,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const box = size + 12;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl border border-green-200 bg-white text-green-500 shadow-sm ${className}`}
      style={{ width: box, height: box }}
    >
      <SustainabilityIcon size={size} />
    </span>
  );
}
