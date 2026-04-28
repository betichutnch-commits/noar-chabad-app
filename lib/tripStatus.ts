import {
  CheckCircle,
  Clock,
  AlertTriangle,
  FileEdit,
  Trash2,
  RotateCcw,
  ShieldCheck,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export const TRIP_STATUSES = [
  "draft",
  "pending_dept_review",
  "returned_for_changes",
  "pending",
  "approved",
  "approved_for_execution",
  "rejected",
  "cancelled",
] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number];

export type TripStatusConfig = {
  text: string;
  bg: string;
  textCol: string;
  icon: LucideIcon;
};

const STATUS_CONFIG: Record<TripStatus, TripStatusConfig> = {
  draft: {
    text: "טיוטה",
    bg: "bg-gray-100",
    textCol: "text-gray-600",
    icon: FileEdit,
  },
  pending_dept_review: {
    text: "אצל אחראי המחלקה",
    bg: "bg-sky-100",
    textCol: "text-sky-700",
    icon: ClipboardList,
  },
  returned_for_changes: {
    text: "הוחזר להערות",
    bg: "bg-orange-100",
    textCol: "text-orange-700",
    icon: RotateCcw,
  },
  pending: {
    text: "אצל מחלקת בטיחות",
    bg: "bg-amber-100",
    textCol: "text-amber-700",
    icon: Clock,
  },
  approved: {
    text: "מאושר לפרסום ותכנון",
    bg: "bg-green-100",
    textCol: "text-green-700",
    icon: CheckCircle,
  },
  approved_for_execution: {
    text: "מאושר לביצוע",
    bg: "bg-emerald-100",
    textCol: "text-emerald-700",
    icon: ShieldCheck,
  },
  rejected: {
    text: "לא אושר",
    bg: "bg-red-100",
    textCol: "text-red-700",
    icon: AlertTriangle,
  },
  cancelled: {
    text: "בוטל",
    bg: "bg-stone-100",
    textCol: "text-stone-500",
    icon: Trash2,
  },
};

export const normalizeTripStatus = (status: string | null | undefined): TripStatus => {
  const value = String(status ?? "").trim().toLowerCase() as TripStatus;
  if ((TRIP_STATUSES as readonly string[]).includes(value)) {
    return value;
  }
  return "pending";
};

export const getTripStatusConfig = (status: string | null | undefined): TripStatusConfig => {
  return STATUS_CONFIG[normalizeTripStatus(status)];
};

export const getTripStatusLabel = (status: string | null | undefined): string => {
  return STATUS_CONFIG[normalizeTripStatus(status)].text;
};

export const TRIP_STATUS_ICONS: Record<TripStatus, LucideIcon> = {
  draft: FileEdit,
  pending_dept_review: ClipboardList,
  returned_for_changes: RotateCcw,
  pending: Clock,
  approved: ShieldCheck,
  approved_for_execution: ShieldCheck,
  rejected: AlertTriangle,
  cancelled: Trash2,
};

export type TripActor =
  | "coordinator"
  | "dept_trips_officer"
  | "safety_admin"
  | "system";

export const isOpenForCoordinator = (status: string): boolean => {
  const s = normalizeTripStatus(status);
  return s === "draft" || s === "returned_for_changes";
};

export const isAtDeptOfficer = (status: string): boolean => {
  const s = normalizeTripStatus(status);
  return s === "pending_dept_review";
};

export const isAtSafetyDept = (status: string): boolean => {
  const s = normalizeTripStatus(status);
  return s === "pending";
};

export const isFinalStatus = (status: string): boolean => {
  const s = normalizeTripStatus(status);
  return (
    s === "approved" ||
    s === "approved_for_execution" ||
    s === "rejected" ||
    s === "cancelled"
  );
};

const TRANSITIONS: Record<TripActor, Array<{ from: TripStatus; to: TripStatus }>> = {
  coordinator: [
    { from: "draft", to: "pending_dept_review" },
    { from: "returned_for_changes", to: "pending_dept_review" },
    { from: "pending_dept_review", to: "cancelled" },
    { from: "returned_for_changes", to: "cancelled" },
    { from: "pending", to: "cancelled" },
    { from: "approved", to: "cancelled" },
    { from: "approved_for_execution", to: "cancelled" },
  ],
  dept_trips_officer: [
    { from: "pending_dept_review", to: "returned_for_changes" },
    { from: "pending_dept_review", to: "rejected" },
    { from: "pending_dept_review", to: "pending" },
  ],
  safety_admin: [
    { from: "pending", to: "approved" },
    { from: "pending", to: "approved_for_execution" },
    { from: "approved", to: "approved_for_execution" },
    { from: "pending", to: "rejected" },
  ],
  system: [],
};

export const canTransition = (
  from: string,
  to: string,
  actor: TripActor,
): boolean => {
  const fromStatus = normalizeTripStatus(from);
  const toStatus = normalizeTripStatus(to);
  const allowed = TRANSITIONS[actor];
  return allowed.some((t) => t.from === fromStatus && t.to === toStatus);
};
