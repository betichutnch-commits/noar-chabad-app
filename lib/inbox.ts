import type { ContactMessage } from "@/lib/types";

export const SCREENSHOT_SEPARATOR = "[צורף צילום מסך]:";
export const INBOX_STATUSES = ["new", "in_progress", "treated", "closed"] as const;
export type InboxStatus = (typeof INBOX_STATUSES)[number];

const INBOX_STATUS_SET = new Set<InboxStatus>(INBOX_STATUSES);

export const parseMessageContent = (fullText: string) => {
  if (!fullText) return { text: "", imagePath: null as string | null };
  if (!fullText.includes(SCREENSHOT_SEPARATOR)) return { text: fullText, imagePath: null };

  const parts = fullText.split(SCREENSHOT_SEPARATOR);
  return {
    text: parts[0]?.trim() ?? "",
    imagePath: parts[1]?.trim() ?? null,
  };
};

export const normalizeMessageStatus = (status: string): InboxStatus => {
  const normalized = (status || "new").toLowerCase().trim();
  if (normalized === "pending") return "new";
  if (INBOX_STATUS_SET.has(normalized as InboxStatus)) return normalized as InboxStatus;
  return "new";
};

export const isOpenMessageStatus = (status: string) => {
  const normalized = normalizeMessageStatus(status);
  return normalized !== "treated" && normalized !== "closed";
};

export const isBugCategory = (message: Pick<ContactMessage, "category" | "subject">) => {
  return (message.category || "").toLowerCase().trim() === "bug" || message.subject.includes("תקלה");
};

export const parseMessageSubject = (originalSubject: string) => {
  let type: "bug" | "general" = "general";
  let cleanSubject = originalSubject || "";

  if (cleanSubject.includes("תקלה")) {
    type = "bug";
    cleanSubject = cleanSubject.replace(/\[\s*תקלה\s*\]/g, "").trim();
  } else if (cleanSubject.includes("פניה") || cleanSubject.includes("פנייה")) {
    type = "general";
    cleanSubject = cleanSubject
      .replace(/\[\s*פניה\s*\]/g, "")
      .replace(/\[\s*פנייה\s*\]/g, "")
      .trim();
  }

  cleanSubject = cleanSubject.replace(/^[:\-\s]+/, "");
  return { type, cleanSubject };
};

export const getInboxStatusLabel = (status: string) => {
  const normalized = normalizeMessageStatus(status);
  const labels: Record<InboxStatus, string> = {
    new: "נשלח",
    in_progress: "בטיפול",
    treated: "טופל",
    closed: "סגור",
  };
  return labels[normalized];
};
