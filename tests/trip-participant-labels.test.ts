import { describe, expect, it } from "vitest";
import { getTripParticipantLabels, localizeParticipantCopy } from "@/lib/tripParticipantLabels";

describe("tripParticipantLabels", () => {
  it("uses feminine labels for girls departments", () => {
    const labels = getTripParticipantLabels('בנות חב"ד');
    expect(labels.participants).toBe("חניכות");
    expect(labels.participantsAndStaff).toBe("פרטי חניכות וצוות");
    expect(labels.participantSingular).toBe("חניכה");
  });

  it("uses masculine labels for boys departments", () => {
    const labels = getTripParticipantLabels("הפנסאים");
    expect(labels.participants).toBe("חניכים");
    expect(labels.participantsAndStaff).toBe("פרטי חניכים וצוות");
  });

  it("uses mixed labels for mixed departments", () => {
    const labels = getTripParticipantLabels("מועדוני המעשים הטובים");
    expect(labels.participants).toBe("חניכים/ות");
  });

  it("localizes participant copy for girls departments", () => {
    expect(localizeParticipantCopy("רשימת חניכים לפי קבוצות", 'בת מלך')).toBe("רשימת חניכות לפי קבוצות");
  });
});
