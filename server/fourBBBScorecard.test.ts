import { describe, expect, it } from "vitest";
import { getBestBallNet } from "../shared/fourBBBScorecard";

describe("4BBB pair scorecard best-ball selection", () => {
  it("selects the lower net score and identifies the counting player", () => {
    expect(getBestBallNet(5, 4)).toEqual({ bestNet: 4, countingSide: "player2" });
    expect(getBestBallNet(3, 5)).toEqual({ bestNet: 3, countingSide: "player1" });
  });

  it("marks both players when their net scores tie", () => {
    expect(getBestBallNet(4, 4)).toEqual({ bestNet: 4, countingSide: "both" });
  });

  it("uses the available player score if a partner score is missing", () => {
    expect(getBestBallNet(null, 5)).toEqual({ bestNet: 5, countingSide: "player2" });
    expect(getBestBallNet(4, null)).toEqual({ bestNet: 4, countingSide: "player1" });
    expect(getBestBallNet(null, null)).toEqual({ bestNet: null, countingSide: null });
  });
});
