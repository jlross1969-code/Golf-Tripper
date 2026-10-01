import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { matchPlayFixtures, matchPlayResults, matchPlayTeams, sideMatches } from "../drizzle/schema";
import { getDb, getRound, getTrip, getTripPlayer, isCoAdminForTrip } from "./db";

export type AccessUser = { id: number; role?: string | null };

async function tripIdForRoundTable(table: typeof matchPlayFixtures | typeof matchPlayTeams | typeof sideMatches | typeof matchPlayResults, id: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const [row] = await db.select({ roundId: table.roundId }).from(table).where(eq(table.id, id)).limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
  return row.roundId;
}

/** Caller must belong to the trip (player, creator, co-admin) or be a platform admin. */
export async function assertTripMember(user: AccessUser, tripId: number) {
  const trip = await getTrip(tripId);
  if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
  if (user.role === "admin" || trip.createdBy === user.id) return trip;
  if (await getTripPlayer(tripId, user.id)) return trip;
  if (await isCoAdminForTrip(user.id, tripId)) return trip;
  throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this trip" });
}

/** Caller must be the trip creator, a co-admin, or a platform admin. */
export async function assertTripManager(user: AccessUser, tripId: number) {
  const trip = await getTrip(tripId);
  if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
  if (user.role === "admin" || trip.createdBy === user.id) return trip;
  if (await isCoAdminForTrip(user.id, tripId)) return trip;
  throw new TRPCError({ code: "FORBIDDEN", message: "Trip admin access required" });
}

export async function loadRound(roundId: number) {
  const round = await getRound(roundId);
  if (!round) throw new TRPCError({ code: "NOT_FOUND", message: "Round not found" });
  return round;
}

export async function assertRoundMember(user: AccessUser, roundId: number) {
  const round = await loadRound(roundId);
  await assertTripMember(user, round.tripId);
  return round;
}

export async function assertRoundManager(user: AccessUser, roundId: number) {
  const round = await loadRound(roundId);
  await assertTripManager(user, round.tripId);
  return round;
}

export const roundIdForPennantTeam = (id: number) => tripIdForRoundTable(matchPlayTeams, id);
export const roundIdForPennantFixture = (id: number) => tripIdForRoundTable(matchPlayFixtures, id);
export const roundIdForSideMatch = (id: number) => tripIdForRoundTable(sideMatches, id);
export const roundIdForMatchPlay = (id: number) => tripIdForRoundTable(matchPlayResults, id);
