import { resolveNotificationDisplay } from "@/lib/notificationDisplay";

type NotificationPreviewTextProps = {
  title: string;
  message?: string | null;
  className?: string;
  tripNameClassName?: string;
};

export function NotificationPreviewText({
  title,
  message,
  className = "text-xs font-bold text-gray-700 line-clamp-2",
  tripNameClassName = "truncate text-[11px] font-bold text-brand-cyan",
}: NotificationPreviewTextProps) {
  const display = resolveNotificationDisplay(title, message);

  if (!display.tripName) {
    return <span className={className}>{display.title}</span>;
  }

  return (
    <div className="min-w-0">
      <div className={tripNameClassName}>{display.tripName}</div>
      <div className={className}>{display.title}</div>
    </div>
  );
}
