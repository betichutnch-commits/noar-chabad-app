import type { User } from "@supabase/supabase-js";
import { isManagerUser } from "@/lib/auth";

type TimelineSeedItem = {
  date?: string;
  finalLocation?: string;
  locationValue?: string;
  otherDetail?: string;
  finalSubCategory?: string;
  details?: string;
  sensitiveLocation?: boolean;
};

export type SeedRowInput = {
  order_index: number;
  day_index: number | null;
  time_text: string | null;
  location_text: string | null;
  location_sensitive: boolean;
  event_text: string | null;
  notes: string | null;
  owner_name: string | null;
};

export const seedRowsFromTripDetails = (details: unknown): SeedRowInput[] => {
  const d = (details || {}) as Record<string, unknown>;
  const timeline = Array.isArray(d.timeline) ? (d.timeline as TimelineSeedItem[]) : [];
  if (timeline.length === 0) {
    return [
      {
        order_index: 0,
        day_index: 1,
        time_text: null,
        location_text: null,
        location_sensitive: false,
        event_text: null,
        notes: null,
        owner_name: null,
      },
    ];
  }

  const startAt = timeline[0]?.date ? new Date(String(timeline[0].date)) : null;
  return timeline.map((item, index) => {
    const itemDate = item.date ? new Date(String(item.date)) : null;
    const day_index =
      startAt && itemDate && !Number.isNaN(startAt.getTime()) && !Number.isNaN(itemDate.getTime())
        ? Math.floor((itemDate.getTime() - startAt.getTime()) / (1000 * 60 * 60 * 24)) + 1
        : index + 1;
    const locationText = item.finalLocation
      ? String(item.finalLocation)
      : item.locationValue
        ? String(item.locationValue)
        : null;
    return {
      order_index: index,
      day_index,
      time_text: null,
      location_text: locationText,
      location_sensitive: Boolean(item.sensitiveLocation),
      event_text: item.finalSubCategory
        ? String(item.finalSubCategory)
        : item.details
          ? String(item.details)
          : null,
      notes: null,
      owner_name: null,
    };
  });
};

export const canEditTripPlan = ({
  user,
  profile,
  tripUserId,
}: {
  user: User | null;
  profile: { role?: string | null; department?: string | null; is_tech_admin?: boolean | null } | null;
  tripUserId: string;
}): boolean => {
  if (!user) return false;
  if (user.id === tripUserId) return true;
  const userLike = { id: user.id, user_metadata: user.user_metadata ?? {} } as User;
  return isManagerUser(userLike, profile || undefined);
};
