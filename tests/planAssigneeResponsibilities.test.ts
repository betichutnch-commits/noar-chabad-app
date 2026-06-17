import { describe, expect, it } from "vitest";
import {
  allResponsibilitiesColumnsDone,
  buildAssigneeBoards,
  filterBoardsForTripLeader,
} from "@/lib/planAssigneeResponsibilities";

describe("buildAssigneeBoards", () => {
  it("groups tasks by assignee and phase with chronological stage labels", () => {
    const boards = buildAssigneeBoards(
      [
        {
          id: "r2",
          order_index: 2,
          day_index: 2,
          time_text: "10:00",
          event_text: "דוכנים",
          tasks: [
            { phase: "during", task_text: "העמדת דוכנים", assignee_name: "אחראי טכני" },
            { phase: "preparation", task_text: "הכנת חומר", assignee_name: "אחראי טכני" },
          ],
        },
        {
          id: "r1",
          order_index: 1,
          day_index: 1,
          time_text: "08:00",
          event_text: "יציאה",
          tasks: [{ phase: "preparation", task_text: "בדיקת ציוד", assignee_name: "אחראי טכני" }],
        },
        {
          id: "r3",
          order_index: 3,
          day_index: 2,
          time_text: "18:00",
          event_text: "סיכום",
          tasks: [{ phase: "after", task_text: "פירוק", assignee_name: "מדריך א" }],
        },
      ],
      (dayIndex) => ({ greg: `0${dayIndex}/05`, heb: "" }),
    );

    expect(boards).toHaveLength(2);
    const tech = boards.find((b) => b.name === "אחראי טכני");
    expect(tech?.totalCount).toBe(3);
    expect(tech?.phases.preparation.map((e) => e.taskText)).toEqual(["בדיקת ציוד", "הכנת חומר"]);
    expect(tech?.phases.preparation[0]?.stageLabel).toContain("יום 1");
    expect(tech?.phases.during[0]?.stageLabel).toContain("יום 2");
    expect(tech?.phases.during[0]?.stageLabel).toContain("דוכנים");
  });

  it("requires responsibilities_done on every schedule row", () => {
    expect(allResponsibilitiesColumnsDone([])).toBe(false);
    expect(
      allResponsibilitiesColumnsDone([
        { responsibilities_done: true },
        { responsibilities_done: false },
      ]),
    ).toBe(false);
    expect(
      allResponsibilitiesColumnsDone([
        { responsibilities_done: true },
        { responsibilities_done: true },
      ]),
    ).toBe(true);
  });

  it("includes safety risks under the owner assignee in during phase", () => {
    const boards = buildAssigneeBoards([
      {
        id: "r1",
        order_index: 1,
        day_index: 1,
        time_text: "09:00",
        event_text: "טיול",
        owner_name: "מדריך א",
        safety: [
          { risk: "דריסה", mitigation: "סימון", owner: "מדריך א" },
          { risk: "מעידה", owner: "מדריך א" },
        ],
      },
    ]);

    const guide = boards.find((b) => b.name === "מדריך א");
    expect(guide?.totalCount).toBe(2);
    expect(guide?.phases.during.map((e) => e.taskText)).toEqual(["דריסה · סימון", "מעידה"]);
  });

  it("filters boards for trip leader by coordinator name", () => {
    const boards = buildAssigneeBoards([
      {
        id: "r1",
        order_index: 1,
        day_index: 1,
        tasks: [{ phase: "during", task_text: "בדיקה", assignee_name: "אחראי טכני" }],
      },
    ]);
    expect(filterBoardsForTripLeader(boards, "אחראי טכני")).toHaveLength(1);
    expect(filterBoardsForTripLeader(boards, "אחר")).toHaveLength(0);
  });
});
