// ─── Scoring Utilities ────────────────────────────────────────────────────────

/**
 * Calculate net score from gross score and handicap strokes on a hole.
 * strokesReceived = Math.floor(handicap / 18) + (holeStrokeIndex <= handicap % 18 ? 1 : 0)
 */
export function calculateNetScore(grossScore: number, handicap: number, holeStrokeIndex: number): number {
  const fullStrokes = Math.floor(handicap / 18);
  const extraStrokes = handicap % 18 >= holeStrokeIndex ? 1 : 0;
  const strokesReceived = fullStrokes + extraStrokes;
  return grossScore - strokesReceived;
}

/**
 * Calculate Stableford points for a hole.
 * Points = par + 2 - net score (minimum 0)
 */
export function calculateStablefordPoints(netScore: number, par: number): number {
  return Math.max(0, par + 2 - netScore);
}

/**
 * Detect achievement type based on gross score vs par.
 */
export function detectAchievement(grossScore: number, par: number): "hole_in_one" | "eagle" | "birdie" | null {
  if (grossScore === 1) return "hole_in_one";
  if (grossScore <= par - 2) return "eagle";
  if (grossScore === par - 1) return "birdie";
  return null;
}

/**
 * Format achievement type for display.
 */
export function formatAchievementType(type: "hole_in_one" | "eagle" | "birdie"): string {
  switch (type) {
    case "hole_in_one": return "Hole-in-One";
    case "eagle": return "Eagle";
    case "birdie": return "Birdie";
  }
}

/**
 * Build broadcast message for an achievement.
 */
export function buildAchievementMessage(playerName: string, type: "hole_in_one" | "eagle" | "birdie", holeNumber: number): string {
  const label = formatAchievementType(type);
  const emoji = type === "hole_in_one" ? "🏆" : type === "eagle" ? "🦅" : "🐦";
  return `${emoji} ${playerName} just made a ${label} on Hole ${holeNumber}!`;
}

/**
 * Calculate new handicap after a round.
 * Rules:
 *   - If score > baseline: newHcp = currentHcp - ((score - baseline) * factor)
 *   - If score < baseline: newHcp = currentHcp + ((baseline - score) * factor)
 *   - If score == baseline: no change
 * Rounding: .5 and below → floor, .6 and above → ceil
 */
export function calculateNewHandicap(
  currentHandicap: number,
  roundScore: number,
  baseline: number,
  factor: number
): number {
  let rawNew: number;
  if (roundScore > baseline) {
    rawNew = currentHandicap - (roundScore - baseline) * factor;
  } else if (roundScore < baseline) {
    rawNew = currentHandicap + (baseline - roundScore) * factor;
  } else {
    return currentHandicap;
  }

  // Custom rounding: .5 and below → floor, .6 and above → ceil
  const decimal = rawNew - Math.floor(rawNew);
  if (decimal <= 0.5) {
    return Math.floor(rawNew);
  } else {
    return Math.ceil(rawNew);
  }
}

/**
 * Calculate 4BBB (Four-Ball Better Ball) score for a hole.
 * Returns the better (lower) net score between two partners.
 */
export function calculate4BBBScore(
  player1NetScore: number | null,
  player2NetScore: number | null
): number | null {
  if (player1NetScore === null && player2NetScore === null) return null;
  if (player1NetScore === null) return player2NetScore;
  if (player2NetScore === null) return player1NetScore;
  return Math.min(player1NetScore, player2NetScore);
}

/**
 * Calculate Skins results for a round.
 * A skin is won when one player has the strictly lowest score on a hole.
 * Tied holes carry over the skin to the next hole.
 * Returns a map of userId → skins won.
 */
export function calculateSkins(
  holeScores: { holeNumber: number; scores: { userId: number; grossScore: number }[] }[]
): Map<number, number> {
  const skinsMap = new Map<number, number>();
  let carryover = 0;

  for (const hole of holeScores) {
    const validScores = hole.scores.filter((s) => s.grossScore > 0);
    if (validScores.length === 0) continue;

    const minScore = Math.min(...validScores.map((s) => s.grossScore));
    const winners = validScores.filter((s) => s.grossScore === minScore);

    if (winners.length === 1) {
      const winnerId = winners[0].userId;
      skinsMap.set(winnerId, (skinsMap.get(winnerId) ?? 0) + 1 + carryover);
      carryover = 0;
    } else {
      // Tie — skin carries over
      carryover++;
    }
  }

  return skinsMap;
}
