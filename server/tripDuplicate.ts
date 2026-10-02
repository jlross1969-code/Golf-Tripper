import { eq } from "drizzle-orm";
import { rounds, tripItineraryItems, trips } from "../drizzle/schema";
import { getDb } from "./db";

const DAY_MS = 86_400_000;

/** Removes identity, timestamps, secrets, billing and scheduler state from a copied row. */
function stripForCopy<T extends Record<string, unknown>>(row: T) {
  const copy: Record<string, unknown> = { ...row };
  for (const key of Object.keys(copy)) {
    if (key === "id" || key === "createdAt" || key === "updatedAt" || key.endsWith("TaskUid") || /^(stripe|plan)/.test(key)) delete copy[key];
  }
  for (const key of ["shareToken", "spectatorToken", "financialManagerUserId", "tripPlanTier", "financialDigestLastSentAt", "paymentDueAt", "paymentReminderAt", "courseRevealAt"]) delete copy[key];
  return copy;
}

/**
 * Copies a trip's settings, rounds (reset to "scheduled", without scores or groups) and
 * itinerary shifted to a new start date. Players, money and chat are not copied.
 */
export async function duplicateTrip(sourceTripId: number, createdBy: number, name: string, newStart: Date) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [source] = await db.select().from(trips).where(eq(trips.id, sourceTripId)).limit(1);
  if (!source) throw new Error("Trip not found");
  const shift = newStart.getTime() - new Date(source.startDate).getTime();
  const shiftDate = (date: Date | null) => (date ? new Date(new Date(date).getTime() + shift) : date);

  const [tripResult] = await db.insert(trips).values({
    ...(stripForCopy(source) as typeof trips.$inferInsert),
    name,
    createdBy,
    startDate: shiftDate(source.startDate)!,
    endDate: shiftDate(source.endDate)!,
    coursesRevealed: false,
  });
  const newTripId = (tripResult as { insertId: number }).insertId;

  const sourceRounds = await db.select().from(rounds).where(eq(rounds.tripId, sourceTripId));
  for (const round of sourceRounds) {
    await db.insert(rounds).values({ ...(stripForCopy(round) as typeof rounds.$inferInsert), tripId: newTripId, roundDate: shiftDate(round.roundDate)!, status: "scheduled" });
  }
  const items = await db.select().from(tripItineraryItems).where(eq(tripItineraryItems.tripId, sourceTripId));
  for (const item of items) {
    await db.insert(tripItineraryItems).values({ ...(stripForCopy(item) as typeof tripItineraryItems.$inferInsert), tripId: newTripId, startsAt: shiftDate(item.startsAt), endsAt: shiftDate(item.endsAt) });
  }
  return { tripId: newTripId, roundCount: sourceRounds.length, itineraryCount: items.length, shiftDays: Math.round(shift / DAY_MS) };
}
