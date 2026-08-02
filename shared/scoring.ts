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

// ─── Match Play Scoring ───────────────────────────────────────────────────────

export type HoleResult = "player1" | "player2" | "halved";

export interface MatchPlayHoleResult {
  holeNumber: number;
  result: HoleResult;
}

/**
 * Determine the result of a single hole in match play.
 * Lower net score wins the hole. Equal net scores are halved.
 */
export function matchPlayHoleResult(
  player1NetScore: number,
  player2NetScore: number
): HoleResult {
  if (player1NetScore < player2NetScore) return "player1";
  if (player2NetScore < player1NetScore) return "player2";
  return "halved";
}

/**
 * Calculate running match status from hole results.
 * Returns: positive = player1 up by N, negative = player2 up by N, 0 = All Square.
 */
export function calculateMatchStatus(holeResults: MatchPlayHoleResult[]): number {
  let status = 0;
  for (const h of holeResults) {
    if (h.result === "player1") status++;
    else if (h.result === "player2") status--;
  }
  return status;
}

/**
 * Format match status as a display string.
 * e.g. +3 → "3 UP", -2 → "2 DOWN", 0 → "All Square"
 */
export function formatMatchStatus(status: number, holesPlayed: number, totalHoles: number): string {
  const holesRemaining = totalHoles - holesPlayed;
  if (status === 0) return "All Square";
  const absStatus = Math.abs(status);
  const direction = status > 0 ? "UP" : "DOWN";
  // Check for dormie or closed match
  if (absStatus > holesRemaining) return `${absStatus} & ${holesRemaining} (Match Over)`;
  if (absStatus === holesRemaining) return `${absStatus} UP (Dormie)`;
  return `${absStatus} ${direction}`;
}

/**
 * Determine if a match has been won (player is up by more holes than remain).
 * Returns the winner or null if match is still live.
 */
export function checkMatchOver(
  status: number,
  holesPlayed: number,
  totalHoles: number
): "player1" | "player2" | "halved" | null {
  const holesRemaining = totalHoles - holesPlayed;
  if (holesPlayed === totalHoles) {
    if (status > 0) return "player1";
    if (status < 0) return "player2";
    return "halved";
  }
  if (status > holesRemaining) return "player1";
  if (-status > holesRemaining) return "player2";
  return null;
}

// ─── Alternate Shot Scoring ───────────────────────────────────────────────────

/**
 * Calculate the combined handicap allowance for an Alternate Shot pair.
 * Standard rule: combined handicap = (player1Hcp + player2Hcp) / 2, then apply 60% allowance.
 * Rounded to nearest integer.
 */
export function calculateAlternateShotHandicap(
  player1Handicap: number,
  player2Handicap: number
): number {
  const combined = (player1Handicap + player2Handicap) / 2;
  const allowance = combined * 0.6;
  const decimal = allowance - Math.floor(allowance);
  return decimal <= 0.5 ? Math.floor(allowance) : Math.ceil(allowance);
}

/**
 * Determine which partner tees off on a given hole in Alternate Shot.
 * The player who tees off on hole 1 alternates each hole.
 * Returns the userId of the player who should tee off.
 */
export function alternateShotTeePlayer(
  holeNumber: number,
  firstTeePlayerId: number,
  partnerId: number
): number {
  // Odd holes → first tee player, Even holes → partner (1-indexed)
  return holeNumber % 2 === 1 ? firstTeePlayerId : partnerId;
}


// ─── Ambrose Scoring ─────────────────────────────────────────────────────────

/**
 * Calculate the Ambrose team handicap allowance.
 * Combined handicap = sum of all team members' handicaps / team size.
 * Apply 75% allowance for 2-person teams, 100% for 3-4 person teams.
 */
export function calculateAmbroseTeamHandicap(
  playerHandicaps: number[],
  teamSize: number
): number {
  const sum = playerHandicaps.reduce((a, b) => a + b, 0);
  const combined = sum / teamSize;
  const allowanceFactor = teamSize === 2 ? 0.75 : 1.0;
  const allowance = combined * allowanceFactor;
  const decimal = allowance - Math.floor(allowance);
  return decimal <= 0.5 ? Math.floor(allowance) : Math.ceil(allowance);
}

/**
 * Calculate net score for an Ambrose team on a hole.
 */
export function calculateAmbroseNetScore(
  grossScore: number,
  teamHandicap: number,
  holeStrokeIndex: number
): number {
  const fullStrokes = Math.floor(teamHandicap / 18);
  const extraStrokes = teamHandicap % 18 >= holeStrokeIndex ? 1 : 0;
  const strokesReceived = fullStrokes + extraStrokes;
  return grossScore - strokesReceived;
}
