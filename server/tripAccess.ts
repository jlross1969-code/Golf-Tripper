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

// ─── Scoped procedures ───────────────────────────────────────────────────────

import { protectedProcedure } from "./_core/trpc";
import { groups } from "../drizzle/schema";

async function tripIdForGroup(groupId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const [row] = await db.select({ tripId: groups.tripId }).from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
  return row.tripId;
}

const positiveInt = (value: unknown) => (typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined);

/**
 * Procedure for reads scoped to a trip. The trip is resolved from the raw input
 * (tripId, else roundId, else groupId) and the caller must belong to it.
 */
export const tripScopedProcedure = protectedProcedure.use(async ({ ctx, getRawInput, next }) => {
  const raw = ((await getRawInput()) ?? {}) as Record<string, unknown>;
  let tripId = positiveInt(raw.tripId);
  if (tripId === undefined && positiveInt(raw.roundId) !== undefined) tripId = (await loadRound(raw.roundId as number)).tripId;
  if (tripId === undefined && positiveInt(raw.groupId) !== undefined) tripId = await tripIdForGroup(raw.groupId as number);
  if (tripId === undefined) throw new TRPCError({ code: "BAD_REQUEST", message: "A trip, round or group is required" });
  // A client-supplied tripId must also agree with the round it is paired with.
  if (positiveInt(raw.roundId) !== undefined && positiveInt(raw.tripId) !== undefined && (await loadRound(raw.roundId as number)).tripId !== raw.tripId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Round does not belong to this trip" });
  }
  await assertTripMember(ctx.user, tripId);
  return next();
});

export async function isTripManager(user: AccessUser, trip: { id: number; createdBy: number; financialManagerUserId?: number | null }) {
  return user.role === "admin" || trip.createdBy === user.id || trip.financialManagerUserId === user.id || (await isCoAdminForTrip(user.id, trip.id));
}

/** Members see the trip (without the join token unless they manage it); outsiders see only a landing-page summary. */
export async function tripViewForUser<T extends { id: number; createdBy: number; shareToken?: string | null; financialManagerUserId?: number | null }>(user: AccessUser | null, trip: T | undefined) {
  if (!trip) return trip;
  const manager = !!user && (await isTripManager(user, trip));
  const member = manager || (!!user && !!(await getTripPlayer(trip.id, user.id)));
  if (member) {
    if (manager) return trip;
    const { shareToken: _shareToken, ...rest } = trip;
    return rest;
  }
  const t = trip as any;
  // Typed as the full trip so callers need no changes; fields outside this summary are simply absent.
  return { id: t.id, name: t.name, startDate: t.startDate, endDate: t.endDate, location: t.location, logoUrl: t.logoUrl, description: t.description } as unknown as Omit<T, "shareToken">;
}
