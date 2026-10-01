export type RoundTotal = { userId: number; name: string; points: number; holesPlayed: number };

/** Returns the outright leader, or null when nobody has played enough holes or the lead is tied. */
export function outrightLeader(totals: RoundTotal[], minHoles = 3): RoundTotal | null {
  const eligible = totals.filter((t) => t.holesPlayed >= minHoles).sort((a, b) => b.points - a.points);
  if (!eligible.length) return null;
  if (eligible.length > 1 && eligible[0].points === eligible[1].points) return null;
  return eligible[0];
}

/** Decides whether a new leader deserves an announcement. */
export function leaderChanged(previousLeaderId: number | undefined, leader: RoundTotal | null) {
  return !!leader && previousLeaderId !== undefined && previousLeaderId !== leader.userId;
}
