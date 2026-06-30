import { describe, expect, it } from "vitest";
import {
  formatStaffRoleLabelForGender,
  normalizeStaffGender,
  readRawGenderValue,
  requiresStaffPoliceApproval,
  resolveStaffGender,
  staffGenderFromDepartment,
  staffGenderLabel,
} from "@/lib/staffGender";

describe("staffGender", () => {
  it("normalizes Hebrew and English gender values", () => {
    expect(normalizeStaffGender("זכר")).toBe("male");
    expect(normalizeStaffGender("נקבה")).toBe("female");
    expect(normalizeStaffGender("male")).toBe("male");
    expect(normalizeStaffGender("")).toBe("");
  });

  it("reads gender from raw registration fields", () => {
    expect(readRawGenderValue({ gender: "male" })).toBe("male");
    expect(readRawGenderValue({ מגדר: "נקבה" })).toBe("female");
  });

  it("infers gender from registered department", () => {
    expect(staffGenderFromDepartment('בנות חב"ד')).toBe("female");
    expect(staffGenderFromDepartment("הפנסאים")).toBe("male");
    expect(staffGenderFromDepartment("מועדוני המעשים הטובים")).toBe("");
  });

  it("prefers explicit raw gender over department inference", () => {
    expect(
      resolveStaffGender({
        raw: { gender: "female" },
        profileDepartment: "הפנסאים",
      }),
    ).toBe("female");
  });

  it("resolves gender from profile department when raw is empty", () => {
    expect(
      resolveStaffGender({
        raw: {},
        profileDepartment: "בת מלך",
      }),
    ).toBe("female");
  });

  it("requires police approval only for males over 18", () => {
    const adult = () => 21;
    expect(
      requiresStaffPoliceApproval({ type: "staff", birthDate: "01/01/2000", gender: "male", calculateAge: adult }),
    ).toBe(true);
    expect(
      requiresStaffPoliceApproval({ type: "staff", birthDate: "01/01/2000", gender: "female", calculateAge: adult }),
    ).toBe(false);
    expect(
      requiresStaffPoliceApproval({ type: "staff", birthDate: "01/01/2012", gender: "male", calculateAge: () => 14 }),
    ).toBe(false);
  });

  it("returns Hebrew gender labels", () => {
    expect(staffGenderLabel("male")).toBe("זכר");
    expect(staffGenderLabel("female")).toBe("נקבה");
  });

  it("formats staff role labels for gender", () => {
    expect(formatStaffRoleLabelForGender("אחראי טיול", "female")).toBe("אחראית טיול");
    expect(formatStaffRoleLabelForGender("אחראי נוסף", "female")).toBe("אחראית נוספת");
    expect(formatStaffRoleLabelForGender("מאבטח", "female")).toBe("מאבטחת");
    expect(formatStaffRoleLabelForGender("מלווה רפואי", "female")).toBe("מלווה רפואית");
    expect(formatStaffRoleLabelForGender("אחראית טיול", "male")).toBe("אחראי טיול");
    expect(formatStaffRoleLabelForGender("אחראי טיול", "")).toBe("אחראי טיול");
    expect(formatStaffRoleLabelForGender("אחראי טיול 2", "female")).toBe("אחראית טיול 2");
  });
});
