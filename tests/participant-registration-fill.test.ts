import { describe, expect, it } from "vitest";
import {
  buildRegistrationSnapshotFromProfile,
  mergeRegistrationIntoRaw,
  parseMotherNameFromFullNameMother,
  readParticipantRawField,
  readRegistrationFieldsFromRaw,
} from "@/lib/participantRegistrationFill";

describe("participantRegistrationFill", () => {
  it("reads Hebrew raw field aliases", () => {
    expect(readParticipantRawField({ סניף: "ירושלים" }, "branch")).toBe("ירושלים");
    expect(readParticipantRawField({ "שם אמא": "שרה" }, "motherName")).toBe("שרה");
    expect(readParticipantRawField({ מגדר: "נקבה" }, "gender")).toBe("נקבה");
  });

  it("builds a registration snapshot from profile and metadata", () => {
    const snapshot = buildRegistrationSnapshotFromProfile(
      {
        official_name: "יוסף",
        last_name: "כהן",
        identity_number: "123456789",
        phone: "0501234567",
        email: "yosef@example.com",
        birth_date: "2000-01-01",
        department: 'בנות חב"ד',
      },
      {
        branch_name: "ירושלים",
        full_name_mother: "יוסף בן רבקה",
      },
    );
    expect(snapshot.firstName).toBe("יוסף");
    expect(snapshot.branch).toBe("ירושלים");
    expect(snapshot.gender).toBe("female");
    expect(snapshot.motherName).toBe("רבקה");
  });

  it("parses mother name from full_name_mother", () => {
    expect(parseMotherNameFromFullNameMother("משה בן שרה")).toBe("שרה");
    expect(parseMotherNameFromFullNameMother("רחל בת לאה")).toBe("לאה");
  });

  it("merges registration values only into empty raw keys", () => {
    const merged = mergeRegistrationIntoRaw(
      { branch: "קיים", "שם אמא": "שרה" },
      { branch: "חדש", motherName: "לאה", gender: "male" },
    );
    expect(merged.branch).toBe("קיים");
    expect(merged.motherName).toBe("שרה");
    expect(merged.gender).toBe("male");
  });

  it("reads all known fields from mixed raw sources", () => {
    const snapshot = readRegistrationFieldsFromRaw({
      "שם פרטי": "דוד",
      "טל' אבא": "0501111111",
      מגדר: "זכר",
    });
    expect(snapshot.firstName).toBe("דוד");
    expect(snapshot.fatherPhone).toBe("0501111111");
    expect(snapshot.gender).toBe("male");
  });
});
