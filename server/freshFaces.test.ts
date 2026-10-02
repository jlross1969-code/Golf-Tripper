import { describe, expect, it } from "vitest";
import { arrangeFreshFaces, pairKey } from "../shared/freshFaces";

describe("arrangeFreshFaces", () => {
  const hcp = new Map([[1, 5], [2, 10], [3, 15], [4, 20], [5, 6], [6, 11], [7, 16], [8, 21]]);

  it("places every player exactly once", () => {
    const groups = arrangeFreshFaces([1, 2, 3, 4, 5, 6, 7, 8], hcp, 2, new Map());
    expect(groups.flat().sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("splits up people who have played together before", () => {
    const history = new Map([[pairKey(1, 8), 3], [pairKey(2, 7), 3]]);
    const groups = arrangeFreshFaces([1, 2, 3, 4, 5, 6, 7, 8], hcp, 2, history);
    for (const group of groups) {
      expect(group.includes(1) && group.includes(8)).toBe(false);
      expect(group.includes(2) && group.includes(7)).toBe(false);
    }
  });
});
