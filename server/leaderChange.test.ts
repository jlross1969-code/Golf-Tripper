import { describe, expect, it } from "vitest";
import { leaderChanged, outrightLeader } from "../shared/leaderChange";

const t = (userId: number, points: number, holesPlayed = 9) => ({ userId, name: `P${userId}`, points, holesPlayed });

describe("leader change", () => {
  it("ignores ties and players with too few holes", () => {
    expect(outrightLeader([t(1, 20), t(2, 20)])).toBeNull();
    expect(outrightLeader([t(1, 30, 2), t(2, 10)])?.userId).toBe(2);
  });
  it("announces only a real change from a known leader", () => {
    expect(leaderChanged(undefined, t(1, 10))).toBe(false);
    expect(leaderChanged(1, t(1, 10))).toBe(false);
    expect(leaderChanged(1, t(2, 12))).toBe(true);
    expect(leaderChanged(1, null)).toBe(false);
  });
});
