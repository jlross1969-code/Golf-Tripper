import { describe, expect, it } from "vitest";
import { getAppearanceDateKey, hasAppearanceScheduleConflict } from "../shared/tripAppearanceCalendar";

describe("trip appearance calendar", () => {
  it("normalises calendar days without comparing time-of-day", () => {
    expect(getAppearanceDateKey("2026-07-27T12:00:00.000Z")).toBe("2026-07-27");
  });

  it("finds a conflicting scheduled appearance on the same event day", () => {
    expect(hasAppearanceScheduleConflict([{ appearanceDate: "2026-07-27T12:00:00.000Z" }], "2026-07-27")).toBe(true);
    expect(hasAppearanceScheduleConflict([{ appearanceDate: "2026-07-27T12:00:00.000Z" }], "2026-07-28")).toBe(false);
  });
});
