const textValue = (value: unknown): string => String(value || "").trim();

const joinName = (first: string, last: string): string => `${first} ${last}`.trim();

export const resolveFullNameFromMeta = (
  meta: Record<string, unknown> | null | undefined,
  fallback = "משתמש",
): string => {
  if (!meta) return fallback;

  const firstName = textValue(meta.first_name || meta.official_name);
  const lastName = textValue(meta.last_name);
  const composed = joinName(firstName, lastName);
  const fullName = textValue(meta.full_name || meta.name);

  // Prefer explicit first+last when available. This prevents stale
  // full_name values (first-name only) from hiding the family name.
  if (composed) {
    if (!fullName) return composed;
    if (lastName && !fullName.includes(lastName)) return composed;
    return fullName;
  }

  if (fullName) return fullName;

  const officialOnly = textValue(meta.official_name);
  if (officialOnly) return officialOnly;

  return fallback;
};

export const resolveDisplayNameFromMeta = (
  meta: Record<string, unknown> | null | undefined,
  fallback = "משתמש",
): string => {
  if (!meta) return fallback;
  const nickname = textValue(meta.nickname || meta.nick_name);
  if (nickname) return nickname;
  return resolveFullNameFromMeta(meta, fallback);
};

export const resolveDisplayNameFromProfile = (
  profile: Record<string, unknown> | null | undefined,
  fallback = "משתמש",
): string => {
  if (!profile) return fallback;
  const nickname = textValue(profile.nickname);
  if (nickname) return nickname;

  const official = textValue(profile.official_name);
  const last = textValue(profile.last_name);
  const composed = joinName(official, last);
  if (composed) return composed;

  const fullName = textValue(profile.full_name);
  if (fullName) return fullName;

  return fallback;
};

export function profileContactNameFields(
  profile: Record<string, unknown> | null | undefined,
  meta?: Record<string, unknown> | null | undefined,
): { firstName: string; lastName: string } {
  const nickname = textValue(profile?.nickname) || textValue(meta?.nickname) || textValue(meta?.nick_name);
  const officialName =
    textValue(profile?.official_name) || textValue(meta?.official_name) || textValue(meta?.first_name);
  const lastName = textValue(profile?.last_name) || textValue(meta?.last_name);

  return {
    firstName: nickname || officialName,
    lastName,
  };
}

export const resolveDisplayName = ({
  meta,
  profile,
  fallback = "משתמש",
}: {
  meta?: Record<string, unknown> | null | undefined;
  profile?: Record<string, unknown> | null | undefined;
  fallback?: string;
}): string => {
  const fromProfile = resolveDisplayNameFromProfile(profile, "");
  if (fromProfile) return fromProfile;
  return resolveDisplayNameFromMeta(meta, fallback);
};
