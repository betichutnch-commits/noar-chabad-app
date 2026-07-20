export type NotificationDisplay = {
  tripName: string | null;
  title: string;
};

const LEGACY_TRIP_TITLE = /^«([^»]+)»\s*[·•]\s*(.+)$/u;

/** Extract trip/activity name from notification body when quoted. */
export function extractTripNameFromNotification(message?: string | null): string | null {
  if (!message?.trim()) return null;
  const match = message.match(/"([^"]{1,120})"/);
  return match?.[1]?.trim() || null;
}

function stripTripNameFromTitle(title: string, tripName: string): string {
  return (
    title
      .replace(`«${tripName}»`, "")
      .replace(tripName, "")
      .replace(/^[·•\s—-]+/, "")
      .trim() || title
  );
}

/** Split stored notification title + body into trip name and clean title for display. */
export function resolveNotificationDisplay(
  title: string,
  message?: string | null,
): NotificationDisplay {
  const legacy = title.match(LEGACY_TRIP_TITLE);
  if (legacy) {
    return { tripName: legacy[1].trim(), title: legacy[2].trim() };
  }

  const tripName = extractTripNameFromNotification(message);
  if (tripName) {
    return {
      tripName,
      title: title.includes(tripName) ? stripTripNameFromTitle(title, tripName) : title,
    };
  }

  return { tripName: null, title };
}

/** Plain-text label for aria / simple string contexts. */
export function formatNotificationTitle(title: string, message?: string | null): string {
  const display = resolveNotificationDisplay(title, message);
  if (!display.tripName) return display.title;
  return `${display.tripName} — ${display.title}`;
}

/** Trip name is carried in the notification body; title stays the action text only. */
export function withTripNotificationTitle(_tripName: string, title: string): string {
  return title;
}
