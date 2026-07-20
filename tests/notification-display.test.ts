import { describe, expect, it } from "vitest";
import {
  extractTripNameFromNotification,
  formatNotificationTitle,
  resolveNotificationDisplay,
  withTripNotificationTitle,
} from "@/lib/notificationDisplay";

describe("notificationDisplay", () => {
  it("extracts quoted trip name from message", () => {
    expect(
      extractTripNameFromNotification('הטיול "טיול לצפון" אושר לפרסום ותכנון.'),
    ).toBe("טיול לצפון");
  });

  it("splits legacy guillemet titles for display", () => {
    expect(
      resolveNotificationDisplay("«טיול לצפון» · הטיול אושר לפרסום ותכנון!", null),
    ).toEqual({
      tripName: "טיול לצפון",
      title: "הטיול אושר לפרסום ותכנון!",
    });
  });

  it("uses trip name from message when title is plain", () => {
    expect(
      resolveNotificationDisplay(
        "הטיול אושר לפרסום ותכנון!",
        'הטיול "טיול לצפון" אושר לפרסום ותכנון.',
      ),
    ).toEqual({
      tripName: "טיול לצפון",
      title: "הטיול אושר לפרסום ותכנון!",
    });
  });

  it("formats plain-text label without guillemets", () => {
    expect(
      formatNotificationTitle(
        "הטיול אושר לפרסום ותכנון!",
        'הטיול "טיול לצפון" אושר לפרסום ותכנון.',
      ),
    ).toBe("טיול לצפון — הטיול אושר לפרסום ותכנון!");
  });

  it("stores only action text in notification title", () => {
    expect(withTripNotificationTitle("טיול לצפון", "הבקשה הועברה למחלקת הבטיחות")).toBe(
      "הבקשה הועברה למחלקת הבטיחות",
    );
  });
});
