import { describe, expect, it } from "vitest";
import {
  canAddPlaceholderToMerge,
  findConflictingStaffRoleKeys,
  validateStaffRoleMerge,
} from "@/lib/staffRoleMerge";

const person = (id: string, roleKeys: string[]) => ({
  id,
  raw: { requiredRoleKeys: roleKeys },
});

describe("staffRoleMerge", () => {
  it("detects duplicate role keys in selected placeholders", () => {
    const conflicts = findConflictingStaffRoleKeys(undefined, [
      person("a", ["bus_escort"]),
      person("b", ["bus_escort"]),
    ]);
    expect(conflicts).toEqual(["bus_escort"]);
  });

  it("detects role key already assigned to target", () => {
    const conflicts = findConflictingStaffRoleKeys(person("target", ["bus_escort"]), [person("slot", ["bus_escort"])]);
    expect(conflicts).toEqual(["bus_escort"]);
  });

  it("allows merging different role categories", () => {
    const validation = validateStaffRoleMerge(person("target", ["bus_escort"]), [person("slot", ["adult_staff"])]);
    expect(validation.ok).toBe(true);
  });

  it("blocks adding placeholder that conflicts with selection", () => {
    const allowed = canAddPlaceholderToMerge(undefined, [person("a", ["bus_escort"])], person("b", ["bus_escort"]));
    expect(allowed).toBe(false);
  });

  it("returns a readable validation message", () => {
    const validation = validateStaffRoleMerge(undefined, [
      person("a", ["bus_escort"]),
      person("b", ["bus_escort"]),
    ]);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.message).toContain("מלווה אוטובוס");
    }
  });
});
