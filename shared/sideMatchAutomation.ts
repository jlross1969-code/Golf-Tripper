export type ScoreMarkerSelection = {
  userId: number | null;
  selectedMarkerId: number | null;
};

/**
 * Returns every unique pair of golfers who independently selected each other to
 * mark scorecards. Only these mutual choices can create automatic side matches.
 */
export function resolveMutualScoreMarkerPairs(members: ScoreMarkerSelection[]): [number, number][] {
  const selectedByUserId = new Map(
    members
      .filter((member): member is ScoreMarkerSelection & { userId: number } => member.userId !== null)
      .map((member) => [member.userId, member.selectedMarkerId])
  );
  const pairs: [number, number][] = [];
  for (const [userId, selectedMarkerId] of selectedByUserId) {
    if (!selectedMarkerId || selectedByUserId.get(selectedMarkerId) !== userId) continue;
    if (userId < selectedMarkerId) pairs.push([userId, selectedMarkerId]);
  }
  return pairs;
}

/** A default 4BBB automatic match needs exactly two non-overlapping marker pairs in a four-ball. */
export function isAutomaticFourBBBReady(members: ScoreMarkerSelection[]): boolean {
  const registered = members.filter((member) => member.userId !== null);
  const pairs = resolveMutualScoreMarkerPairs(registered);
  return registered.length === 4 && pairs.length === 2 && new Set(pairs.flat()).size === 4;
}
