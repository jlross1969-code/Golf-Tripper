export type PlayedRound = { roundId: number; tripId: number; tripName: string; date: Date; points: number; gross: number; holesPlayed: number };

export type CareerSummary = {
  roundsPlayed: number;
  averagePoints: number | null;
  bestRound: PlayedRound | null;
  averageGross18: number | null;
  perTrip: { tripId: number; tripName: string; rounds: number; points: number }[];
};

/** Only completed-looking rounds (9+ holes) count towards averages so partial cards do not skew them. */
export function summariseCareer(rounds: PlayedRound[]): CareerSummary {
  const counted = rounds.filter((r) => r.holesPlayed >= 9);
  const full = counted.filter((r) => r.holesPlayed >= 18);
  const perTrip = new Map<number, { tripId: number; tripName: string; rounds: number; points: number }>();
  for (const round of counted) {
    const entry = perTrip.get(round.tripId) ?? { tripId: round.tripId, tripName: round.tripName, rounds: 0, points: 0 };
    entry.rounds++;
    entry.points += round.points;
    perTrip.set(round.tripId, entry);
  }
  const avg = (values: number[]) => (values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null);
  return {
    roundsPlayed: counted.length,
    averagePoints: avg(counted.map((r) => r.points)),
    bestRound: full.length ? [...full].sort((a, b) => b.points - a.points)[0] : counted.length ? [...counted].sort((a, b) => b.points - a.points)[0] : null,
    averageGross18: avg(full.map((r) => r.gross)),
    perTrip: Array.from(perTrip.values()).sort((a, b) => b.points - a.points),
  };
}
