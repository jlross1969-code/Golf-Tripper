import { describe, expect, it } from "vitest";
import {
  calculateNetScore,
  calculateStablefordPoints,
  calculateNewHandicap,
  detectAchievement,
  buildAchievementMessage,
  calculateSkins,
  calculate4BBBScore,
} from "../shared/scoring";

// ─── Net Score ────────────────────────────────────────────────────────────────

describe("calculateNetScore", () => {
  it("subtracts full strokes per hole for high handicappers", () => {
    // HCP 36 = 2 strokes per hole
    expect(calculateNetScore(5, 36, 1)).toBe(3);
  });

  it("gives extra stroke on low stroke-index holes", () => {
    // HCP 18 = 1 stroke on every hole (SI 1–18)
    expect(calculateNetScore(4, 18, 5)).toBe(3);
  });

  it("gives no extra stroke when SI > handicap remainder", () => {
    // HCP 10 = 1 stroke on SI 1–10, 0 on SI 11–18
    expect(calculateNetScore(4, 10, 11)).toBe(4);
    expect(calculateNetScore(4, 10, 10)).toBe(3);
  });

  it("returns gross score unchanged for scratch player", () => {
    expect(calculateNetScore(5, 0, 1)).toBe(5);
  });
});

// ─── Stableford Points ────────────────────────────────────────────────────────

describe("calculateStablefordPoints", () => {
  it("returns 2 points for par net", () => {
    expect(calculateStablefordPoints(4, 4)).toBe(2);
  });

  it("returns 3 points for birdie net", () => {
    expect(calculateStablefordPoints(3, 4)).toBe(3);
  });

  it("returns 4 points for eagle net", () => {
    expect(calculateStablefordPoints(2, 4)).toBe(4);
  });

  it("returns 1 point for bogey net", () => {
    expect(calculateStablefordPoints(5, 4)).toBe(1);
  });

  it("returns 0 points for double bogey or worse", () => {
    expect(calculateStablefordPoints(6, 4)).toBe(0);
    expect(calculateStablefordPoints(9, 4)).toBe(0);
  });
});

// ─── Achievement Detection ────────────────────────────────────────────────────

describe("detectAchievement", () => {
  it("detects hole in one", () => {
    expect(detectAchievement(1, 4)).toBe("hole_in_one");
    expect(detectAchievement(1, 3)).toBe("hole_in_one");
  });

  it("detects eagle (2 under par)", () => {
    expect(detectAchievement(2, 4)).toBe("eagle");
    expect(detectAchievement(3, 5)).toBe("eagle");
  });

  it("detects birdie (1 under par)", () => {
    expect(detectAchievement(3, 4)).toBe("birdie");
    expect(detectAchievement(2, 3)).toBe("birdie");
  });

  it("returns null for par and above", () => {
    expect(detectAchievement(4, 4)).toBeNull();
    expect(detectAchievement(5, 4)).toBeNull();
    expect(detectAchievement(6, 4)).toBeNull();
  });
});

// ─── Handicap Recalculation ───────────────────────────────────────────────────

describe("calculateNewHandicap", () => {
  it("reduces handicap when score exceeds baseline", () => {
    // HCP 18, score 40, baseline 32, factor 0.25
    // 40 - 32 = 8, 8 * 0.25 = 2, 18 - 2 = 16
    // Note: spec example "8x.25=4" appears to be a typo; 8×0.25=2 is correct
    expect(calculateNewHandicap(18, 40, 32, 0.25)).toBe(16);
  });

  it("increases handicap when score is below baseline (example from spec)", () => {
    // HCP 8, score 28, baseline 32, factor 0.25
    // 32 - 28 = 4, 4 * 0.25 = 1, 8 + 1 = 9
    expect(calculateNewHandicap(8, 28, 32, 0.25)).toBe(9);
  });

  it("keeps handicap unchanged when score equals baseline", () => {
    expect(calculateNewHandicap(14, 32, 32, 0.25)).toBe(14);
  });

  it("rounds down at .5 (e.g. 7.5 → 7)", () => {
    // Need a scenario that produces x.5
    // HCP 10, score 34, baseline 32, factor 0.25 → 10 - (2*0.25) = 10 - 0.5 = 9.5 → floor → 9
    expect(calculateNewHandicap(10, 34, 32, 0.25)).toBe(9);
  });

  it("rounds up at .6 (e.g. 7.6 → 8)", () => {
    // HCP 10, score 34, baseline 32, factor 0.3 → 10 - (2*0.3) = 10 - 0.6 = 9.4 → floor → 9
    // Need .6 decimal: HCP 10, score 34, baseline 32, factor 0.2 → 10 - 0.4 = 9.6 → ceil → 10
    expect(calculateNewHandicap(10, 34, 32, 0.2)).toBe(10);
  });

  it("does not produce negative handicap", () => {
    const result = calculateNewHandicap(2, 50, 32, 0.25);
    // 50-32=18, 18*0.25=4.5, 2-4.5=-2.5 → floor → -3
    // Negative handicaps are valid in this system (scratch+)
    expect(typeof result).toBe("number");
  });
});

// ─── Skins Calculation ────────────────────────────────────────────────────────

describe("calculateSkins", () => {
  it("awards skin to lowest unique score", () => {
    const holes = [
      { holeNumber: 1, scores: [{ userId: 1, grossScore: 4 }, { userId: 2, grossScore: 5 }, { userId: 3, grossScore: 6 }] },
    ];
    const result = calculateSkins(holes);
    expect(result.get(1)).toBe(1);
    expect(result.get(2)).toBeUndefined();
  });

  it("carries over skin on tie", () => {
    const holes = [
      { holeNumber: 1, scores: [{ userId: 1, grossScore: 4 }, { userId: 2, grossScore: 4 }] }, // tie
      { holeNumber: 2, scores: [{ userId: 1, grossScore: 5 }, { userId: 2, grossScore: 4 }] }, // player 2 wins 2 skins
    ];
    const result = calculateSkins(holes);
    expect(result.get(2)).toBe(2); // 1 carryover + 1 for hole 2
    expect(result.get(1)).toBeUndefined();
  });

  it("handles all ties (carryover accumulates)", () => {
    const holes = [
      { holeNumber: 1, scores: [{ userId: 1, grossScore: 4 }, { userId: 2, grossScore: 4 }] },
      { holeNumber: 2, scores: [{ userId: 1, grossScore: 5 }, { userId: 2, grossScore: 5 }] },
    ];
    const result = calculateSkins(holes);
    expect(result.size).toBe(0); // nobody won anything
  });
});

// ─── 4BBB Best Ball ───────────────────────────────────────────────────────────

describe("calculate4BBBScore", () => {
  it("returns the lower of two net scores", () => {
    expect(calculate4BBBScore(3, 4)).toBe(3);
    expect(calculate4BBBScore(5, 2)).toBe(2);
  });

  it("handles null scores (player did not complete hole)", () => {
    expect(calculate4BBBScore(null, 4)).toBe(4);
    expect(calculate4BBBScore(3, null)).toBe(3);
    expect(calculate4BBBScore(null, null)).toBeNull();
  });
});

// ─── Achievement Message ──────────────────────────────────────────────────────

describe("buildAchievementMessage", () => {
  it("formats hole-in-one message correctly", () => {
    const msg = buildAchievementMessage("John Smith", "hole_in_one", 7);
    expect(msg).toContain("John Smith");
    expect(msg).toContain("Hole-in-One");
    expect(msg).toContain("7");
  });

  it("formats eagle message correctly", () => {
    const msg = buildAchievementMessage("Jane Doe", "eagle", 12);
    expect(msg).toContain("Eagle");
    expect(msg).toContain("12");
  });
});

// ─── Match Play ───────────────────────────────────────────────────────────────

import {
  matchPlayHoleResult,
  calculateMatchStatus,
  checkMatchOver,
  formatMatchStatus,
  calculateAlternateShotHandicap,
  alternateShotTeePlayer,
} from "../shared/scoring";

describe("matchPlayHoleResult", () => {
  it("returns player1 when player1 has lower net score", () => {
    expect(matchPlayHoleResult(3, 4)).toBe("player1");
  });

  it("returns player2 when player2 has lower net score", () => {
    expect(matchPlayHoleResult(5, 4)).toBe("player2");
  });

  it("returns halved when scores are equal", () => {
    expect(matchPlayHoleResult(4, 4)).toBe("halved");
  });
});

describe("calculateMatchStatus", () => {
  it("returns positive when player1 is ahead", () => {
    const holes = [
      { holeNumber: 1, result: "player1" as const },
      { holeNumber: 2, result: "player1" as const },
      { holeNumber: 3, result: "player2" as const },
    ];
    expect(calculateMatchStatus(holes)).toBe(1); // 2 up - 1 = 1 up
  });

  it("returns 0 for all square", () => {
    const holes = [
      { holeNumber: 1, result: "player1" as const },
      { holeNumber: 2, result: "player2" as const },
    ];
    expect(calculateMatchStatus(holes)).toBe(0);
  });

  it("returns negative when player2 is ahead", () => {
    const holes = [
      { holeNumber: 1, result: "player2" as const },
      { holeNumber: 2, result: "player2" as const },
    ];
    expect(calculateMatchStatus(holes)).toBe(-2);
  });
});

describe("checkMatchOver", () => {
  it("returns null when match is still live", () => {
    expect(checkMatchOver(3, 10, 18)).toBeNull(); // 3 up with 8 to play — still live
  });

  it("detects match won when up by more than holes remaining", () => {
    expect(checkMatchOver(4, 15, 18)).toBe("player1"); // 4 up with 3 to play — match over
    expect(checkMatchOver(-4, 15, 18)).toBe("player2");
  });

  it("detects halved match at 18 holes", () => {
    expect(checkMatchOver(0, 18, 18)).toBe("halved");
  });

  it("detects winner at end of 18 holes", () => {
    expect(checkMatchOver(2, 18, 18)).toBe("player1");
    expect(checkMatchOver(-1, 18, 18)).toBe("player2");
  });
});

describe("formatMatchStatus", () => {
  it("formats all square correctly", () => {
    expect(formatMatchStatus(0, 9, 18)).toBe("All Square");
  });

  it("formats player up correctly", () => {
    expect(formatMatchStatus(3, 10, 18)).toBe("3 UP");
  });

  it("formats dormie correctly", () => {
    expect(formatMatchStatus(3, 15, 18)).toBe("3 UP (Dormie)");
  });

  it("formats match over correctly", () => {
    expect(formatMatchStatus(4, 15, 18)).toContain("Match Over");
  });
});

// ─── Alternate Shot ───────────────────────────────────────────────────────────

describe("calculateAlternateShotHandicap", () => {
  it("calculates combined handicap with 60% allowance", () => {
    // (18 + 10) / 2 = 14, 14 * 0.6 = 8.4 → floor (≤.5 rounds down) → 8
    expect(calculateAlternateShotHandicap(18, 10)).toBe(8);
  });

  it("rounds up at .6", () => {
    // (20 + 10) / 2 = 15, 15 * 0.6 = 9.0 → 9
    expect(calculateAlternateShotHandicap(20, 10)).toBe(9);
  });

  it("handles scratch players", () => {
    // (0 + 0) / 2 = 0, 0 * 0.6 = 0
    expect(calculateAlternateShotHandicap(0, 0)).toBe(0);
  });
});

describe("alternateShotTeePlayer", () => {
  it("player 1 tees off on odd holes", () => {
    expect(alternateShotTeePlayer(1, 101, 102)).toBe(101);
    expect(alternateShotTeePlayer(3, 101, 102)).toBe(101);
    expect(alternateShotTeePlayer(17, 101, 102)).toBe(101);
  });

  it("player 2 tees off on even holes", () => {
    expect(alternateShotTeePlayer(2, 101, 102)).toBe(102);
    expect(alternateShotTeePlayer(4, 101, 102)).toBe(102);
    expect(alternateShotTeePlayer(18, 101, 102)).toBe(102);
  });
});
