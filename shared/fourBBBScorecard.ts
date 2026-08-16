export type BestBallResult = {
  bestNet: number | null;
  countingSide: "player1" | "player2" | "both" | null;
};

/** Returns the lower net score for a 4BBB pair and identifies the score that counted. */
export function getBestBallNet(player1Net: number | null, player2Net: number | null): BestBallResult {
  if (player1Net === null && player2Net === null) return { bestNet: null, countingSide: null };
  if (player1Net === null) return { bestNet: player2Net, countingSide: "player2" };
  if (player2Net === null) return { bestNet: player1Net, countingSide: "player1" };
  if (player1Net === player2Net) return { bestNet: player1Net, countingSide: "both" };
  return player1Net < player2Net
    ? { bestNet: player1Net, countingSide: "player1" }
    : { bestNet: player2Net, countingSide: "player2" };
}

/** Returns the highest Stableford points score for a pair and identifies the score that counted. */
export function getBestBallStablefordPoints(player1Points: number | null, player2Points: number | null): BestBallResult {
  if (player1Points === null && player2Points === null) return { bestNet: null, countingSide: null };
  if (player1Points === null) return { bestNet: player2Points, countingSide: "player2" };
  if (player2Points === null) return { bestNet: player1Points, countingSide: "player1" };
  if (player1Points === player2Points) return { bestNet: player1Points, countingSide: "both" };
  return player1Points > player2Points
    ? { bestNet: player1Points, countingSide: "player1" }
    : { bestNet: player2Points, countingSide: "player2" };
}
