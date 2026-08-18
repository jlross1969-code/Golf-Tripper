import { describe, expect, it } from "vitest";
import { isFutureSchedule, toOneTimeUtcCron } from "../shared/tripSchedule";

describe("trip scheduling", () => {
  it("creates a six-field UTC cron expression for a planned event", () => {
    expect(toOneTimeUtcCron(new Date("2026-12-25T14:30:00.000Z"))).toBe("0 30 14 25 12 *");
  });
  it("requires a schedule at least one minute in the future", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(isFutureSchedule(new Date("2026-01-01T00:00:59.000Z"), now)).toBe(false);
    expect(isFutureSchedule(new Date("2026-01-01T00:01:00.000Z"), now)).toBe(true);
  });
});
