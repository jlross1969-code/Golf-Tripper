import { describe, expect, it } from "vitest";
import { getImportedTeeNames, selectImportedTee, type ImportedCourseScorecard } from "../shared/courseScorecardImport";

const scorecard: ImportedCourseScorecard = {
  courseName: "Citi Day 2",
  measurement: "meters",
  holes: [
    { holeNumber: 1, par: 4, tees: [{ name: "Black", distanceMeters: 420, strokeIndex: 1 }, { name: "Blue", distanceMeters: 385, strokeIndex: 1 }] },
    { holeNumber: 2, par: 3, tees: [{ name: "Black", distanceMeters: 160, strokeIndex: 15 }, { name: "Blue", distanceMeters: 150, strokeIndex: 16 }] },
  ],
};

describe("course scorecard tee import", () => {
  it("detects every tee option available in an imported scorecard", () => {
    expect(getImportedTeeNames(scorecard)).toEqual(["Black", "Blue"]);
  });

  it("uses the admin-selected tee for distance and stroke index", () => {
    expect(selectImportedTee(scorecard, "Blue")).toEqual([
      { holeNumber: 1, par: 4, strokeIndex: 1, distanceMeters: 385 },
      { holeNumber: 2, par: 3, strokeIndex: 16, distanceMeters: 150 },
    ]);
  });

  it("rejects a tee that is incomplete in the source scorecard", () => {
    expect(() => selectImportedTee(scorecard, "White")).toThrow("missing");
  });
});
