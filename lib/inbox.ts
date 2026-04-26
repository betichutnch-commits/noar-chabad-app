import type { ContactMessage } from "@/lib/types";

export const SCREENSHOT_SEPARATOR = "[צורף צילום מסך]:";

export const parseMessageContent = (fullText: string) => {
  if (!fullText) return { text: "", imagePath: null as string | null };
  if (!fullText.includes(SCREENSHOT_SEPARATOR)) return { text: fullText, imagePath: null };

  const parts = fullText.split(SCREENSHOT_SEPARATOR);
  return {
    text: parts[0]?.trim() ?? "",
    imagePath: parts[1]?.trim() ?? null,
  };
};

export const isOpenMessageStatus = (status: string) => {
  const normalized = (status || "new").toLowerCase().trim();
  return normalized !== "treated" && normalized !== "closed";
};

export const normalizeMessageStatus = (status: string) => {
  const normalized = (status || "new").toLowerCase().trim();
  return normalized === "pending" ? "new" : normalized;
};

export const isBugCategory = (message: Pick<ContactMessage, "category" | "subject">) => {
  return (message.category || "").toLowerCase().trim() === "bug" || message.subject.includes("תקלה");
};
