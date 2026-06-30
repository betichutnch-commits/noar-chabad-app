import { describe, expect, it } from "vitest";
import { profileContactNameFields } from "@/lib/userDisplay";

describe("profileContactNameFields", () => {
  it("prefers nickname over official name for first name column", () => {
    expect(
      profileContactNameFields(
        { official_name: "רחל", last_name: "הלפרין" },
        { nickname: "מצאל" },
      ),
    ).toEqual({ firstName: "מצאל", lastName: "הלפרין" });
  });

  it("uses official name when nickname is missing", () => {
    expect(profileContactNameFields({ official_name: "רחל", last_name: "הלפרין" }, {})).toEqual({
      firstName: "רחל",
      lastName: "הלפרין",
    });
  });
});
