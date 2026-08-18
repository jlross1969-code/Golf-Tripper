import { describe, expect, it } from "vitest";
import { resolveTripAppearanceForDate } from "../shared/tripAppearanceSchedule";

describe("trip event-day appearance", () => {
  it("uses the event-day scheme ahead of the trip default", () => {
    expect(resolveTripAppearanceForDate([{ appearanceDate: "2026-08-18T12:00:00.000Z", colorScheme: "ocean" }], "fairway", new Date("2026-08-18T12:00:00.000Z"))).toBe("ocean");
  });

  it("falls back to the trip default when no scheduled day matches", () => {
    expect(resolveTripAppearanceForDate([{ appearanceDate: "2026-08-19T12:00:00.000Z", colorScheme: "plum" }], "sand", new Date("2026-08-18T12:00:00.000Z"))).toBe("sand");
  });
});
