import { describe, expect, it } from "vitest";
import { shouldHideTripCourses } from "../shared/mysteryCourse";

describe("mystery course visibility", () => {
  it("hides a course only while mystery mode is enabled and unrevealed", () => {
    expect(shouldHideTripCourses(false, false)).toBe(false);
    expect(shouldHideTripCourses(true, false)).toBe(true);
    expect(shouldHideTripCourses(true, true)).toBe(false);
  });
});
