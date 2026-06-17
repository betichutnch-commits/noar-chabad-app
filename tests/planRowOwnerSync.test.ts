import { describe, expect, it } from "vitest";
import { syncRowOwnerFields } from "@/lib/planRowOwnerSync";

describe("syncRowOwnerFields", () => {
  it("updates owner_name, all safety owners, and empty task assignees", () => {
    const row = {
      owner_name: "",
      safety: [
        { risk: "דריסה", mitigation: "", owner: "ישן" },
        { risk: "מעידה", mitigation: "", owner: "" },
      ],
      tasks: [
        { phase: "during" as const, task_text: "משימה א", assignee_name: "ישן" },
        { phase: "preparation" as const, task_text: "משימה ב", assignee_name: null },
      ],
    };

    const synced = syncRowOwnerFields(row, "מדריך א");

    expect(synced.owner_name).toBe("מדריך א");
    expect(synced.safety?.every((s) => s.owner === "מדריך א")).toBe(true);
    expect(synced.tasks?.[0]?.assignee_name).toBe("ישן");
    expect(synced.tasks?.[1]?.assignee_name).toBe("מדריך א");
  });
});
