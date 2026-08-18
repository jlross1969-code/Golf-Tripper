import { describe, expect, it } from "vitest";
import { getSideMatchDailyLeader, sortSideMatchDailyPlayers } from "../shared/sideMatchDailyResults";

describe("daily side-match result ranking", () => {
  const players = [{ userId: 1, stableford: 30, gross: 86, holesPlayed: 18 }, { userId: 2, stableford: 34, gross: 91, holesPlayed: 18 }];
  it("ranks Stableford by highest points and stroke play by lowest gross", () => {
    expect(sortSideMatchDailyPlayers("stableford", players).map((player) => player.userId)).toEqual([2, 1]);
    expect(sortSideMatchDailyPlayers("stroke", players).map((player) => player.userId)).toEqual([1, 2]);
  });
  it("returns a label appropriate to the side-match format", () => {
    expect(getSideMatchDailyLeader("stableford", players)).toMatchObject({ userId: 2, value: 34, label: "pts" });
    expect(getSideMatchDailyLeader("stroke", players)).toMatchObject({ userId: 1, value: 86, label: "gross" });
  });
});
