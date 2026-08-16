import { describe, expect, it } from "vitest";
import { isAutomaticFourBBBReady, resolveMutualScoreMarkerPairs } from "../shared/sideMatchAutomation";

describe("automatic score-marker side matches", () => {
  it("confirms only mutually selected score markers as pairs", () => {
    const pairs = resolveMutualScoreMarkerPairs([
      { userId: 1, selectedMarkerId: 2 },
      { userId: 2, selectedMarkerId: 1 },
      { userId: 3, selectedMarkerId: 4 },
      { userId: 4, selectedMarkerId: 3 },
    ]);
    expect(pairs).toEqual([[1, 2], [3, 4]]);
  });

  it("does not create a pair from a one-way selection", () => {
    expect(resolveMutualScoreMarkerPairs([
      { userId: 1, selectedMarkerId: 2 },
      { userId: 2, selectedMarkerId: null },
    ])).toEqual([]);
  });

  it("requires two complete mutual pairs for the automatic four-ball match", () => {
    expect(isAutomaticFourBBBReady([
      { userId: 1, selectedMarkerId: 2 },
      { userId: 2, selectedMarkerId: 1 },
      { userId: 3, selectedMarkerId: 4 },
      { userId: 4, selectedMarkerId: 3 },
    ])).toBe(true);
    expect(isAutomaticFourBBBReady([
      { userId: 1, selectedMarkerId: 2 },
      { userId: 2, selectedMarkerId: 1 },
      { userId: 3, selectedMarkerId: 4 },
      { userId: 4, selectedMarkerId: null },
    ])).toBe(false);
  });
});
