import { and, eq, inArray } from "drizzle-orm";
import { achievements, handicapHistory, rounds, scores, tripPlayers, trips } from "../drizzle/schema";
import { summariseCareer, type PlayedRound } from "../shared/careerStats";
import { getDb } from "./db";

/** Career stats for one player across every trip they belong to. */
export async function getCareerStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const memberships = await db.select({ tripId: tripPlayers.tripId }).from(tripPlayers).where(eq(tripPlayers.userId, userId));
  const tripIds = Array.from(new Set(memberships.map((m) => m.tripId)));
  if (!tripIds.length) return { ...summariseCareer([]), achievements: { hole_in_one: 0, eagle: 0, birdie: 0 }, handicapTrend: [] as { date: Date; handicap: number }[] };

  const tripRows = await db.select({ id: trips.id, name: trips.name }).from(trips).where(inArray(trips.id, tripIds));
  const tripName = new Map(tripRows.map((t) => [t.id, t.name]));
  const roundRows = await db.select({ id: rounds.id, tripId: rounds.tripId, date: rounds.roundDate }).from(rounds).where(inArray(rounds.tripId, tripIds));
  const roundIds = roundRows.map((r) => r.id);
  const scoreRows = roundIds.length
    ? await db.select().from(scores).where(and(eq(scores.userId, userId), inArray(scores.roundId, roundIds)))
    : [];

  const played: PlayedRound[] = roundRows
    .map((r) => {
      const mine = scoreRows.filter((s) => s.roundId === r.id);
      return { roundId: r.id, tripId: r.tripId, tripName: tripName.get(r.tripId) ?? "Trip", date: r.date, points: mine.reduce((n, s) => n + s.stablefordPoints, 0), gross: mine.reduce((n, s) => n + s.grossScore, 0), holesPlayed: mine.length };
    })
    .filter((r) => r.holesPlayed > 0);

  const ach = roundIds.length
    ? await db.select({ type: achievements.type }).from(achievements).where(and(eq(achievements.userId, userId), eq(achievements.confirmed, true), inArray(achievements.roundId, roundIds)))
    : [];
  const counts = { hole_in_one: 0, eagle: 0, birdie: 0 };
  for (const a of ach) counts[a.type]++;

  const history = await db.select({ date: handicapHistory.createdAt, handicap: handicapHistory.newHandicap }).from(handicapHistory).where(eq(handicapHistory.userId, userId));
  history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { ...summariseCareer(played), achievements: counts, handicapTrend: history };
}
