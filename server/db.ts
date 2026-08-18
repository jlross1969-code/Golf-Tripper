import { and, desc, eq, inArray, like, lt, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Achievement,
  Course,
  Group,
  GroupPlayer,
  HandicapHistory,
  Hole,
  InsertTripInvite,
  InsertUser,
  Notification,
  Round,
  Score,
  SideMatch,
  SideMatchPlayer,
  Trip,
  TripInvite,
  TripPlayer,
  User,
  achievements,
  courses,
  groupPlayers,
  groups,
  handicapHistory,
  holes,
  matchPlayResults,
  nearestToPin,
  notifications,
  ntpEntries,
  rounds,
  scores,
  sideMatchPlayers,
  sideMatches,
  tripInvites,
  tripMessages,
  TripMessageMention,
  TripMessageModerationAudit,
  tripMessageMentions,
  tripMessageMentionReads,
  tripMessageModerationAudit,
  TripMessageAttachment,
  TripMessageAttachmentReport,
  tripMessageAttachments,
  tripMessageAttachmentActionEvents,
  tripMessageAttachmentReports,
  tripMessageReactions,
  tripAppearanceSchedules,
  tripAppearanceTemplates,
  tripPayments,
  tripScheduledAnnouncements,
  tripPlayers,
  trips,
  users,
  AssistantConversation,
  AssistantMessage,
  TripFaq,
  assistantConversations,
  assistantMessages,
  tripFaqs,
  InsertTripAward,
  TripAward,
  TripAwardWinner,
  tripAwards,
  tripAwardWinners,
  LongDriveEntry,
  longDriveEntries,
  AmbroseScore,
  ambroseScores,
  MatchPlayTeam,
  MatchPlayTeamPlayer,
  MatchPlayFixture,
  MatchPlayFixtureHole,
  matchPlayTeams,
  matchPlayTeamPlayers,
  matchPlayFixtures,
  matchPlayFixtureHoles,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { isAutomaticFourBBBReady, resolveMutualScoreMarkerPairs } from "../shared/sideMatchAutomation";
import { getBestBallStablefordPoints } from "../shared/fourBBBScorecard";
import { calculateCountback, compareCountback, type CountbackBreakdown } from "../shared/countback";
import { filterTripFaqsForRound } from "../shared/tripFaqVisibility";
import { getSideMatchDailyLeader, sortSideMatchDailyPlayers } from "../shared/sideMatchDailyResults";
import { calculateTripPaymentBalance } from "../shared/tripPayments";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.name);
}

// ─── Courses ──────────────────────────────────────────────────────────────────

export async function createCourse(name: string, totalHoles: number = 18, teeName?: string | null): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db.select().from(courses).where(eq(courses.name, name));
  if (existing.some((course) => (course.teeName ?? null) === (teeName ?? null))) {
    throw new Error(`A course named ${name}${teeName ? ` (${teeName} tees)` : ""} already exists.`);
  }
  const result = await db.insert(courses).values({ name, totalHoles, teeName: teeName ?? null });
  return (result[0] as any).insertId;
}

export async function getCourse(id: number): Promise<Course | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  return result[0];
}

export async function getAllCourses(): Promise<Course[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).orderBy(courses.name);
}

export async function createHoles(courseId: number, holeData: { holeNumber: number; par: number; strokeIndex: number; distanceMeters?: number | null }[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(holes).values(holeData.map((h) => ({ courseId, ...h })));
}

export async function getHolesByCourse(courseId: number): Promise<Hole[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(holes).where(eq(holes.courseId, courseId)).orderBy(holes.holeNumber);
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export async function createTrip(data: {
  name: string;
  startDate: Date;
  endDate: Date;
  createdBy: number;
  tournamentType?: "stableford" | "stableford_4bbb" | "stroke" | "stroke_4bbb" | "matchplay" | "ambrose" | "alternate_shot";
  handicapMode?: "stableford" | "net_stroke";
  handicapBaseline?: number;
  handicapFactor?: number;
  handicapAutoAdjust?: boolean;
  location?: string;
  description?: string;
  rules?: string;
  logoUrl?: string;
  defaultColorScheme?: string;
  hideCourses?: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(trips).values({
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    createdBy: data.createdBy,
    tournamentType: data.tournamentType ?? "stableford",
    handicapMode: data.handicapMode ?? "stableford",
    handicapBaseline: data.handicapBaseline ?? 0,
    handicapFactor: data.handicapFactor ?? 0.25,
    handicapAutoAdjust: data.handicapAutoAdjust ?? true,
    ...(data.location !== undefined ? { location: data.location } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.rules !== undefined ? { rules: data.rules } : {}),
    ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
    ...(data.defaultColorScheme !== undefined ? { defaultColorScheme: data.defaultColorScheme } : {}),
    ...(data.hideCourses !== undefined ? { hideCourses: data.hideCourses, coursesRevealed: false } : {}),
  });
  return (result[0] as any).insertId;
}

export async function getTrip(id: number): Promise<Trip | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
  return result[0];
}

export async function getAllTrips(): Promise<(Trip & { status: string; activeRoundName: string | null })[]> {
  const db = await getDb();
  if (!db) return [];
  const allTrips = await db.select().from(trips).orderBy(desc(trips.startDate));
  const allRounds = await db.select().from(rounds);
  const now = Date.now();
  return allTrips.map((trip) => {
    const tripRounds = allRounds.filter((r) => r.tripId === trip.id);
    const activeRound = tripRounds.find((r) => r.status === "active");
    let status = "upcoming";
    if (activeRound) {
      status = "active";
    } else if (trip.endDate.getTime() < now) {
      status = "completed";
    } else if (trip.startDate.getTime() <= now) {
      status = "in-progress";
    }
    return { ...trip, status, activeRoundName: activeRound?.name ?? null };
  });
}

export async function updateTrip(id: number, data: Partial<Trip>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(trips).set(data).where(eq(trips.id, id));
}

export async function getTripByCourseRevealTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [trip] = await db.select().from(trips).where(eq(trips.courseRevealCronTaskUid, taskUid)).limit(1);
  return trip;
}

export async function createTripScheduledAnnouncement(data: { tripId: number; createdByUserId: number; message: string; scheduledAt: Date }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(tripScheduledAnnouncements).values(data);
  return (result as any).insertId as number;
}

export async function setTripScheduledAnnouncementTask(id: number, taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tripScheduledAnnouncements).set({ scheduleCronTaskUid: taskUid }).where(eq(tripScheduledAnnouncements.id, id));
}

export async function getTripScheduledAnnouncementByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [announcement] = await db.select().from(tripScheduledAnnouncements).where(eq(tripScheduledAnnouncements.scheduleCronTaskUid, taskUid)).limit(1);
  return announcement;
}

export async function markTripScheduledAnnouncementSent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tripScheduledAnnouncements).set({ status: "sent", sentAt: new Date() }).where(and(eq(tripScheduledAnnouncements.id, id), eq(tripScheduledAnnouncements.status, "pending")));
}

export async function getTripScheduledAnnouncements(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tripScheduledAnnouncements).where(eq(tripScheduledAnnouncements.tripId, tripId)).orderBy(desc(tripScheduledAnnouncements.scheduledAt));
}

/**
 * Derive round format flags from a trip-level tournament type.
 * Used when creating a round or syncing all rounds after a tournament type change.
 */
export function roundFlagsFromTournamentType(tournamentType: string): {
  strokePlayEnabled: boolean;
  fourBBBEnabled: boolean;
  matchPlayEnabled: boolean;
  ambroseEnabled: boolean;
  alternateShotEnabled: boolean;
  individualScoringMode: "stableford" | "net_stroke";
} {
  switch (tournamentType) {
    case "stableford":
      return { strokePlayEnabled: true, fourBBBEnabled: false, matchPlayEnabled: false, ambroseEnabled: false, alternateShotEnabled: false, individualScoringMode: "stableford" };
    case "stableford_4bbb":
      return { strokePlayEnabled: true, fourBBBEnabled: true, matchPlayEnabled: false, ambroseEnabled: false, alternateShotEnabled: false, individualScoringMode: "stableford" };
    case "stroke":
      return { strokePlayEnabled: true, fourBBBEnabled: false, matchPlayEnabled: false, ambroseEnabled: false, alternateShotEnabled: false, individualScoringMode: "net_stroke" };
    case "stroke_4bbb":
      return { strokePlayEnabled: true, fourBBBEnabled: true, matchPlayEnabled: false, ambroseEnabled: false, alternateShotEnabled: false, individualScoringMode: "net_stroke" };
    case "matchplay":
      return { strokePlayEnabled: false, fourBBBEnabled: false, matchPlayEnabled: true, ambroseEnabled: false, alternateShotEnabled: false, individualScoringMode: "stableford" };
    case "ambrose":
      return { strokePlayEnabled: false, fourBBBEnabled: false, matchPlayEnabled: false, ambroseEnabled: true, alternateShotEnabled: false, individualScoringMode: "stableford" };
    case "alternate_shot":
      return { strokePlayEnabled: false, fourBBBEnabled: false, matchPlayEnabled: false, ambroseEnabled: false, alternateShotEnabled: true, individualScoringMode: "stableford" };
    default:
      return { strokePlayEnabled: true, fourBBBEnabled: false, matchPlayEnabled: false, ambroseEnabled: false, alternateShotEnabled: false, individualScoringMode: "stableford" };
  }
}

/**
 * Sync all scheduled rounds of a trip to match the new tournament type.
 * Only updates rounds that have not yet started (status = 'scheduled').
 */
export async function syncRoundsToTournamentType(tripId: number, tournamentType: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const flags = roundFlagsFromTournamentType(tournamentType);
  await db.update(rounds)
    .set(flags)
    .where(and(eq(rounds.tripId, tripId), eq(rounds.status, "scheduled")));
}

/**
 * Hard-delete a trip and all its child records.
 * Only allowed when the trip has no active rounds (status must be upcoming or completed).
 */
export async function deleteTrip(id: number): Promise<{ allowed: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Check for any active rounds
  const activeRounds = await db.select().from(rounds)
    .where(and(eq(rounds.tripId, id), eq(rounds.status, "active")));
  if (activeRounds.length > 0) {
    return { allowed: false, reason: "Trip has an active round in progress. Complete or cancel the round first." };
  }

  // Cascade delete in dependency order
  // 1. Get all round IDs for this trip
  const tripRounds = await db.select({ id: rounds.id }).from(rounds).where(eq(rounds.tripId, id));
  const roundIds = tripRounds.map((r) => r.id);

  if (roundIds.length > 0) {
    // 2. Get all group IDs for these rounds
    const tripGroups = await db.select({ id: groups.id }).from(groups)
      .where(inArray(groups.roundId, roundIds));
    const groupIds = tripGroups.map((g) => g.id);

    if (groupIds.length > 0) {
      // 3. Delete group-level records
      await db.delete(groupPlayers).where(inArray(groupPlayers.groupId, groupIds));
      await db.delete(sideMatchPlayers).where(
        inArray(sideMatchPlayers.sideMatchId,
          (await db.select({ id: sideMatches.id }).from(sideMatches)
            .where(inArray(sideMatches.groupId, groupIds))).map((s) => s.id)
        )
      );
      await db.delete(sideMatches).where(inArray(sideMatches.groupId, groupIds));
      await db.delete(matchPlayResults).where(inArray(matchPlayResults.groupId, groupIds));
      await db.delete(groups).where(inArray(groups.id, groupIds));
    }

    // 4. Delete round-level records
    await db.delete(scores).where(inArray(scores.roundId, roundIds));
    await db.delete(achievements).where(inArray(achievements.roundId, roundIds));
    await db.delete(nearestToPin).where(inArray(nearestToPin.roundId, roundIds));
    await db.delete(ntpEntries).where(
      inArray(ntpEntries.ntpId,
        (await db.select({ id: nearestToPin.id }).from(nearestToPin)
          .where(inArray(nearestToPin.roundId, roundIds))).map((n) => n.id)
      )
    );
    await db.delete(rounds).where(inArray(rounds.id, roundIds));
  }

  // 5. Delete trip-level records
  await db.delete(tripPlayers).where(eq(tripPlayers.tripId, id));
  await db.delete(tripInvites).where(eq(tripInvites.tripId, id));
  await db.delete(tripMessages).where(eq(tripMessages.tripId, id));
  await db.delete(handicapHistory).where(eq(handicapHistory.tripId, id));
  await db.delete(notifications).where(eq(notifications.tripId, id));
  await db.delete(trips).where(eq(trips.id, id));

  return { allowed: true };
}

// ─── Trip Players ─────────────────────────────────────────────────────────────

export async function addPlayerToTrip(tripId: number, userId: number, startingHandicap: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .insert(tripPlayers)
    .values({ tripId, userId, startingHandicap, currentHandicap: startingHandicap })
    .onDuplicateKeyUpdate({ set: { startingHandicap, currentHandicap: startingHandicap } });
}

export async function getTripPlayers(tripId: number): Promise<(TripPlayer & { user: User | undefined })[]> {
  const db = await getDb();
  if (!db) return [];
  const players = await db.select().from(tripPlayers).where(eq(tripPlayers.tripId, tripId));
  const userIds = players.map((p) => p.userId);
  if (userIds.length === 0) return [];
  const userList = await db.select().from(users).where(inArray(users.id, userIds));
  const userMap = new Map(userList.map((u) => [u.id, u]));
  return players.map((p) => ({ ...p, user: userMap.get(p.userId) }));
}

export async function getTripPlayer(tripId: number, userId: number): Promise<TripPlayer | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(tripPlayers)
    .where(and(eq(tripPlayers.tripId, tripId), eq(tripPlayers.userId, userId)))
    .limit(1);
  return result[0];
}

export async function updatePlayerHandicap(tripId: number, userId: number, newHandicap: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(tripPlayers)
    .set({ currentHandicap: newHandicap })
    .where(and(eq(tripPlayers.tripId, tripId), eq(tripPlayers.userId, userId)));
}

export async function setTripPlayerPrice(tripId: number, userId: number, tripPriceCents: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tripPlayers).set({ tripPriceCents }).where(and(eq(tripPlayers.tripId, tripId), eq(tripPlayers.userId, userId)));
}

export async function createTripPayment(data: { tripId: number; userId: number; amountCents: number; status: "submitted" | "manual_confirmed"; note?: string; submittedByUserId: number; reviewedByUserId?: number; reviewedAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(tripPayments).values(data);
  return (result as any).insertId as number;
}

export async function reviewTripPayment(id: number, reviewerUserId: number, status: "confirmed" | "rejected"): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tripPayments).set({ status, reviewedByUserId: reviewerUserId, reviewedAt: new Date() }).where(and(eq(tripPayments.id, id), eq(tripPayments.status, "submitted")));
}

export async function getTripPayments(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tripPayments).where(eq(tripPayments.tripId, tripId)).orderBy(desc(tripPayments.createdAt));
}

export async function getTripPaymentSummary(tripId: number) {
  const [players, payments] = await Promise.all([getTripPlayers(tripId), getTripPayments(tripId)]);
  return players.map((player) => {
    const playerPayments = payments.filter((payment) => payment.userId === player.userId);
    const balance = calculateTripPaymentBalance(player.tripPriceCents, playerPayments);
    return { userId: player.userId, displayName: player.nickname ?? player.user?.name ?? `Player ${player.userId}`, priceCents: player.tripPriceCents, ...balance, payments: playerPayments };
  });
}

export async function removePlayerFromTrip(tripId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(tripPlayers).where(and(eq(tripPlayers.tripId, tripId), eq(tripPlayers.userId, userId)));
}

// ─── Rounds ───────────────────────────────────────────────────────────────────

export async function createRound(data: {
  tripId: number;
  courseId: number;
  name: string;
  roundDate: Date;
  strokePlayEnabled?: boolean;
  fourBBBEnabled?: boolean;
  skinsEnabled?: boolean;
  matchPlayEnabled?: boolean;
  alternateShotEnabled?: boolean;
  ambroseEnabled?: boolean;
  ambroseTeamSize?: number;
  individualScoringMode?: "stableford" | "net_stroke";
  logoUrl?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(rounds).values({
    tripId: data.tripId,
    courseId: data.courseId,
    name: data.name,
    roundDate: data.roundDate,
    strokePlayEnabled: data.strokePlayEnabled ?? true,
    fourBBBEnabled: data.fourBBBEnabled ?? false,
    skinsEnabled: data.skinsEnabled ?? false,
    matchPlayEnabled: data.matchPlayEnabled ?? false,
    alternateShotEnabled: data.alternateShotEnabled ?? false,
    ambroseEnabled: data.ambroseEnabled ?? false,
    ambroseTeamSize: data.ambroseTeamSize ?? 4,
    individualScoringMode: data.individualScoringMode ?? "stableford",
    status: "scheduled",
    ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
  });
  return (result[0] as any).insertId;
}

export async function getRound(id: number): Promise<Round | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(rounds).where(eq(rounds.id, id)).limit(1);
  return result[0];
}

export async function getRoundsByTrip(tripId: number): Promise<Round[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rounds).where(eq(rounds.tripId, tripId)).orderBy(rounds.roundDate);
}

export async function updateRound(id: number, data: Partial<Round>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(rounds).set(data).where(eq(rounds.id, id));
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export async function createGroup(roundId: number, tripId: number, name: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(groups).values({ roundId, tripId, name });
  return (result[0] as any).insertId;
}

export async function getGroupsByRound(roundId: number): Promise<Group[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(groups).where(eq(groups.roundId, roundId));
}

export async function addPlayerToGroup(groupId: number, userId: number | null, partnerId?: number, inviteId?: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Check if player is already in another group for the same round (only for registered players)
  if (userId !== null) {
    const group = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
    if (group.length > 0) {
      const roundGroups = await db.select().from(groups).where(eq(groups.roundId, group[0].roundId));
      const roundGroupIds = roundGroups.map((g) => g.id);
      if (roundGroupIds.length > 0) {
        const existing = await db.select().from(groupPlayers)
          .where(and(eq(groupPlayers.userId, userId), inArray(groupPlayers.groupId, roundGroupIds)));
        if (existing.length > 0 && existing[0].groupId !== groupId) {
          throw new Error("Player is already assigned to another group in this round.");
        }
      }
    }
  }
  await db
    .insert(groupPlayers)
    .values({ groupId, userId: userId ?? null, inviteId: inviteId ?? null, partnerId: partnerId ?? null })
    .onDuplicateKeyUpdate({ set: { partnerId: partnerId ?? null } });
}

export async function removePlayerFromGroup(groupId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Find the player's current partner (if any) and clear their pairing references
  const playerRow = await db.select().from(groupPlayers)
    .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.userId, userId))).limit(1);
  if (playerRow[0]?.partnerId) {
    // Clear the partner's partnerId, pairId, and scorerId since their pair is now broken
    await db.update(groupPlayers)
      .set({ partnerId: null, pairId: null, scorerId: null })
      .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.userId, playerRow[0].partnerId)));
  }
  // Also clear any player who had this user as their scorer
  await db.update(groupPlayers)
    .set({ scorerId: null })
    .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.scorerId, userId)));
  // Remove the player
  await db.delete(groupPlayers)
    .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.userId, userId)));
}

export async function getGroupPlayers(groupId: number, tripId?: number): Promise<(GroupPlayer & { user: User | undefined; nickname?: string | null; pendingName?: string | null; isPending?: boolean })[]> {
  const db = await getDb();
  if (!db) return [];
  const players = await db.select().from(groupPlayers).where(eq(groupPlayers.groupId, groupId));
  if (players.length === 0) return [];
  // Separate registered (userId set) from pending-invite rows
  const registeredUserIds = players.filter((p) => p.userId !== null).map((p) => p.userId as number);
  const pendingInviteIds = players.filter((p) => p.userId === null && p.inviteId !== null).map((p) => p.inviteId as number);
  const userList = registeredUserIds.length > 0 ? await db.select().from(users).where(inArray(users.id, registeredUserIds)) : [];
  const userMap = new Map(userList.map((u) => [u.id, u]));
  // Fetch pending invite names
  const inviteList = pendingInviteIds.length > 0 ? await db.select({ id: tripInvites.id, name: tripInvites.name }).from(tripInvites).where(inArray(tripInvites.id, pendingInviteIds)) : [];
  const inviteNameMap = new Map(inviteList.map((i) => [i.id, i.name]));
  // Also fetch nicknames and handicaps from trip_players if tripId is provided
  let nicknameMap = new Map<number, string | null>();
  let handicapMap = new Map<number, number>();
  let photoUrlMap = new Map<number, string | null>();
  if (tripId && registeredUserIds.length > 0) {
    const tpList = await db.select({ userId: tripPlayers.userId, nickname: tripPlayers.nickname, currentHandicap: tripPlayers.currentHandicap, photoUrl: tripPlayers.photoUrl })
      .from(tripPlayers)
      .where(and(eq(tripPlayers.tripId, tripId), inArray(tripPlayers.userId, registeredUserIds)));
    nicknameMap = new Map(tpList.map((tp) => [tp.userId, tp.nickname ?? null]));
    handicapMap = new Map(tpList.map((tp) => [tp.userId, tp.currentHandicap]));
    photoUrlMap = new Map(tpList.map((tp) => [tp.userId, tp.photoUrl ?? null]));
  }
  return players.map((p) => {
    if (p.userId !== null) {
      return { ...p, user: userMap.get(p.userId), nickname: nicknameMap.get(p.userId) ?? null, currentHandicap: handicapMap.get(p.userId) ?? null, photoUrl: photoUrlMap.get(p.userId) ?? null, isPending: false, pendingName: null };
    } else {
      // Pending invite row — no user yet
      return { ...p, user: undefined, nickname: null, currentHandicap: null, photoUrl: null, isPending: true, pendingName: p.inviteId ? (inviteNameMap.get(p.inviteId) ?? null) : null };
    }
  });
}

export async function deleteGroup(groupId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(groupPlayers).where(eq(groupPlayers.groupId, groupId));
  await db.delete(groups).where(eq(groups.id, groupId));
}

// ─── Scores ───────────────────────────────────────────────────────────────────

export async function upsertScore(data: {
  roundId: number;
  userId: number;
  holeId: number;
  grossScore: number;
  netScore: number;
  stablefordPoints: number;
  mercyCapped?: boolean;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .insert(scores)
    .values({ ...data, mercyCapped: data.mercyCapped ?? false })
    .onDuplicateKeyUpdate({
      set: {
        grossScore: data.grossScore,
        netScore: data.netScore,
        stablefordPoints: data.stablefordPoints,
        mercyCapped: data.mercyCapped ?? false,
      },
    });
}

export async function getScoresByRound(roundId: number): Promise<Score[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scores).where(eq(scores.roundId, roundId));
}

export async function getScoresByRoundAndUser(roundId: number, userId: number): Promise<Score[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(scores)
    .where(and(eq(scores.roundId, roundId), eq(scores.userId, userId)))
    .orderBy(scores.holeId);
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export async function createAchievement(data: {
  roundId: number;
  userId: number;
  holeId: number;
  holeNumber: number;
  par: number;
  grossScore: number;
  type: "hole_in_one" | "eagle" | "birdie";
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Duplicate guard: if an achievement already exists for this player+hole+round, return its id
  const existing = await db
    .select({ id: achievements.id })
    .from(achievements)
    .where(
      and(
        eq(achievements.userId, data.userId),
        eq(achievements.holeId, data.holeId),
        eq(achievements.roundId, data.roundId)
      )
    )
    .limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(achievements).values({ ...data, confirmed: false, broadcastSent: false });
  return (result[0] as any).insertId;
}

export async function getAchievementsByPlayer(
  userId: number
): Promise<(Achievement & { playerName: string | null; roundName: string | null; tripName: string | null })[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      ach: achievements,
      userName: users.name,
      roundName: rounds.name,
      tripName: trips.name,
    })
    .from(achievements)
    .leftJoin(users, eq(achievements.userId, users.id))
    .leftJoin(rounds, eq(achievements.roundId, rounds.id))
    .leftJoin(trips, eq(rounds.tripId, trips.id))
    .where(and(eq(achievements.userId, userId), eq(achievements.confirmed, true)))
    .orderBy(desc(achievements.createdAt));
  return rows.map((r) => ({
    ...r.ach,
    playerName: r.userName ?? null,
    roundName: r.roundName ?? null,
    tripName: r.tripName ?? null,
  }));
}

export async function confirmAchievement(id: number): Promise<Achievement | undefined> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(achievements).set({ confirmed: true }).where(eq(achievements.id, id));
  const result = await db.select().from(achievements).where(eq(achievements.id, id)).limit(1);
  return result[0];
}

export async function markAchievementBroadcast(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(achievements).set({ broadcastSent: true }).where(eq(achievements.id, id));
}

export async function getAchievementsByTrip(tripId: number): Promise<(Achievement & { playerName: string | null })[]> {
  const db = await getDb();
  if (!db) return [];
  // Join through rounds to filter by tripId
  const roundList = await db.select({ id: rounds.id }).from(rounds).where(eq(rounds.tripId, tripId));
  const roundIds = roundList.map((r) => r.id);
  if (roundIds.length === 0) return [];
  const rows = await db
    .select({ ach: achievements, userName: users.name, userNickname: tripPlayers.nickname })
    .from(achievements)
    .leftJoin(users, eq(achievements.userId, users.id))
    .leftJoin(tripPlayers, and(eq(tripPlayers.userId, achievements.userId), eq(tripPlayers.tripId, tripId)))
    .where(and(inArray(achievements.roundId, roundIds), eq(achievements.confirmed, true)))
    .orderBy(desc(achievements.createdAt));
  return rows.map((r) => ({ ...r.ach, playerName: r.userNickname ?? r.userName ?? null }));
}


export async function getAchievementsByRound(
  roundId: number
): Promise<{ userId: number; type: "hole_in_one" | "eagle" | "birdie" }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ userId: achievements.userId, type: achievements.type })
    .from(achievements)
    .where(and(eq(achievements.roundId, roundId), eq(achievements.confirmed, true)));
  return rows;
}
// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(data: {
  tripId: number;
  message: string;
  type: "achievement" | "round_start" | "round_complete" | "handicap_update" | "general";
  achievementId?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(notifications).values({
    tripId: data.tripId,
    message: data.message,
    type: data.type,
    achievementId: data.achievementId ?? null,
  });
}

export async function getNotificationsByTrip(tripId: number, limit: number = 50): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.tripId, tripId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

// ─── Handicap History ─────────────────────────────────────────────────────────

export async function recordHandicapChange(data: {
  tripId: number;
  userId: number;
  roundId?: number;
  oldHandicap: number;
  newHandicap: number;
  roundScore?: number;
  reason: string;
  isManual?: boolean;
  adjustedBy?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(handicapHistory).values({
    tripId: data.tripId,
    userId: data.userId,
    roundId: data.roundId ?? null,
    oldHandicap: data.oldHandicap,
    newHandicap: data.newHandicap,
    roundScore: data.roundScore ?? null,
    reason: data.reason,
    isManual: data.isManual ?? false,
    adjustedBy: data.adjustedBy ?? null,
  });
}

export async function getHandicapHistory(tripId: number, userId?: number): Promise<HandicapHistory[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = userId
    ? and(eq(handicapHistory.tripId, tripId), eq(handicapHistory.userId, userId))
    : eq(handicapHistory.tripId, tripId);
  return db
    .select()
    .from(handicapHistory)
    .where(conditions)
    .orderBy(desc(handicapHistory.createdAt));
}

// ─── Side Matches ─────────────────────────────────────────────────────────────

export async function createSideMatch(data: {
  groupId: number;
  roundId: number;
  type: "match_play" | "nassau" | "skins" | "stableford" | "stroke";
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(sideMatches).values({ ...data, status: "pending" });
  return (result[0] as any).insertId;
}

export async function getSideMatchesByRound(roundId: number): Promise<SideMatch[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sideMatches).where(eq(sideMatches.roundId, roundId));
}

export async function getSideMatchesByGroup(groupId: number): Promise<SideMatch[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sideMatches).where(eq(sideMatches.groupId, groupId));
}

export async function addSideMatchPlayer(data: {
  sideMatchId: number;
  userId: number;
  partnerId?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(sideMatchPlayers).values({
    sideMatchId: data.sideMatchId,
    userId: data.userId,
    partnerId: data.partnerId ?? null,
  });
}

export async function getSideMatchPlayers(sideMatchId: number): Promise<SideMatchPlayer[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sideMatchPlayers).where(eq(sideMatchPlayers.sideMatchId, sideMatchId));
}

export async function updateSideMatchStatus(id: number, status: "pending" | "active" | "completed"): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(sideMatches).set({ status }).where(eq(sideMatches.id, id));
}

// ─── Leaderboard helpers ──────────────────────────────────────────────────────

export async function getRoundScorecard(roundId: number): Promise<
  {
    userId: number;
    userName: string | null;
    handicap: number;
    photoUrl: string | null;
    scores: Score[];
    totalGross: number;
    totalNet: number;
    totalStableford: number;
    holesPlayed: number;
  }[]
> {
  const db = await getDb();
  if (!db) return [];

  const round = await getRound(roundId);
  if (!round) return [];

  const allScores = await getScoresByRound(roundId);
  const tripPlayerList = await getTripPlayers(round.tripId);

  const grouped = new Map<number, Score[]>();
  for (const s of allScores) {
    if (!grouped.has(s.userId)) grouped.set(s.userId, []);
    grouped.get(s.userId)!.push(s);
  }

  return tripPlayerList.map((tp) => {
    const playerScores = grouped.get(tp.userId) ?? [];
    return {
      userId: tp.userId,
      userName: tp.nickname ?? tp.user?.name ?? null,
      handicap: tp.currentHandicap,
      photoUrl: tp.photoUrl ?? null,
      scores: playerScores,
      totalGross: playerScores.reduce((sum, s) => sum + s.grossScore, 0),
      totalNet: playerScores.reduce((sum, s) => sum + s.netScore, 0),
      totalStableford: playerScores.reduce((sum, s) => sum + s.stablefordPoints, 0),
      holesPlayed: playerScores.length,
    };
  });
}

export async function getTripLeaderboard(tripId: number): Promise<
  {
    userId: number;
    userName: string | null;
    photoUrl: string | null;
    rounds: { roundId: number; roundName: string; roundDate: Date; totalGross: number; totalNet: number; totalStableford: number; holesPlayed: number; stablefordCountback: CountbackBreakdown; netCountback: CountbackBreakdown }[];
    cumulativeGross: number;
    cumulativeNet: number;
    cumulativeStableford: number;
    currentHandicap: number;
    stablefordCountback: CountbackBreakdown;
    netCountback: CountbackBreakdown;
  }[]
> {
  const db = await getDb();
  if (!db) return [];

  const tripRounds = await getRoundsByTrip(tripId);
  const completedRounds = tripRounds.filter((r) => r.status === "completed" || r.status === "active");
  const tripPlayerList = await getTripPlayers(tripId);

  const result = await Promise.all(
    tripPlayerList.map(async (tp) => {
      const roundBreakdown = await Promise.all(
        completedRounds.map(async (r) => {
          const playerScores = await getScoresByRoundAndUser(r.id, tp.userId);
          const courseHoles = await getHolesByCourse(r.courseId);
          const scoreByHoleId = new Map(playerScores.map((score) => [score.holeId, score]));
          return {
            roundId: r.id,
            roundName: r.name,
            roundDate: r.roundDate,
            totalGross: playerScores.reduce((s, sc) => s + sc.grossScore, 0),
            totalNet: playerScores.reduce((s, sc) => s + sc.netScore, 0),
            totalStableford: playerScores.reduce((s, sc) => s + sc.stablefordPoints, 0),
            holesPlayed: playerScores.length,
            stablefordCountback: calculateCountback(courseHoles.map((hole) => ({
              holeNumber: hole.holeNumber,
              value: scoreByHoleId.get(hole.id)?.stablefordPoints ?? null,
            }))),
            netCountback: calculateCountback(courseHoles.map((hole) => ({
              holeNumber: hole.holeNumber,
              value: scoreByHoleId.get(hole.id)?.netScore ?? null,
            }))),
          };
        })
      );
      const latestPlayedRound = [...roundBreakdown]
        .filter((round) => round.holesPlayed > 0)
        .sort((left, right) => new Date(right.roundDate).getTime() - new Date(left.roundDate).getTime())[0];
      return {
        userId: tp.userId,
        userName: tp.nickname ?? tp.user?.name ?? null,
        photoUrl: tp.photoUrl ?? null,
        rounds: roundBreakdown,
        cumulativeGross: roundBreakdown.reduce((s, r) => s + r.totalGross, 0),
        cumulativeNet: roundBreakdown.reduce((s, r) => s + r.totalNet, 0),
        cumulativeStableford: roundBreakdown.reduce((s, r) => s + r.totalStableford, 0),
        currentHandicap: tp.currentHandicap ?? 0,
        stablefordCountback: latestPlayedRound?.stablefordCountback ?? calculateCountback([]),
        netCountback: latestPlayedRound?.netCountback ?? calculateCountback([]),
      };
    })
  );

  return result;
}

export async function getTripFourBBBLeaderboard(
  tripId: number
): Promise<
  {
    teamKey: string;
    player1Name: string;
    player2Name: string;
    player1PhotoUrl: string | null;
    player2PhotoUrl: string | null;
    roundsPlayed: number;
    cumulativeBestBall: number;
    rounds: { roundId: number; roundName: string; totalBestBall: number; holesPlayed: number }[];
    position: number;
    countback: CountbackBreakdown;
  }[]
> {
  const db = await getDb();
  if (!db) return [];

  const tripRounds = await getRoundsByTrip(tripId);
  const fourBBBRounds = tripRounds.filter(
    (r) => r.fourBBBEnabled && (r.status === "completed" || r.status === "active")
  );
  if (fourBBBRounds.length === 0) return [];

  // Map: teamKey (sorted userId pair) -> cumulative data
  const teamMap = new Map<
    string,
    {
      player1Name: string;
      player2Name: string;
      player1PhotoUrl: string | null;
      player2PhotoUrl: string | null;
      roundsPlayed: number;
      cumulativeBestBall: number;
      rounds: { roundId: number; roundName: string; totalBestBall: number; holesPlayed: number }[];
      countback: CountbackBreakdown;
      countbackRoundDate: Date;
    }
  >();

  for (const round of fourBBBRounds) {
    const groupList = await getGroupsByRound(round.id);
    const courseHoles = await getHolesByCourse(round.courseId);
    const scorecard = await getRoundScorecard(round.id);

    for (const group of groupList) {
      const gPlayers = await getGroupPlayers(group.id);
            const partnered = new Set<number>();
      for (const gp of gPlayers) {
        if (!gp.userId || partnered.has(gp.userId) || !gp.partnerId) continue;
        partnered.add(gp.userId);
        partnered.add(gp.partnerId);
        const p1 = scorecard.find((s) => s.userId === gp.userId);
        const p2 = scorecard.find((s) => s.userId === gp.partnerId);
        if (!p1 || !p2) continue;
        let roundBestBall = 0;
        let holesPlayed = 0;
        const holePoints: Array<{ holeNumber: number; value: number | null }> = [];
        for (const hole of courseHoles) {
          const s1 = p1.scores.find((s) => s.holeId === hole.id);
          const s2 = p2.scores.find((s) => s.holeId === hole.id);
          const points1 = s1?.stablefordPoints ?? null;
          const points2 = s2?.stablefordPoints ?? null;
          const best = getBestBallStablefordPoints(points1, points2).bestNet;
          holePoints.push({ holeNumber: hole.holeNumber, value: best });
          if (best !== null) {
            roundBestBall += best;
            holesPlayed++;
          }
        }
        if (holesPlayed === 0) continue;
        const roundCountback = calculateCountback(holePoints);
        const ids = [gp.userId, gp.partnerId].sort((a, b) => a - b);
        const teamKey = ids.join("-");
        const existing = teamMap.get(teamKey);
        if (existing) {
          existing.cumulativeBestBall += roundBestBall;
          existing.roundsPlayed += 1;
          existing.rounds.push({ roundId: round.id, roundName: round.name, totalBestBall: roundBestBall, holesPlayed });
          if (new Date(round.roundDate).getTime() >= new Date(existing.countbackRoundDate).getTime()) {
            existing.countback = roundCountback;
            existing.countbackRoundDate = round.roundDate;
          }
        } else {
          // Look up photo URLs from trip players
          const tp1 = await getTripPlayer(tripId, gp.userId);
          const tp2 = await getTripPlayer(tripId, gp.partnerId);
          teamMap.set(teamKey, {
            player1Name: p1.userName ?? "Player",
            player2Name: p2.userName ?? "Player",
            player1PhotoUrl: tp1?.photoUrl ?? null,
            player2PhotoUrl: tp2?.photoUrl ?? null,
            roundsPlayed: 1,
            cumulativeBestBall: roundBestBall,
            rounds: [{ roundId: round.id, roundName: round.name, totalBestBall: roundBestBall, holesPlayed }],
            countback: roundCountback,
            countbackRoundDate: round.roundDate,
          });
        }
      }
    }
  }

  const results = Array.from(teamMap.entries()).map(([teamKey, v]) => ({ teamKey, ...v, position: 0 }));
  results.sort((a, b) => b.cumulativeBestBall - a.cumulativeBestBall || compareCountback(a.countback, b.countback, "higher"));
  results.forEach((r, i) => (r.position = i + 1));
  return results;
}

/** Hole-by-hole 4BBB scorecard for a specific confirmed pair in a round. */
export async function getFourBBBPairScorecard(roundId: number, player1Id: number, player2Id: number) {
  const round = await getRound(roundId);
  if (!round) return null;
  const courseHoles = await getHolesByCourse(round.courseId);
  const scorecard = await getRoundScorecard(roundId);
  const player1 = scorecard.find((player) => player.userId === player1Id);
  const player2 = scorecard.find((player) => player.userId === player2Id);
  if (!player1 || !player2) return null;

  const holesWithScores = courseHoles.map((hole) => {
    const score1 = player1.scores.find((score) => score.holeId === hole.id) ?? null;
    const score2 = player2.scores.find((score) => score.holeId === hole.id) ?? null;
    const points1 = score1?.stablefordPoints ?? null;
    const points2 = score2?.stablefordPoints ?? null;
    const bestBall = getBestBallStablefordPoints(points1, points2);
    const bestBallPoints = bestBall.bestNet;
    const countingPlayerId = bestBall.countingSide === "player1" ? player1Id : bestBall.countingSide === "player2" ? player2Id : null;
    return {
      hole: { id: hole.id, holeNumber: hole.holeNumber, par: hole.par, strokeIndex: hole.strokeIndex },
      player1Score: score1,
      player2Score: score2,
      bestBallPoints,
      countingPlayerId,
    };
  });

  const totals = holesWithScores.reduce((total, entry) => ({
    player1Gross: total.player1Gross + (entry.player1Score?.grossScore ?? 0),
    player2Gross: total.player2Gross + (entry.player2Score?.grossScore ?? 0),
    player1Net: total.player1Net + (entry.player1Score?.netScore ?? 0),
    player2Net: total.player2Net + (entry.player2Score?.netScore ?? 0),
    player1Points: total.player1Points + (entry.player1Score?.stablefordPoints ?? 0),
    player2Points: total.player2Points + (entry.player2Score?.stablefordPoints ?? 0),
    bestBallPoints: total.bestBallPoints + (entry.bestBallPoints ?? 0),
    holesPlayed: total.holesPlayed + (entry.bestBallPoints === null ? 0 : 1),
  }), { player1Gross: 0, player2Gross: 0, player1Net: 0, player2Net: 0, player1Points: 0, player2Points: 0, bestBallPoints: 0, holesPlayed: 0 });

  return {
    round: { id: round.id, name: round.name, date: round.roundDate },
    player1: { userId: player1Id, userName: player1.userName ?? "Player 1" },
    player2: { userId: player2Id, userName: player2.userName ?? "Player 2" },
    holes: holesWithScores,
    totals,
  };
}

// ─── Match Play ───────────────────────────────────────────────────────────────

import { MatchPlayResult, TripMessage } from "../drizzle/schema";

export async function createMatchPlayResult(data: {
  roundId: number;
  groupId: number;
  player1Id: number;
  player2Id: number;
  player1PartnerId?: number;
  player2PartnerId?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(matchPlayResults).values({
    roundId: data.roundId,
    groupId: data.groupId,
    player1Id: data.player1Id,
    player2Id: data.player2Id,
    player1PartnerId: data.player1PartnerId ?? null,
    player2PartnerId: data.player2PartnerId ?? null,
    holeResults: "[]",
    matchStatus: 0,
    winner: "pending",
  });
  return (result as any).insertId;
}

export async function getMatchPlayResult(id: number): Promise<MatchPlayResult | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(matchPlayResults).where(eq(matchPlayResults.id, id)).limit(1);
  return rows[0];
}

export async function getMatchPlayResultsByRound(roundId: number): Promise<MatchPlayResult[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchPlayResults).where(eq(matchPlayResults.roundId, roundId));
}

export async function updateMatchPlayResult(
  id: number,
  data: {
    holeResults: string;
    matchStatus: number;
    winner: "player1" | "player2" | "halved" | "pending";
    endedOnHole?: number;
    nextTeePlayer?: number;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(matchPlayResults).set(data).where(eq(matchPlayResults.id, id));
}

// ─── Trip Chat ────────────────────────────────────────────────────────────────

export type TripChatAttachmentInput = { imageUrl: string; imageKey: string; imageAlt?: string; caption?: string };

export async function sendTripMessage(data: { tripId: number; userId: number; parentMessageId?: number; message: string; isAnnouncement?: boolean; imageUrl?: string; imageKey?: string; imageAlt?: string; attachments?: TripChatAttachmentInput[]; mentionedUserIds?: number[] }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const { attachments, mentionedUserIds, ...messageData } = data;
  const [result] = await db.insert(tripMessages).values(messageData);
  const messageId = (result as any).insertId as number;
  if (attachments?.length) {
    await db.insert(tripMessageAttachments).values(attachments.map((attachment, sortOrder) => ({
      messageId,
      imageUrl: attachment.imageUrl,
      imageKey: attachment.imageKey,
      imageAlt: attachment.imageAlt ?? "Trip chat image",
      caption: attachment.caption,
      sortOrder,
    })));
  }
  if (mentionedUserIds?.length) {
    await db.insert(tripMessageMentions).values(mentionedUserIds.map((mentionedUserId) => ({ tripId: data.tripId, messageId, mentionedUserId })));
  }
  return messageId;
}

export async function getTripMessages(tripId: number, limit = 50, beforeId?: number, currentUserId?: number, searchTerm?: string) {
  const db = await getDb();
  if (!db) return [];
  const normalisedSearch = searchTerm?.trim().slice(0, 100);
  const searchPattern = normalisedSearch ? `%${normalisedSearch.replace(/[\\%_]/g, "\\$&")}%` : null;
  const conditions = [eq(tripMessages.tripId, tripId)];
  if (beforeId) conditions.push(lt(tripMessages.id, beforeId));
  if (searchPattern) conditions.push(or(like(tripMessages.message, searchPattern), like(users.name, searchPattern), like(tripPlayers.nickname, searchPattern))!);
  const rows = await db
    .select({
      id: tripMessages.id,
      tripId: tripMessages.tripId,
      userId: tripMessages.userId,
      parentMessageId: tripMessages.parentMessageId,
      message: tripMessages.message,
      imageUrl: tripMessages.imageUrl,
      imageKey: tripMessages.imageKey,
      imageAlt: tripMessages.imageAlt,
      isAnnouncement: tripMessages.isAnnouncement,
      editedAt: tripMessages.editedAt,
      deletedAt: tripMessages.deletedAt,
      pinnedAt: tripMessages.pinnedAt,
      pinnedByUserId: tripMessages.pinnedByUserId,
      createdAt: tripMessages.createdAt,
      userName: users.name,
      userNickname: tripPlayers.nickname,
    })
    .from(tripMessages)
    .leftJoin(users, eq(tripMessages.userId, users.id))
    .leftJoin(tripPlayers, and(eq(tripPlayers.userId, tripMessages.userId), eq(tripPlayers.tripId, tripMessages.tripId)))
    .where(and(...conditions))
    .orderBy(desc(tripMessages.id))
    .limit(limit);
  const messageIds = rows.map((row) => row.id);
  if (!messageIds.length) return [];
  const attachmentRows = await db.select().from(tripMessageAttachments)
    .where(and(inArray(tripMessageAttachments.messageId, messageIds), eq(tripMessageAttachments.isRemoved, false)))
    .orderBy(tripMessageAttachments.sortOrder);
  const reactionRows = await db.select().from(tripMessageReactions)
    .where(inArray(tripMessageReactions.messageId, messageIds));
  const mentionRows = await db.select({ messageId: tripMessageMentions.messageId, mentionedUserId: tripMessageMentions.mentionedUserId, userName: users.name, nickname: tripPlayers.nickname })
    .from(tripMessageMentions)
    .leftJoin(users, eq(tripMessageMentions.mentionedUserId, users.id))
    .leftJoin(tripPlayers, and(eq(tripPlayers.userId, tripMessageMentions.mentionedUserId), eq(tripPlayers.tripId, tripId)))
    .where(inArray(tripMessageMentions.messageId, messageIds));
  const attachmentsByMessage = new Map<number, TripMessageAttachment[]>();
  attachmentRows.forEach((attachment) => {
    const entries = attachmentsByMessage.get(attachment.messageId) ?? [];
    entries.push(attachment);
    attachmentsByMessage.set(attachment.messageId, entries);
  });
  const reactionsByMessage = new Map<number, Map<string, { count: number; reactedByCurrentUser: boolean }>>();
  const mentionsByMessage = new Map<number, { userId: number; displayName: string }[]>();
  mentionRows.forEach((mention) => {
    const entries = mentionsByMessage.get(mention.messageId) ?? [];
    entries.push({ userId: mention.mentionedUserId, displayName: mention.nickname ?? mention.userName ?? "Player" });
    mentionsByMessage.set(mention.messageId, entries);
  });
  reactionRows.forEach((reaction) => {
    const byEmoji = reactionsByMessage.get(reaction.messageId) ?? new Map();
    const summary = byEmoji.get(reaction.emoji) ?? { count: 0, reactedByCurrentUser: false };
    summary.count += 1;
    summary.reactedByCurrentUser ||= reaction.userId === currentUserId;
    byEmoji.set(reaction.emoji, summary);
    reactionsByMessage.set(reaction.messageId, byEmoji);
  });
  return rows.map((row) => ({
    ...row,
    userName: row.userNickname ?? row.userName ?? null,
    attachments: attachmentsByMessage.get(row.id) ?? [],
    mentions: mentionsByMessage.get(row.id) ?? [],
    reactions: Array.from(reactionsByMessage.get(row.id)?.entries() ?? []).map(([emoji, summary]) => ({ emoji, ...summary })),
  }));
}

export async function getUnreadTripChatMentions(tripId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ mentionId: tripMessageMentions.id, message: tripMessages, authorName: users.name, authorNickname: tripPlayers.nickname })
    .from(tripMessageMentions)
    .innerJoin(tripMessages, eq(tripMessageMentions.messageId, tripMessages.id))
    .leftJoin(users, eq(tripMessages.userId, users.id))
    .leftJoin(tripPlayers, and(eq(tripPlayers.userId, tripMessages.userId), eq(tripPlayers.tripId, tripId)))
    .leftJoin(tripMessageMentionReads, and(eq(tripMessageMentionReads.mentionId, tripMessageMentions.id), eq(tripMessageMentionReads.userId, userId)))
    .where(and(eq(tripMessageMentions.tripId, tripId), eq(tripMessageMentions.mentionedUserId, userId), sql`${tripMessageMentionReads.id} is null`))
    .orderBy(desc(tripMessages.createdAt));
}

export async function markTripChatMentionsRead(tripId: number, userId: number, mentionIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db || !mentionIds.length) return;
  const validMentions = await db.select({ id: tripMessageMentions.id }).from(tripMessageMentions)
    .where(and(inArray(tripMessageMentions.id, mentionIds), eq(tripMessageMentions.tripId, tripId), eq(tripMessageMentions.mentionedUserId, userId)));
  if (validMentions.length) await db.insert(tripMessageMentionReads).values(validMentions.map((mention) => ({ mentionId: mention.id, userId })));
}

export async function getPinnedTripMessages(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ message: tripMessages, authorName: users.name, authorNickname: tripPlayers.nickname })
    .from(tripMessages)
    .leftJoin(users, eq(tripMessages.userId, users.id))
    .leftJoin(tripPlayers, and(eq(tripPlayers.userId, tripMessages.userId), eq(tripPlayers.tripId, tripId)))
    .where(and(eq(tripMessages.tripId, tripId), sql`${tripMessages.pinnedAt} is not null`))
    .orderBy(desc(tripMessages.pinnedAt));
}

export async function setTripChatMessagePinned(messageId: number, moderatorUserId: number, pinned: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tripMessages).set(pinned ? { pinnedAt: new Date(), pinnedByUserId: moderatorUserId } : { pinnedAt: null, pinnedByUserId: null }).where(eq(tripMessages.id, messageId));
}

export async function updateTripChatMessage(messageId: number, message: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tripMessages).set({ message, editedAt: new Date() }).where(eq(tripMessages.id, messageId));
}

export async function softDeleteTripChatMessage(messageId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tripMessages).set({ message: "", deletedAt: new Date(), editedAt: null }).where(eq(tripMessages.id, messageId));
}

export async function getDailySideMatchResults(roundId: number) {
  const matches = await getSideMatchesByRound(roundId);
  const scorecard = await getRoundScorecard(roundId);
  const scoreByUser = new Map(scorecard.map((player) => [player.userId, { stableford: player.totalStableford, gross: player.totalGross, holesPlayed: player.holesPlayed, name: player.userName ?? "Player" }]));
  return Promise.all(matches.map(async (match) => {
    const players = await getSideMatchPlayers(match.id);
    const totals = players.map((player) => ({ userId: player.userId, partnerId: player.partnerId, name: scoreByUser.get(player.userId)?.name ?? `Player ${player.userId}`, stableford: scoreByUser.get(player.userId)?.stableford ?? 0, gross: scoreByUser.get(player.userId)?.gross ?? 0, holesPlayed: scoreByUser.get(player.userId)?.holesPlayed ?? 0 }));
    const leader = getSideMatchDailyLeader(match.type, totals);
    return { ...match, players: sortSideMatchDailyPlayers(match.type, totals), leader: leader ? { userId: leader.userId, name: totals.find((player) => player.userId === leader.userId)?.name ?? "Player", value: leader.value, label: leader.label } : null };
  }));
}

export async function getTripChatMessage(messageId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [message] = await db.select().from(tripMessages).where(eq(tripMessages.id, messageId)).limit(1);
  return message;
}

export async function toggleTripMessageReaction(messageId: number, userId: number, emoji: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [existing] = await db.select().from(tripMessageReactions)
    .where(and(eq(tripMessageReactions.messageId, messageId), eq(tripMessageReactions.userId, userId), eq(tripMessageReactions.emoji, emoji))).limit(1);
  if (existing) {
    await db.delete(tripMessageReactions).where(eq(tripMessageReactions.id, existing.id));
    return false;
  }
  await db.insert(tripMessageReactions).values({ messageId, userId, emoji });
  return true;
}

export async function getTripChatAttachment(attachmentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [attachment] = await db.select({ attachment: tripMessageAttachments, tripId: tripMessages.tripId, messageId: tripMessages.id, messageUserId: tripMessages.userId })
    .from(tripMessageAttachments)
    .innerJoin(tripMessages, eq(tripMessageAttachments.messageId, tripMessages.id))
    .where(eq(tripMessageAttachments.id, attachmentId)).limit(1);
  return attachment;
}

export async function updateTripChatAttachmentCaption(attachmentId: number, caption?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tripMessageAttachments).set({ caption: caption || null }).where(eq(tripMessageAttachments.id, attachmentId));
}

export async function createTripChatAttachmentReport(data: { tripId: number; attachmentId: number; reporterUserId: number; reason?: string }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [existing] = await db.select().from(tripMessageAttachmentReports)
    .where(and(eq(tripMessageAttachmentReports.attachmentId, data.attachmentId), eq(tripMessageAttachmentReports.reporterUserId, data.reporterUserId), eq(tripMessageAttachmentReports.status, "open"))).limit(1);
  if (existing) return existing.id;
  const [result] = await db.insert(tripMessageAttachmentReports).values(data);
  return (result as any).insertId as number;
}

export async function getTripChatAttachmentReports(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ report: tripMessageAttachmentReports, attachment: tripMessageAttachments, reporterName: users.name, messageText: tripMessages.message })
    .from(tripMessageAttachmentReports)
    .innerJoin(tripMessageAttachments, eq(tripMessageAttachmentReports.attachmentId, tripMessageAttachments.id))
    .innerJoin(tripMessages, eq(tripMessageAttachments.messageId, tripMessages.id))
    .leftJoin(users, eq(tripMessageAttachmentReports.reporterUserId, users.id))
    .where(eq(tripMessageAttachmentReports.tripId, tripId))
    .orderBy(desc(tripMessageAttachmentReports.createdAt));
}

export async function removeTripChatAttachment(attachmentId: number, moderatorUserId: number, tripId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tripMessageAttachments).set({ isRemoved: true, removedAt: new Date(), removedByUserId: moderatorUserId }).where(eq(tripMessageAttachments.id, attachmentId));
  await db.update(tripMessageAttachmentReports).set({ status: "removed", resolvedAt: new Date(), resolvedByUserId: moderatorUserId }).where(and(eq(tripMessageAttachmentReports.attachmentId, attachmentId), eq(tripMessageAttachmentReports.status, "open")));
  await db.insert(tripMessageModerationAudit).values({ tripId, attachmentId, actorUserId: moderatorUserId, action: "attachment_removed" });
}

export async function dismissTripChatAttachmentReport(reportId: number, moderatorUserId: number, tripId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [report] = await db.select().from(tripMessageAttachmentReports).where(eq(tripMessageAttachmentReports.id, reportId)).limit(1);
  if (!report) return;
  await db.update(tripMessageAttachmentReports).set({ status: "dismissed", resolvedAt: new Date(), resolvedByUserId: moderatorUserId }).where(eq(tripMessageAttachmentReports.id, reportId));
  await db.insert(tripMessageModerationAudit).values({ tripId, attachmentId: report.attachmentId, actorUserId: moderatorUserId, action: "report_dismissed" });
}

export async function getTripChatModerationAudit(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ audit: tripMessageModerationAudit, attachment: tripMessageAttachments, actorName: users.name })
    .from(tripMessageModerationAudit)
    .innerJoin(tripMessageAttachments, eq(tripMessageModerationAudit.attachmentId, tripMessageAttachments.id))
    .leftJoin(users, eq(tripMessageModerationAudit.actorUserId, users.id))
    .where(eq(tripMessageModerationAudit.tripId, tripId))
    .orderBy(desc(tripMessageModerationAudit.createdAt));
}

/** Records a photo download/share without storing the viewer's identity. */
export async function recordTripChatPhotoAction(data: { tripId: number; attachmentId: number; action: "download" | "share" }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(tripMessageAttachmentActionEvents).values(data);
}

/** Returns trip-level aggregate totals only; individual activity is intentionally unavailable. */
export async function getTripChatPhotoActionSummary(tripId: number) {
  const db = await getDb();
  if (!db) return { downloads: 0, shares: 0, total: 0 };
  const rows = await db
    .select({ action: tripMessageAttachmentActionEvents.action, count: sql<number>`count(*)` })
    .from(tripMessageAttachmentActionEvents)
    .where(eq(tripMessageAttachmentActionEvents.tripId, tripId))
    .groupBy(tripMessageAttachmentActionEvents.action);
  const downloads = Number(rows.find((row) => row.action === "download")?.count ?? 0);
  const shares = Number(rows.find((row) => row.action === "share")?.count ?? 0);
  return { downloads, shares, total: downloads + shares };
}

/** Returns up to twelve calendar months of trip-wide totals. No player identity is stored or returned. */
export async function getTripChatPhotoActionMonthlyTrend(tripId: number) {
  const db = await getDb();
  if (!db) return [] as { month: string; downloads: number; shares: number; total: number }[];
  const monthSql = sql<string>`DATE_FORMAT(${tripMessageAttachmentActionEvents.createdAt}, '%Y-%m')`;
  const rows = await db
    .select({ month: monthSql, action: tripMessageAttachmentActionEvents.action, count: sql<number>`count(*)` })
    .from(tripMessageAttachmentActionEvents)
    .where(eq(tripMessageAttachmentActionEvents.tripId, tripId))
    .groupBy(monthSql, tripMessageAttachmentActionEvents.action)
    .orderBy(monthSql);
  const grouped = new Map<string, { month: string; downloads: number; shares: number; total: number }>();
  for (const row of rows) {
    const entry = grouped.get(row.month) ?? { month: row.month, downloads: 0, shares: 0, total: 0 };
    if (row.action === "download") entry.downloads += Number(row.count);
    if (row.action === "share") entry.shares += Number(row.count);
    entry.total = entry.downloads + entry.shares;
    grouped.set(row.month, entry);
  }
  return [...grouped.values()].slice(-12);
}

// ─── Trip Appearance Schedules ────────────────────────────────────────────────

export async function getTripAppearanceSchedules(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tripAppearanceSchedules).where(eq(tripAppearanceSchedules.tripId, tripId)).orderBy(tripAppearanceSchedules.appearanceDate);
}

export async function setTripAppearanceSchedule(data: { tripId: number; appearanceDate: Date; colorScheme: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(tripAppearanceSchedules).where(and(eq(tripAppearanceSchedules.tripId, data.tripId), eq(tripAppearanceSchedules.appearanceDate, data.appearanceDate)));
  const [result] = await db.insert(tripAppearanceSchedules).values(data);
  return (result as any).insertId as number;
}

export async function deleteTripAppearanceSchedule(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(tripAppearanceSchedules).where(eq(tripAppearanceSchedules.id, id));
}

export async function getTripAppearanceTemplates(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tripAppearanceTemplates).where(eq(tripAppearanceTemplates.tripId, tripId)).orderBy(desc(tripAppearanceTemplates.createdAt));
}

export async function createTripAppearanceTemplate(data: { tripId: number; createdByUserId: number; name: string; colorScheme: string }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(tripAppearanceTemplates).values(data);
  return (result as any).insertId as number;
}

export async function deleteTripAppearanceTemplate(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(tripAppearanceTemplates).where(eq(tripAppearanceTemplates.id, id));
}

/** Replaces target schedules with source schedules, preserving each theme's relative trip day. */
export async function copyTripAppearanceSchedules(sourceTripId: number, targetTripId: number, mapDate: (sourceDate: Date, sourceStart: Date, targetStart: Date) => Date): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [sourceTrip, targetTrip, sourceSchedules] = await Promise.all([getTrip(sourceTripId), getTrip(targetTripId), getTripAppearanceSchedules(sourceTripId)]);
  if (!sourceTrip || !targetTrip) throw new Error("Trip not found");
  await db.delete(tripAppearanceSchedules).where(eq(tripAppearanceSchedules.tripId, targetTripId));
  if (sourceSchedules.length === 0) return 0;
  await db.insert(tripAppearanceSchedules).values(sourceSchedules.map((schedule) => ({
    tripId: targetTripId,
    appearanceDate: mapDate(schedule.appearanceDate, sourceTrip.startDate, targetTrip.startDate),
    colorScheme: schedule.colorScheme,
  })));
  return sourceSchedules.length;
}

// ─── Golf Trip AI Assistant ───────────────────────────────────────────────────

export async function getAssistantConversations(userId: number): Promise<AssistantConversation[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(assistantConversations)
    .where(eq(assistantConversations.userId, userId))
    .orderBy(desc(assistantConversations.updatedAt));
}

export async function createAssistantConversation(data: { userId: number; tripId?: number | null; title: string }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(assistantConversations).values({
    userId: data.userId,
    tripId: data.tripId ?? null,
    title: data.title,
  });
  return (result as any).insertId as number;
}

export async function getAssistantConversation(conversationId: number, userId: number): Promise<AssistantConversation | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(assistantConversations)
    .where(and(eq(assistantConversations.id, conversationId), eq(assistantConversations.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function getAssistantMessages(conversationId: number, userId: number): Promise<AssistantMessage[]> {
  const db = await getDb();
  if (!db) return [];
  const conversation = await getAssistantConversation(conversationId, userId);
  if (!conversation) return [];
  return db
    .select()
    .from(assistantMessages)
    .where(eq(assistantMessages.conversationId, conversationId))
    .orderBy(assistantMessages.id);
}

export async function appendAssistantMessages(data: {
  conversationId: number;
  userId: number;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const conversation = await getAssistantConversation(data.conversationId, data.userId);
  if (!conversation) throw new Error("Assistant conversation not found");
  if (data.messages.length > 0) {
    await db.insert(assistantMessages).values(
      data.messages.map((message) => ({
        conversationId: data.conversationId,
        role: message.role,
        content: message.content,
      }))
    );
  }
  await db.update(assistantConversations).set({ updatedAt: new Date() }).where(eq(assistantConversations.id, data.conversationId));
}

export async function deleteAssistantConversation(conversationId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const conversation = await getAssistantConversation(conversationId, userId);
  if (!conversation) return false;
  await db.delete(assistantMessages).where(eq(assistantMessages.conversationId, conversationId));
  await db.delete(assistantConversations).where(eq(assistantConversations.id, conversationId));
  return true;
}

export async function getTripFaqs(tripId: number): Promise<TripFaq[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tripFaqs).where(eq(tripFaqs.tripId, tripId)).orderBy(desc(tripFaqs.isPinned), desc(tripFaqs.updatedAt));
}

export async function getTripFaq(id: number): Promise<TripFaq | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [faq] = await db.select().from(tripFaqs).where(eq(tripFaqs.id, id)).limit(1);
  return faq;
}

export async function getVisibleTripFaqs(tripId: number, activeRoundId?: number | null): Promise<TripFaq[]> {
  const [faqs, tripRounds] = await Promise.all([getTripFaqs(tripId), getRoundsByTrip(tripId)]);
  return filterTripFaqsForRound(faqs, tripRounds, activeRoundId);
}

export async function createTripFaq(data: { tripId: number; category?: string; isPinned?: boolean; visibleFromRoundId?: number | null; question: string; answer: string; createdByUserId: number }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(tripFaqs).values(data);
  return (result as any).insertId as number;
}

export async function updateTripFaq(id: number, data: { category?: string; isPinned?: boolean; visibleFromRoundId?: number | null; question?: string; answer?: string }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tripFaqs).set({ ...data, updatedAt: new Date() }).where(eq(tripFaqs.id, id));
}

export async function deleteTripFaq(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(tripFaqs).where(eq(tripFaqs.id, id));
}

// ─── Trip Invites ─────────────────────────────────────────────────────────────

export async function createInvite(data: InsertTripInvite): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tripInvites).values(data);
  return (result[0] as any).insertId as number;
}

export async function getInvitesByTrip(tripId: number): Promise<(TripInvite & { nickname?: string | null })[]> {
  const db = await getDb();
  if (!db) return [];
  const inviteList = await db.select().from(tripInvites).where(eq(tripInvites.tripId, tripId)).orderBy(tripInvites.createdAt);
  // Enrich accepted invites with the player's chosen nickname from trip_players
  const acceptedUserIds = inviteList
    .filter((i) => i.acceptedByUserId !== null)
    .map((i) => i.acceptedByUserId as number);
  let nicknameMap = new Map<number, string | null>();
  if (acceptedUserIds.length > 0) {
    const tpList = await db.select({ userId: tripPlayers.userId, nickname: tripPlayers.nickname })
      .from(tripPlayers)
      .where(and(eq(tripPlayers.tripId, tripId), inArray(tripPlayers.userId, acceptedUserIds)));
    nicknameMap = new Map(tpList.map((tp) => [tp.userId, tp.nickname ?? null]));
  }
  return inviteList.map((inv) => ({
    ...inv,
    nickname: inv.acceptedByUserId ? (nicknameMap.get(inv.acceptedByUserId) ?? null) : null,
  }));
}

export async function getInviteByToken(token: string): Promise<TripInvite | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(tripInvites).where(eq(tripInvites.token, token)).limit(1);
  return rows[0];
}

export async function acceptInvite(token: string, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tripInvites)
    .set({ status: "accepted", acceptedByUserId: userId, acceptedAt: new Date() })
    .where(eq(tripInvites.token, token));
}

export async function revokeInvite(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tripInvites).set({ status: "revoked" }).where(eq(tripInvites.id, id));
}

export async function updateInvite(id: number, data: Partial<Pick<TripInvite, "name" | "email" | "startingHandicap">>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tripInvites).set(data).where(eq(tripInvites.id, id));
}

export async function deleteInvite(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tripInvites).where(eq(tripInvites.id, id));
}

// ─── Nickname ─────────────────────────────────────────────────────────────────

export async function setPlayerNickname(tripId: number, userId: number, nickname: string | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(tripPlayers)
    .set({ nickname: nickname || null })
    .where(and(eq(tripPlayers.tripId, tripId), eq(tripPlayers.userId, userId)));
}

export async function setCoAdmin(tripId: number, userId: number, isCoAdmin: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(tripPlayers)
    .set({ isCoAdmin })
    .where(and(eq(tripPlayers.tripId, tripId), eq(tripPlayers.userId, userId)));
}

export async function getCoAdminCount(tripId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select()
    .from(tripPlayers)
    .where(and(eq(tripPlayers.tripId, tripId), eq(tripPlayers.isCoAdmin, true)));
  return result.length;
}

export async function isCoAdminForTrip(userId: number, tripId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(tripPlayers)
    .where(and(eq(tripPlayers.tripId, tripId), eq(tripPlayers.userId, userId), eq(tripPlayers.isCoAdmin, true)))
    .limit(1);
  return result.length > 0;
}

// ─── Nearest to Pin ───────────────────────────────────────────────────────────

import { NearestToPin, NtpEntry } from "../drizzle/schema";

export async function getNtpByRound(roundId: number): Promise<(NearestToPin & {
  entries: (NtpEntry & { userName: string | null })[];
  winnerName: string | null;
})[]> {
  const db = await getDb();
  if (!db) return [];
  const ntps = await db.select().from(nearestToPin).where(eq(nearestToPin.roundId, roundId)).orderBy(nearestToPin.holeNumber);
  const result = [];
  for (const ntp of ntps) {
    const rawEntries = await db
      .select({ entry: ntpEntries, userName: users.name, userNickname: tripPlayers.nickname })
      .from(ntpEntries)
      .leftJoin(users, eq(ntpEntries.userId, users.id))
      // We need the tripId — get it from the round
      .leftJoin(rounds, eq(rounds.id, ntp.roundId))
      .leftJoin(tripPlayers, and(eq(tripPlayers.userId, ntpEntries.userId), eq(tripPlayers.tripId, rounds.tripId)))
      .where(eq(ntpEntries.ntpId, ntp.id))
      .orderBy(ntpEntries.distanceCm);
    const entries = rawEntries.map((r) => ({
      ...r.entry,
      userName: r.userNickname ?? r.userName ?? null,
    }));
    let winnerName: string | null = null;
    if (ntp.winnerId) {
      const wRow = rawEntries.find((r) => r.entry.userId === ntp.winnerId);
      winnerName = wRow ? (wRow.userNickname ?? wRow.userName ?? null) : null;
    }
    result.push({ ...ntp, entries, winnerName });
  }
  return result;
}

export async function enableNtp(roundId: number, holeId: number, holeNumber: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Upsert — only one NTP record per hole per round
  const existing = await db.select().from(nearestToPin)
    .where(and(eq(nearestToPin.roundId, roundId), eq(nearestToPin.holeId, holeId))).limit(1);
  if (existing[0]) return existing[0].id;
  const result = await db.insert(nearestToPin).values({ roundId, holeId, holeNumber });
  return (result[0] as any).insertId as number;
}

export async function disableNtp(roundId: number, holeId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const ntp = await db.select().from(nearestToPin)
    .where(and(eq(nearestToPin.roundId, roundId), eq(nearestToPin.holeId, holeId))).limit(1);
  if (!ntp[0]) return;
  await db.delete(ntpEntries).where(eq(ntpEntries.ntpId, ntp[0].id));
  await db.delete(nearestToPin).where(eq(nearestToPin.id, ntp[0].id));
}

export async function submitNtpEntry(ntpId: number, userId: number, distanceCm: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Upsert — one entry per user per NTP hole
  const existing = await db.select().from(ntpEntries)
    .where(and(eq(ntpEntries.ntpId, ntpId), eq(ntpEntries.userId, userId))).limit(1);
  if (existing[0]) {
    await db.update(ntpEntries).set({ distanceCm }).where(eq(ntpEntries.id, existing[0].id));
  } else {
    await db.insert(ntpEntries).values({ ntpId, userId, distanceCm });
  }
}

export async function setNtpWinner(ntpId: number, winnerId: number, winnerDistanceCm: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(nearestToPin).set({ winnerId, winnerDistanceCm }).where(eq(nearestToPin.id, ntpId));
}

// ─── Pairing & Group Matchplay ────────────────────────────────────────────────

/**
 * Admin or player: assign two players in a group as a pair.
 * pairId = 1 → Pair A, pairId = 2 → Pair B.
 * Also sets each player's partnerId to the other and scorerId (cross-scoring).
 */
export async function setPair(
  groupId: number,
  player1UserId: number,
  player2UserId: number,
  pairId: 1 | 2
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Update player1: partner = player2, scorer = player2 (player2 scores for player1)
  await db
    .update(groupPlayers)
    .set({ partnerId: player2UserId, pairId, selectedMarkerId: player2UserId, scorerId: player2UserId })
    .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.userId, player1UserId)));
  // Update player2: partner = player1, scorer = player1
  await db
    .update(groupPlayers)
    .set({ partnerId: player1UserId, pairId, selectedMarkerId: player1UserId, scorerId: player1UserId })
    .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.userId, player2UserId)));
}

/**
 * Player self-pairs with a chosen partner in the same group.
 * Only allowed when pairsLocked = false.
 */
export async function selfPair(
  groupId: number,
  requestingUserId: number,
  chosenPartnerId: number
): Promise<{
  success: boolean;
  error?: string;
  awaitingReciprocalChoice?: boolean;
  automaticTeamMatchId?: number | null;
  automaticSinglesMatchIds?: number[];
}> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (requestingUserId === chosenPartnerId) {
    return { success: false, error: "Choose another player to mark your card" };
  }
  // Check group is not locked
  const grp = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!grp[0]) return { success: false, error: "Group not found" };
  if (grp[0].pairsLocked) return { success: false, error: "Pairs are locked for this group" };
  // Both players must be in the group
  const members = await db.select().from(groupPlayers).where(eq(groupPlayers.groupId, groupId));
  const memberIds = members.map((m) => m.userId);
  if (!memberIds.includes(requestingUserId) || !memberIds.includes(chosenPartnerId)) {
    return { success: false, error: "Both players must be in the same group" };
  }

  const requester = members.find((m) => m.userId === requestingUserId);
  const chosenMarker = members.find((m) => m.userId === chosenPartnerId);
  if (!requester || !chosenMarker) return { success: false, error: "Player is not available in this group" };
  if (requester.partnerId && requester.partnerId !== chosenPartnerId) {
    return { success: false, error: "You already have a confirmed score marker" };
  }
  if (chosenMarker.partnerId && chosenMarker.partnerId !== requestingUserId) {
    return { success: false, error: "That player already has a confirmed score marker" };
  }

  // A player may revise an unconfirmed selection. Clear the prior recipient's pending scorer reference.
  if (requester.selectedMarkerId && requester.selectedMarkerId !== chosenPartnerId && !requester.partnerId) {
    await db.update(groupPlayers)
      .set({ scorerId: null })
      .where(and(
        eq(groupPlayers.groupId, groupId),
        eq(groupPlayers.userId, requester.selectedMarkerId)
      ));
  }

  await db.update(groupPlayers)
    .set({ selectedMarkerId: chosenPartnerId })
    .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.userId, requestingUserId)));

  // A pair is only confirmed when both golfers independently select each other.
  if (chosenMarker.selectedMarkerId !== requestingUserId) {
    return { success: true, awaitingReciprocalChoice: true };
  }

  // Determine the remaining pair slot. A previously confirmed mutual selection keeps its slot.
  const currentMembers = await db.select().from(groupPlayers).where(eq(groupPlayers.groupId, groupId));
  const currentRequester = currentMembers.find((m) => m.userId === requestingUserId);
  const existingPairs = currentMembers.filter((m) => m.pairId !== null && m.userId !== requestingUserId && m.userId !== chosenPartnerId);
  const usedPairIds = Array.from(new Set(existingPairs.map((m) => m.pairId)));
  const pairId = currentRequester?.pairId ?? (usedPairIds.includes(1) ? 2 : 1);
  await setPair(groupId, requestingUserId, chosenPartnerId, pairId as 1 | 2);
  const automatic = await ensureAutomaticMatchesForGroup(groupId);
  return {
    success: true,
    automaticTeamMatchId: automatic.teamMatchId,
    automaticSinglesMatchIds: automatic.singlesMatchIds,
  };
}

/**
 * Create the default side matches that follow score-marker choices:
 * each mutually marking pair receives a Singles Match Play record; when a four-ball
 * contains two mutual pairs, their default 4BBB Match Play record is created as well.
 */
export async function ensureAutomaticMatchesForGroup(groupId: number): Promise<{
  teamMatchId: number | null;
  singlesMatchIds: number[];
}> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const groupRow = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!groupRow[0]) throw new Error("Group not found");
  const members = (await db.select().from(groupPlayers).where(eq(groupPlayers.groupId, groupId)))
    .filter((member) => member.userId !== null);
  const mutualMarkerPairs = resolveMutualScoreMarkerPairs(members);
  const confirmedPairs = [1, 2].map((pairId) => members.filter((member) => member.pairId === pairId));
  const validPairs = confirmedPairs.filter((pair) =>
    pair.length === 2 &&
    pair[0].userId !== null &&
    pair[1].userId !== null &&
    pair[0].partnerId === pair[1].userId &&
    pair[1].partnerId === pair[0].userId &&
    mutualMarkerPairs.some(([playerAId, playerBId]) =>
      (playerAId === pair[0].userId && playerBId === pair[1].userId) ||
      (playerAId === pair[1].userId && playerBId === pair[0].userId)
    )
  );

  const existing = await db.select().from(matchPlayResults).where(and(
    eq(matchPlayResults.roundId, groupRow[0].roundId),
    eq(matchPlayResults.groupId, groupId)
  ));
  const singlesMatchIds: number[] = [];
  for (const pair of validPairs) {
    const playerAId = pair[0].userId!;
    const playerBId = pair[1].userId!;
    const existingSingles = existing.find((match) =>
      match.player1PartnerId === null &&
      match.player2PartnerId === null &&
      ((match.player1Id === playerAId && match.player2Id === playerBId) ||
        (match.player1Id === playerBId && match.player2Id === playerAId))
    );
    if (existingSingles) {
      singlesMatchIds.push(existingSingles.id);
      continue;
    }
    const [result] = await db.insert(matchPlayResults).values({
      roundId: groupRow[0].roundId,
      groupId,
      player1Id: playerAId,
      player2Id: playerBId,
      holeResults: "[]",
      matchStatus: 0,
      winner: "pending",
    });
    singlesMatchIds.push((result as any).insertId);
  }

  // The default 4BBB side match is ready once both score-marker pairs are confirmed.
  if (validPairs.length !== 2 || !isAutomaticFourBBBReady(members)) {
    return { teamMatchId: null, singlesMatchIds };
  }
  const team = await lockGroupPairs(groupId, groupRow[0].roundId);
  if (!team.matchId && team.error) throw new Error(team.error);
  return { teamMatchId: team.matchId, singlesMatchIds };
}

/**
 * Admin: lock pairs for a group and auto-create the intra-group 4BBB matchplay record.
 * Requires exactly 4 players with 2 complete pairs (pairId 1 and 2).
 */
export async function lockGroupPairs(groupId: number, roundId: number): Promise<{ matchId: number | null; error?: string }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const members = await db.select().from(groupPlayers).where(eq(groupPlayers.groupId, groupId));
  const pairA = members.filter((m) => m.pairId === 1);
  const pairB = members.filter((m) => m.pairId === 2);
  if (pairA.length !== 2 || pairB.length !== 2) {
    return { matchId: null, error: "Need exactly 2 players in each pair before locking" };
  }
  // Lock the group
  await db.update(groups).set({ pairsLocked: true }).where(eq(groups.id, groupId));
  // Create the 4BBB matchplay record (Pair A vs Pair B)
  const existing = await db
    .select()
    .from(matchPlayResults)
    .where(and(eq(matchPlayResults.roundId, roundId), eq(matchPlayResults.groupId, groupId)));
  const existingTeamMatch = existing.find((match) =>
    match.player1PartnerId !== null && match.player2PartnerId !== null
  );
  if (existingTeamMatch) return { matchId: existingTeamMatch.id };
  const [result] = await db.insert(matchPlayResults).values({
    roundId,
    groupId,
    player1Id: pairA[0].userId!,
    player1PartnerId: pairA[1].userId!,
    player2Id: pairB[0].userId!,
    player2PartnerId: pairB[1].userId!,
    holeResults: "[]",
    matchStatus: 0,
    winner: "pending",
  });
  return { matchId: (result as any).insertId };
}

/**
 * Get the group a player belongs to for a given round, including their partner and opponents.
 */
export async function getMyGroupForRound(roundId: number, userId: number): Promise<{
  groupId: number;
  groupName: string;
  pairsLocked: boolean;
  startingHole: number | null;
  teeTime: string | null;
  myEntry: GroupPlayer | null;
  partner: (GroupPlayer & { user: User | undefined }) | null;
  opponents: (GroupPlayer & { user: User | undefined })[];
  allMembers: (GroupPlayer & { user: User | undefined })[];
} | null> {
  const db = await getDb();
  if (!db) return null;
  // Find the group this user is in for this round
  const roundGroups = await db.select().from(groups).where(eq(groups.roundId, roundId));
  for (const grp of roundGroups) {
    const members = await db.select().from(groupPlayers).where(eq(groupPlayers.groupId, grp.id));
    const myEntry = members.find((m) => m.userId === userId) ?? null;
    if (!myEntry) continue;
    const registeredMembers = members.filter((m) => m.userId !== null);
    const userIds = registeredMembers.map((m) => m.userId as number);
    const userList = userIds.length > 0 ? await db.select().from(users).where(inArray(users.id, userIds)) : [];
    const userMap = new Map(userList.map((u) => [u.id, u]));
    const withUser = registeredMembers.map((m) => ({ ...m, user: userMap.get(m.userId as number) }));
    const partner = myEntry.partnerId
      ? (withUser.find((m) => m.userId === myEntry.partnerId) ?? null)
      : null;
    const opponents = withUser.filter((m) => m.userId !== userId && m.userId !== myEntry.partnerId);
    return {
      groupId: grp.id,
      groupName: grp.name,
      pairsLocked: grp.pairsLocked,
      startingHole: grp.startingHole ?? null,
      teeTime: grp.teeTime ?? null,
      myEntry,
      partner,
      opponents,
      allMembers: withUser,
    };
  }
  return null;
}

/**
 * Recalculate the 4BBB matchplay status for a group match from current scores.
 * Best Stableford of each pair per hole → compare → update matchplay_results.
 */
export async function recalcGroupMatch(matchId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const match = await db.select().from(matchPlayResults).where(eq(matchPlayResults.id, matchId)).limit(1);
  if (!match[0]) return;
  const m = match[0];
  const pairAIds = [m.player1Id, m.player1PartnerId].filter(Boolean) as number[];
  const pairBIds = [m.player2Id, m.player2PartnerId].filter(Boolean) as number[];
  // Get all scores for this round for these players
  const allScores = await db
    .select()
    .from(scores)
    .where(and(eq(scores.roundId, m.roundId), inArray(scores.userId, [...pairAIds, ...pairBIds])));
  // Get holes to know total
  const round = await db.select().from(rounds).where(eq(rounds.id, m.roundId)).limit(1);
  if (!round[0]) return;
  const courseHoles = await db.select().from(holes).where(eq(holes.courseId, round[0].courseId)).orderBy(holes.holeNumber);
  const holeResults: { holeNumber: number; result: "player1" | "player2" | "halved" }[] = [];
  for (const hole of courseHoles) {
    const pairAScores = allScores.filter((s) => pairAIds.includes(s.userId) && s.holeId === hole.id);
    const pairBScores = allScores.filter((s) => pairBIds.includes(s.userId) && s.holeId === hole.id);
    if (pairAScores.length === 0 || pairBScores.length === 0) continue; // hole not yet scored by both pairs
    const bestA = Math.max(...pairAScores.map((s) => s.stablefordPoints));
    const bestB = Math.max(...pairBScores.map((s) => s.stablefordPoints));
    const result: "player1" | "player2" | "halved" = bestA > bestB ? "player1" : bestA < bestB ? "player2" : "halved";
    holeResults.push({ holeNumber: hole.holeNumber, result });
  }
  // Calculate running status (positive = Pair A up, negative = Pair B up)
  let status = 0;
  for (const r of holeResults) {
    if (r.result === "player1") status++;
    else if (r.result === "player2") status--;
  }
  const holesPlayed = holeResults.length;
  const holesRemaining = courseHoles.length - holesPlayed;
  let winner: "player1" | "player2" | "halved" | "pending" = "pending";
  if (holesPlayed === courseHoles.length) {
    winner = status > 0 ? "player1" : status < 0 ? "player2" : "halved";
  } else if (Math.abs(status) > holesRemaining) {
    winner = status > 0 ? "player1" : "player2";
  }
  await db.update(matchPlayResults).set({
    holeResults: JSON.stringify(holeResults),
    matchStatus: status,
    winner,
  }).where(eq(matchPlayResults.id, matchId));
}

/** Recalculate every team or singles match involving a player after their score changes. */
export async function recalcMatchesForPlayerScore(roundId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const playerGroups = await db.select({ groupId: groupPlayers.groupId })
    .from(groupPlayers)
    .where(eq(groupPlayers.userId, userId));
  const groupIds = [...new Set(playerGroups.map((row) => row.groupId))];
  if (groupIds.length === 0) return;
  const candidates = await db.select().from(matchPlayResults)
    .where(eq(matchPlayResults.roundId, roundId));
  const affectedMatchIds = candidates
    .filter((match) => groupIds.includes(match.groupId))
    .filter((match) => [match.player1Id, match.player1PartnerId, match.player2Id, match.player2PartnerId].includes(userId))
    .map((match) => match.id);
  await Promise.all(affectedMatchIds.map((matchId) => recalcGroupMatch(matchId)));
}

// ─── Auto-Group with Handicap-Biased Pairing ─────────────────────────────────

/**
 * Automatically creates groups and pairs players for a round.
 * Pairing bias: sort players by handicap, then pair lowest with highest
 * (snake draft: 1st with last, 2nd with 2nd-last, etc.) within each group.
 * Groups are filled in round-robin order.
 *
 * @param roundId  The round to create groups for
 * @param tripId   The trip (to fetch players + handicaps)
 * @param groupCount  Number of groups to create (default: ceil(players / 4))
 * @param groupNamePrefix  Prefix for group names (default: "Group")
 */
export async function autoGroupRound(
  roundId: number,
  tripId: number,
  groupCount?: number,
  groupNamePrefix = "Group"
): Promise<{ groupIds: number[]; totalPlayers: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // 1. Get all trip players sorted by currentHandicap ascending
  const allPlayers = await getTripPlayers(tripId);
  if (allPlayers.length === 0) throw new Error("No players in this trip.");

  // Sort by handicap ascending, then add a small random jitter so equal-handicap
  // players are shuffled relative to each other (true randomisation within tiers).
  const sorted = [...allPlayers].sort((a, b) => {
    const diff = (a.currentHandicap ?? 99) - (b.currentHandicap ?? 99);
    return diff !== 0 ? diff : Math.random() - 0.5;
  });
  // Snake-pair: pair index 0 (lowest HCP) with last (highest HCP), etc.
  // This biases each pair to have one low and one high handicap player.
  const paired: typeof sorted = [];
  let lo = 0, hi = sorted.length - 1;
  while (lo <= hi) {
    if (lo === hi) { paired.push(sorted[lo]); lo++; }
    else { paired.push(sorted[lo], sorted[hi]); lo++; hi--; }
  }
  // Shuffle the resulting pairs (groups of 2) so group assignment is randomised
  // while preserving the low+high pairing within each pair.
  const pairCount = Math.floor(paired.length / 2);
  const pairSlots: [typeof sorted[0], typeof sorted[0]][] = [];
  for (let i = 0; i < pairCount; i++) pairSlots.push([paired[i * 2], paired[i * 2 + 1]]);
  // Fisher-Yates shuffle on the pair slots
  for (let i = pairSlots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairSlots[i], pairSlots[j]] = [pairSlots[j], pairSlots[i]];
  }
  // Flatten back, appending any odd player at the end
  const shuffledPaired: typeof sorted = pairSlots.flat();
  if (paired.length % 2 === 1) shuffledPaired.push(paired[paired.length - 1]);
  // Replace paired with shuffled version for group assignment
  paired.length = 0;
  paired.push(...shuffledPaired);

  // 2. Determine group count
  const numGroups = groupCount ?? Math.ceil(paired.length / 4);
  const clampedGroups = Math.max(1, Math.min(numGroups, Math.ceil(paired.length / 2)));

  // 3. Delete existing groups for this round
  const existingGroups = await getGroupsByRound(roundId);
  for (const g of existingGroups) {
    await db.delete(groupPlayers).where(eq(groupPlayers.groupId, g.id));
    await db.delete(groups).where(eq(groups.id, g.id));
  }

  // 4. Create new groups
  const groupIds: number[] = [];
  for (let i = 0; i < clampedGroups; i++) {
    const name = `${groupNamePrefix} ${String.fromCharCode(65 + i)}`; // Group A, B, C...
    const id = await createGroup(roundId, tripId, name);
    groupIds.push(id);
  }

  // 5. Assign players to groups in round-robin order
  for (let i = 0; i < paired.length; i++) {
    const groupId = groupIds[i % clampedGroups];
    await db.insert(groupPlayers)
      .values({ groupId, userId: paired[i].userId, partnerId: null })
      .onDuplicateKeyUpdate({ set: { partnerId: null } });
  }

  // 6. Auto-assign pairs within each group (first two = Pair A, last two = Pair B)
  for (const groupId of groupIds) {
    const gPlayers = (await db.select().from(groupPlayers).where(eq(groupPlayers.groupId, groupId))).filter((p) => p.userId !== null);
    if (gPlayers.length >= 2) {
      // Pair A: first two players
      await db.update(groupPlayers)
        .set({ pairId: 1, partnerId: gPlayers[1].userId!, scorerId: gPlayers[1].userId! })
        .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.userId, gPlayers[0].userId!)));
      await db.update(groupPlayers)
        .set({ pairId: 1, partnerId: gPlayers[0].userId!, scorerId: gPlayers[0].userId! })
        .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.userId, gPlayers[1].userId!)));
    }
    if (gPlayers.length >= 4) {
      // Pair B: third and fourth players
      await db.update(groupPlayers)
        .set({ pairId: 2, partnerId: gPlayers[3].userId!, scorerId: gPlayers[3].userId! })
        .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.userId, gPlayers[2].userId!)));
      await db.update(groupPlayers)
        .set({ pairId: 2, partnerId: gPlayers[2].userId!, scorerId: gPlayers[2].userId! })
        .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.userId, gPlayers[3].userId!)));
    }
  }

  return { groupIds, totalPlayers: paired.length };
}

/**
 * Unlock pairs for a group — clears pairsLocked flag so pairs can be reassigned.
 * Does NOT delete the existing matchplay record (keeps history), but marks it as voided.
 */
export async function unlockGroupPairs(groupId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(groups).set({ pairsLocked: false }).where(eq(groups.id, groupId));
}

/**
 * Revoke the trip-level share link by clearing the shareToken.
 * Any existing /join-trip URLs will stop working immediately.
 */
export async function revokeTripShareLink(tripId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(trips).set({ shareToken: null }).where(eq(trips.id, tripId));
}

/**
 * Update tee time and starting hole for a group.
 */
export async function updateGroupSettings(groupId: number, teeTime: string | null, startingHole: number | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(groups).set({ teeTime, startingHole }).where(eq(groups.id, groupId));
}

// ─── Grouping Copy / Re-seed ──────────────────────────────────────────────────

/**
 * Copy exact groups and pairings from sourceRoundId to targetRoundId.
 * Clears any existing groups on the target round first.
 * Returns the number of groups created.
 */
export async function copyGroupingsToRound(
  sourceRoundId: number,
  targetRoundId: number,
  tripId: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Clear existing groups on target round
  const existingTarget = await db.select({ id: groups.id }).from(groups).where(eq(groups.roundId, targetRoundId));
  for (const g of existingTarget) {
    await db.delete(groupPlayers).where(eq(groupPlayers.groupId, g.id));
    await db.delete(groups).where(eq(groups.id, g.id));
  }

  // Copy each source group
  const sourceGroups = await db.select().from(groups).where(eq(groups.roundId, sourceRoundId));
  for (const sg of sourceGroups) {
    const newGroupResult = await db.insert(groups).values({
      roundId: targetRoundId,
      tripId,
      name: sg.name,
      pairsLocked: false,
      teeTime: sg.teeTime ?? null,
      startingHole: sg.startingHole ?? null,
    });
    const newGroupId = (newGroupResult[0] as any).insertId as number;

    // Copy players with their partnerId mappings
    const sourcePlayers = await db.select().from(groupPlayers).where(eq(groupPlayers.groupId, sg.id));
    for (const sp of sourcePlayers) {
      await db.insert(groupPlayers).values({
        groupId: newGroupId,
        userId: sp.userId,
        partnerId: sp.partnerId ?? null,
        pairId: sp.pairId ?? null,
        scorerId: null, // reset scorer for new round
      });
    }
  }
  return sourceGroups.length;
}

/**
 * Re-seed groups for targetRoundId based on 4BBB pair standings from sourceRoundId.
 * Best pair goes into group 1, second pair into group 2, etc.
 * Preserves pair partnerships. Clears existing groups on target round first.
 */
export async function reseedGroupsBy4BBB(
  sourceRoundId: number,
  targetRoundId: number,
  tripId: number,
  groupSize: number = 4
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Get source groups and compute 4BBB best-ball net per pair
  const sourceGroups = await db.select().from(groups).where(eq(groups.roundId, sourceRoundId));
  const round = await db.select().from(rounds).where(eq(rounds.id, sourceRoundId)).limit(1);
  if (!round[0]) throw new Error("Source round not found");
  const courseHolesRows = await db.select().from(holes).where(eq(holes.courseId, round[0].courseId));

  // Gather all scores for the source round
  const allScores = await db.select().from(scores).where(eq(scores.roundId, sourceRoundId));
  const scoreMap = new Map<string, number>(); // `${userId}-${holeId}` -> netScore
  for (const s of allScores) {
    if (s.netScore !== null) scoreMap.set(`${s.userId}-${s.holeId}`, s.netScore);
  }

  type PairEntry = { userId1: number; userId2: number; totalBestBall: number };
  const pairEntries: PairEntry[] = [];
  const seenPairs = new Set<string>();

    for (const sg of sourceGroups) {
    const gps = await db.select().from(groupPlayers).where(eq(groupPlayers.groupId, sg.id));
    for (const gp of gps) {
      if (!gp.userId || !gp.partnerId) continue;
      const key = [gp.userId, gp.partnerId].sort().join("-");
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      let total = 0;
      for (const h of courseHolesRows) {
        const s1 = scoreMap.get(`${gp.userId}-${h.id}`);
        const s2 = scoreMap.get(`${gp.partnerId}-${h.id}`);
        if (s1 !== undefined && s2 !== undefined) total += Math.min(s1, s2);
        else if (s1 !== undefined) total += s1;
        else if (s2 !== undefined) total += s2;
      }
      pairEntries.push({ userId1: gp.userId, userId2: gp.partnerId, totalBestBall: total });
    }
  }
  // Sort pairs: best (lowest net) first
  pairEntries.sort((a, b) => a.totalBestBall - b.totalBestBall);
  // Clear existing groups on target round
  const existingTarget = await db.select({ id: groups.id }).from(groups).where(eq(groups.roundId, targetRoundId));
  for (const g of existingTarget) {
    await db.delete(groupPlayers).where(eq(groupPlayers.groupId, g.id));
    await db.delete(groups).where(eq(groups.id, g.id));
  }

  // Fill groups: pairs per group = groupSize / 2
  const pairsPerGroup = Math.max(1, Math.floor(groupSize / 2));
  let groupIndex = 0;
  let currentGroupId: number | null = null;
  let pairsInCurrentGroup = 0;

  for (const pair of pairEntries) {
    if (currentGroupId === null || pairsInCurrentGroup >= pairsPerGroup) {
      groupIndex++;
      const res = await db.insert(groups).values({
        roundId: targetRoundId,
        tripId,
        name: `Group ${groupIndex}`,
        pairsLocked: false,
      });
      currentGroupId = (res[0] as any).insertId as number;
      pairsInCurrentGroup = 0;
    }
    await db.insert(groupPlayers).values({ groupId: currentGroupId, userId: pair.userId1, partnerId: pair.userId2 });
    await db.insert(groupPlayers).values({ groupId: currentGroupId, userId: pair.userId2, partnerId: pair.userId1 });
    pairsInCurrentGroup++;
  }

  return groupIndex;
}

/**
 * Re-seed groups for targetRoundId based on individual cumulative net trip standings.
 * Uses a snake draft: rank players 1..N by cumulative net, then fill groups so
 * top and bottom players are in the same group (competitive balance).
 * Clears existing groups on target round first.
 */
export async function reseedGroupsByIndividual(
  targetRoundId: number,
  tripId: number,
  groupSize: number = 4
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Get all trip players sorted by cumulative net (ascending = best first)
  const tripPlayerList = await db.select().from(tripPlayers).where(eq(tripPlayers.tripId, tripId));

  // Compute cumulative net for each player across all completed rounds in the trip
  const tripRounds = await db.select({ id: rounds.id }).from(rounds).where(eq(rounds.tripId, tripId));
  const roundIds = tripRounds.map((r) => r.id);

  const cumulativeNet = new Map<number, number>();
  for (const tp of tripPlayerList) cumulativeNet.set(tp.userId, 0);

  if (roundIds.length > 0) {
    const allScoresForTrip = await db.select().from(scores).where(inArray(scores.roundId, roundIds));
    for (const s of allScoresForTrip) {
      if (s.netScore !== null) {
        cumulativeNet.set(s.userId, (cumulativeNet.get(s.userId) ?? 0) + s.netScore);
      }
    }
  }

  // Sort players by cumulative net ascending (best = lowest net first)
  const sorted = tripPlayerList
    .map((tp) => ({ userId: tp.userId, net: cumulativeNet.get(tp.userId) ?? 999 }))
    .sort((a, b) => a.net - b.net);

  // Snake draft into groups
  const numGroups = Math.max(1, Math.ceil(sorted.length / groupSize));
  const groupBuckets: number[][] = Array.from({ length: numGroups }, () => []);

  for (let i = 0; i < sorted.length; i++) {
    const round = Math.floor(i / numGroups);
    const posInRound = i % numGroups;
    const groupIdx = round % 2 === 0 ? posInRound : numGroups - 1 - posInRound;
    groupBuckets[groupIdx].push(sorted[i].userId);
  }

  // Clear existing groups on target round
  const existingTarget = await db.select({ id: groups.id }).from(groups).where(eq(groups.roundId, targetRoundId));
  for (const g of existingTarget) {
    await db.delete(groupPlayers).where(eq(groupPlayers.groupId, g.id));
    await db.delete(groups).where(eq(groups.id, g.id));
  }

  // Create groups
  let created = 0;
  for (let gi = 0; gi < groupBuckets.length; gi++) {
    const bucket = groupBuckets[gi];
    if (bucket.length === 0) continue;
    const res = await db.insert(groups).values({
      roundId: targetRoundId,
      tripId,
      name: `Group ${gi + 1}`,
      pairsLocked: false,
    });
    const newGroupId = (res[0] as any).insertId as number;
    for (const userId of bucket) {
      await db.insert(groupPlayers).values({ groupId: newGroupId, userId, partnerId: null });
    }
    created++;
  }

  return created;
}

// ─── Grouping Preview (dry-run) ───────────────────────────────────────────────

export type GroupPreview = {
  name: string;
  players: { userId: number; displayName: string; handicap: number; partnerId?: number | null }[];
};

/** Preview: copy exact groups+pairings from sourceRound to targetRound (no DB writes). */
export async function previewCopyGroupings(
  sourceRoundId: number,
  tripId: number
): Promise<GroupPreview[]> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const sourceGroups = await db.select().from(groups).where(eq(groups.roundId, sourceRoundId));
  const tpList = await db
    .select({ userId: tripPlayers.userId, nickname: tripPlayers.nickname, currentHandicap: tripPlayers.currentHandicap })
    .from(tripPlayers)
    .where(eq(tripPlayers.tripId, tripId));
  const userIds = tpList.map((t) => t.userId);
  const userList = userIds.length > 0 ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds)) : [];
  const nameMap = new Map(userList.map((u) => [u.id, u.name]));
  const tpMap = new Map(tpList.map((t) => [t.userId, t]));

  const result: GroupPreview[] = [];
    for (const sg of sourceGroups) {
    const gps = await db.select().from(groupPlayers).where(eq(groupPlayers.groupId, sg.id));
    result.push({
      name: sg.name,
      players: gps.filter((gp) => gp.userId !== null).map((gp) => {
        const uid = gp.userId as number;
        const tp = tpMap.get(uid);
        return {
          userId: uid,
          displayName: tp?.nickname ?? nameMap.get(uid) ?? `User ${uid}`,
          handicap: tp?.currentHandicap ?? 0,
          partnerId: gp.partnerId,
        };
      }),
    });
  }
  return result;
}
/** Preview: re-seed by 4BBB pair standings from sourceRound (no DB writes). */
export async function previewReseedBy4BBB(
  sourceRoundId: number,
  tripId: number,
  groupSize: number = 4
): Promise<GroupPreview[]> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const sourceGroups = await db.select().from(groups).where(eq(groups.roundId, sourceRoundId));
  const round = await db.select().from(rounds).where(eq(rounds.id, sourceRoundId)).limit(1);
  if (!round[0]) throw new Error("Source round not found");
  const courseHolesRows = await db.select().from(holes).where(eq(holes.courseId, round[0].courseId));
  const allScores = await db.select().from(scores).where(eq(scores.roundId, sourceRoundId));
  const scoreMap = new Map<string, number>();
  for (const s of allScores) {
    if (s.netScore !== null) scoreMap.set(`${s.userId}-${s.holeId}`, s.netScore);
  }

  const tpList = await db
    .select({ userId: tripPlayers.userId, nickname: tripPlayers.nickname, currentHandicap: tripPlayers.currentHandicap })
    .from(tripPlayers)
    .where(eq(tripPlayers.tripId, tripId));
  const userIds = tpList.map((t) => t.userId);
  const userList = userIds.length > 0 ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds)) : [];
  const nameMap = new Map(userList.map((u) => [u.id, u.name]));
  const tpMap = new Map(tpList.map((t) => [t.userId, t]));

  type PairEntry = { userId1: number; userId2: number; totalBestBall: number };
  const pairEntries: PairEntry[] = [];
  const seenPairs = new Set<string>();

    for (const sg of sourceGroups) {
    const gps = await db.select().from(groupPlayers).where(eq(groupPlayers.groupId, sg.id));
    for (const gp of gps) {
      if (!gp.userId || !gp.partnerId) continue;
      const key = [gp.userId, gp.partnerId].sort().join("-");
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      let total = 0;
      for (const h of courseHolesRows) {
        const s1 = scoreMap.get(`${gp.userId}-${h.id}`);
        const s2 = scoreMap.get(`${gp.partnerId}-${h.id}`);
        if (s1 !== undefined && s2 !== undefined) total += Math.min(s1, s2);
        else if (s1 !== undefined) total += s1;
        else if (s2 !== undefined) total += s2;
      }
      pairEntries.push({ userId1: gp.userId, userId2: gp.partnerId, totalBestBall: total });
    }
  }
  pairEntries.sort((a, b) => a.totalBestBall - b.totalBestBall);
  const pairsPerGroup = Math.max(1, Math.floor(groupSize / 2));
  const groupBuckets: { userId1: number; userId2: number }[][] = [];
  let currentBucket: { userId1: number; userId2: number }[] = [];

  for (const pair of pairEntries) {
    if (currentBucket.length >= pairsPerGroup) {
      groupBuckets.push(currentBucket);
      currentBucket = [];
    }
    currentBucket.push({ userId1: pair.userId1, userId2: pair.userId2 });
  }
  if (currentBucket.length > 0) groupBuckets.push(currentBucket);

  return groupBuckets.map((bucket, gi) => ({
    name: `Group ${gi + 1}`,
    players: bucket.flatMap((pair) => [
      { userId: pair.userId1, displayName: tpMap.get(pair.userId1)?.nickname ?? nameMap.get(pair.userId1) ?? `User ${pair.userId1}`, handicap: tpMap.get(pair.userId1)?.currentHandicap ?? 0, partnerId: pair.userId2 },
      { userId: pair.userId2, displayName: tpMap.get(pair.userId2)?.nickname ?? nameMap.get(pair.userId2) ?? `User ${pair.userId2}`, handicap: tpMap.get(pair.userId2)?.currentHandicap ?? 0, partnerId: pair.userId1 },
    ]),
  }));
}

/** Preview: re-seed by individual cumulative net trip standings (snake draft, no DB writes). */
export async function previewReseedByIndividual(
  tripId: number,
  groupSize: number = 4
): Promise<GroupPreview[]> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const tripPlayerList = await db
    .select({ userId: tripPlayers.userId, nickname: tripPlayers.nickname, currentHandicap: tripPlayers.currentHandicap })
    .from(tripPlayers)
    .where(eq(tripPlayers.tripId, tripId));
  const userIds = tripPlayerList.map((t) => t.userId);
  const userList = userIds.length > 0 ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds)) : [];
  const nameMap = new Map(userList.map((u) => [u.id, u.name]));
  const tpMap = new Map(tripPlayerList.map((t) => [t.userId, t]));

  const tripRounds = await db.select({ id: rounds.id }).from(rounds).where(eq(rounds.tripId, tripId));
  const roundIds = tripRounds.map((r) => r.id);
  const cumulativeNet = new Map<number, number>();
  for (const tp of tripPlayerList) cumulativeNet.set(tp.userId, 0);
  if (roundIds.length > 0) {
    const allScoresForTrip = await db.select().from(scores).where(inArray(scores.roundId, roundIds));
    for (const s of allScoresForTrip) {
      if (s.netScore !== null) cumulativeNet.set(s.userId, (cumulativeNet.get(s.userId) ?? 0) + s.netScore);
    }
  }

  const sorted = tripPlayerList
    .map((tp) => ({ userId: tp.userId, net: cumulativeNet.get(tp.userId) ?? 999 }))
    .sort((a, b) => a.net - b.net);

  const numGroups = Math.max(1, Math.ceil(sorted.length / groupSize));
  const groupBuckets: number[][] = Array.from({ length: numGroups }, () => []);
  for (let i = 0; i < sorted.length; i++) {
    const r = Math.floor(i / numGroups);
    const posInRound = i % numGroups;
    const groupIdx = r % 2 === 0 ? posInRound : numGroups - 1 - posInRound;
    groupBuckets[groupIdx].push(sorted[i].userId);
  }

  return groupBuckets
    .filter((b) => b.length > 0)
    .map((bucket, gi) => ({
      name: `Group ${gi + 1}`,
      players: bucket.map((userId) => ({
        userId,
        displayName: tpMap.get(userId)?.nickname ?? nameMap.get(userId) ?? `User ${userId}`,
        handicap: tpMap.get(userId)?.currentHandicap ?? 0,
        partnerId: null,
      })),
    }));
}

// ─── Custom Awards ────────────────────────────────────────────────────────────


export async function getAwardsByTrip(tripId: number): Promise<(TripAward & { winner: TripAwardWinner | null })[]> {
  const db = await getDb();
  if (!db) return [];
  const awards = await db.select().from(tripAwards).where(eq(tripAwards.tripId, tripId));
  const awardIds = awards.map((a) => a.id);
  const winners: TripAwardWinner[] = awardIds.length
    ? await db.select().from(tripAwardWinners).where(inArray(tripAwardWinners.awardId, awardIds))
    : [];
  const winnerMap = new Map(winners.map((w) => [w.awardId, w]));
  return awards.map((a) => ({ ...a, winner: winnerMap.get(a.id) ?? null }));
}

export async function createAward(data: InsertTripAward): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(tripAwards).values(data);
  return (result as any).insertId as number;
}

export async function updateAward(id: number, data: Partial<InsertTripAward>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tripAwards).set(data).where(eq(tripAwards.id, id));
}

export async function deleteAward(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(tripAwardWinners).where(eq(tripAwardWinners.awardId, id));
  await db.delete(tripAwards).where(eq(tripAwards.id, id));
}

export async function assignAwardWinner(
  awardId: number,
  tripPlayerId: number | null,
  groupPlayerId: number | null,
  displayName: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Upsert: delete existing winner for this award then insert new one
  await db.delete(tripAwardWinners).where(eq(tripAwardWinners.awardId, awardId));
  if (tripPlayerId !== null || groupPlayerId !== null) {
    await db.insert(tripAwardWinners).values({ awardId, tripPlayerId, groupPlayerId, displayName });
  }
}

// ─── Long Drive ───────────────────────────────────────────────────────────────

export async function getLongDriveLeaderboard(roundId: number): Promise<(LongDriveEntry & { playerName: string })[]> {
  const db = await getDb();
  if (!db) return [];
  const entries = await db
    .select()
    .from(longDriveEntries)
    .where(eq(longDriveEntries.roundId, roundId))
    .orderBy(desc(longDriveEntries.driveDistanceM));
  if (entries.length === 0) return [];
  const userIds = Array.from(new Set(entries.map((e) => e.userId)));
  const players = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds));
  const tps = await db.select({ userId: tripPlayers.userId, nickname: tripPlayers.nickname })
    .from(tripPlayers)
    .where(inArray(tripPlayers.userId, userIds));
  const nicknameMap = new Map(tps.map((t) => [t.userId, t.nickname]));
  const nameMap = new Map(players.map((p) => [p.id, p.name ?? `User ${p.id}`]));
  return entries.map((e) => ({
    ...e,
    playerName: nicknameMap.get(e.userId) ?? nameMap.get(e.userId) ?? `User ${e.userId}`,
  }));
}

export async function submitLongDriveEntry(
  roundId: number,
  userId: number,
  tripPlayerId: number,
  distanceToPinM: number,
  holeDistanceM: number
): Promise<{ driveDistanceM: number; isNewLeader: boolean; entryId: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const driveDistanceM = holeDistanceM - distanceToPinM;
  if (driveDistanceM <= 0) throw new Error("Drive distance must be positive (distanceToPin must be less than hole distance)");

  // Get current leader
  const [currentLeader] = await db
    .select()
    .from(longDriveEntries)
    .where(and(eq(longDriveEntries.roundId, roundId), eq(longDriveEntries.isLeader, true)))
    .limit(1);

  const isNewLeader = !currentLeader || driveDistanceM > currentLeader.driveDistanceM;

  // Rule: a new entry must beat the current round leader (not just the player's own previous entry).
  // Exception: if the player IS the current leader, allow them to update their own entry freely.
  if (currentLeader && currentLeader.userId !== userId && !isNewLeader) {
    throw new Error(
      `DOES_NOT_BEAT_LEADER:${currentLeader.driveDistanceM}`
    );
  }

  // Remove previous entry by this user for this round (one entry per player)
  await db.delete(longDriveEntries).where(
    and(eq(longDriveEntries.roundId, roundId), eq(longDriveEntries.userId, userId))
  );

  // If new leader, clear old leader flag
  if (isNewLeader && currentLeader) {
    await db.update(longDriveEntries).set({ isLeader: false }).where(eq(longDriveEntries.id, currentLeader.id));
  }

  const [result] = await db.insert(longDriveEntries).values({
    roundId,
    tripPlayerId,
    userId,
    distanceToPinM,
    holeDistanceM,
    driveDistanceM,
    isLeader: isNewLeader,
    broadcastSent: false,
  });
  const entryId = (result as any).insertId as number;
  return { driveDistanceM, isNewLeader, entryId };
}

export async function markLongDriveBroadcast(entryId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(longDriveEntries).set({ broadcastSent: true }).where(eq(longDriveEntries.id, entryId));
}

export async function getLongDriveLeader(roundId: number): Promise<(LongDriveEntry & { playerName: string }) | null> {
  const db = await getDb();
  if (!db) return null;
  const [entry] = await db
    .select()
    .from(longDriveEntries)
    .where(and(eq(longDriveEntries.roundId, roundId), eq(longDriveEntries.isLeader, true)))
    .limit(1);
  if (!entry) return null;
  const [player] = await db.select({ name: users.name }).from(users).where(eq(users.id, entry.userId)).limit(1);
  const [tp] = await db.select({ nickname: tripPlayers.nickname }).from(tripPlayers).where(eq(tripPlayers.userId, entry.userId)).limit(1);
  const playerName = tp?.nickname ?? player?.name ?? `User ${entry.userId}`;
  return { ...entry, playerName };
}

// ─── Ambrose DB Helpers ───────────────────────────────────────────────────────

export async function upsertAmbroseScore(data: {
  roundId: number;
  groupId: number;
  holeId: number;
  holeNumber: number;
  grossScore: number;
  netScore: number;
  stablefordPoints: number;
  selectedDriveUserId?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Check if a score already exists for this group/hole/round
  const existing = await db
    .select({ id: ambroseScores.id })
    .from(ambroseScores)
    .where(
      and(
        eq(ambroseScores.roundId, data.roundId),
        eq(ambroseScores.groupId, data.groupId),
        eq(ambroseScores.holeId, data.holeId)
      )
    )
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(ambroseScores)
      .set({
        grossScore: data.grossScore,
        netScore: data.netScore,
        stablefordPoints: data.stablefordPoints,
        selectedDriveUserId: data.selectedDriveUserId ?? null,
      })
      .where(eq(ambroseScores.id, existing[0].id));
  } else {
    await db.insert(ambroseScores).values({
      roundId: data.roundId,
      groupId: data.groupId,
      holeId: data.holeId,
      holeNumber: data.holeNumber,
      grossScore: data.grossScore,
      netScore: data.netScore,
      stablefordPoints: data.stablefordPoints,
      selectedDriveUserId: data.selectedDriveUserId ?? null,
    });
  }
}

export async function getAmbroseScoresByGroup(
  roundId: number,
  groupId: number
): Promise<AmbroseScore[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ambroseScores)
    .where(
      and(eq(ambroseScores.roundId, roundId), eq(ambroseScores.groupId, groupId))
    );
}

export async function getAmbroseLeaderboard(roundId: number): Promise<
  {
    groupId: number;
    teamName: string;
    teamEmoji: string | null;
    players: { userId: number; name: string }[];
    holesPlayed: number;
    totalGross: number;
    totalNet: number;
    totalStableford: number;
    position: number;
  }[]
> {
  const db = await getDb();
  if (!db) return [];

  // Get all groups for this round
  const roundGroups = await db
    .select()
    .from(groups)
    .where(eq(groups.roundId, roundId));

  if (roundGroups.length === 0) return [];

  const results = await Promise.all(
    roundGroups.map(async (g) => {
      // Get all ambrose scores for this group
      const groupScores = await db
        .select()
        .from(ambroseScores)
        .where(
          and(eq(ambroseScores.roundId, roundId), eq(ambroseScores.groupId, g.id))
        );

      // Get players in this group
      const gPlayers = await db
        .select({
          userId: groupPlayers.userId,
          teamName: groupPlayers.teamName,
          teamEmoji: groupPlayers.teamEmoji,
        })
        .from(groupPlayers)
        .where(eq(groupPlayers.groupId, g.id));

            // Get player names
      const playerIds = gPlayers.filter((p) => p.userId !== null).map((p) => p.userId as number);
      const playerNames =
        playerIds.length > 0
          ? await db
              .select({ id: users.id, name: users.name })
              .from(users)
              .where(inArray(users.id, playerIds))
          : [];
      const teamName =
        gPlayers.find((p) => p.teamName)?.teamName ?? g.name;
      const teamEmoji = gPlayers.find((p) => p.teamEmoji)?.teamEmoji ?? null;
      const totalGross = groupScores.reduce((s, r) => s + r.grossScore, 0);
      const totalNet = groupScores.reduce((s, r) => s + r.netScore, 0);
      const totalStableford = groupScores.reduce(
        (s, r) => s + r.stablefordPoints,
        0
      );
      return {
        groupId: g.id,
        teamName,
        teamEmoji,
        players: playerIds.filter((uid) => uid !== null).map((uid) => ({
          userId: uid as number,
          name: playerNames.find((u) => u.id === uid)?.name ?? `Player ${uid}`,
        })),
        holesPlayed: groupScores.length,
        totalGross,
        totalNet,
        totalStableford,
      };
    })
  );

  // Sort by totalNet ascending (lowest net wins), then assign positions
  const sorted = results
    .filter((r) => r.holesPlayed > 0)
    .sort((a, b) => a.totalNet - b.totalNet);
  const noScores = results.filter((r) => r.holesPlayed === 0);

  return [
    ...sorted.map((r, i) => ({ ...r, position: i + 1 })),
    ...noScores.map((r, i) => ({ ...r, position: sorted.length + i + 1 })),
  ];
}

export async function getTripAmbroseLeaderboard(tripId: number): Promise<
  {
    teamKey: string;
    teamName: string;
    teamEmoji: string | null;
    players: { userId: number; name: string }[];
    roundsPlayed: number;
    cumulativeNet: number;
    cumulativeStableford: number;
    position: number;
  }[]
> {
  const db = await getDb();
  if (!db) return [];

  // Get all Ambrose-enabled rounds for this trip
  const ambroseRounds = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.tripId, tripId), eq(rounds.ambroseEnabled, true)));

  if (ambroseRounds.length === 0) return [];

  // Aggregate per-group across all rounds
  const teamMap = new Map<
    string,
    {
      teamName: string;
      teamEmoji: string | null;
      players: { userId: number; name: string }[];
      roundsPlayed: number;
      cumulativeNet: number;
      cumulativeStableford: number;
    }
  >();

  for (const round of ambroseRounds) {
    const roundGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.roundId, round.id));

    for (const g of roundGroups) {
      const groupScores = await db
        .select()
        .from(ambroseScores)
        .where(
          and(eq(ambroseScores.roundId, round.id), eq(ambroseScores.groupId, g.id))
        );
      if (groupScores.length === 0) continue;

      const gPlayers = await db
        .select({
          userId: groupPlayers.userId,
          teamName: groupPlayers.teamName,
          teamEmoji: groupPlayers.teamEmoji,
        })
        .from(groupPlayers)
        .where(eq(groupPlayers.groupId, g.id));

      const playerIds = gPlayers.filter((p) => p.userId !== null).map((p) => p.userId as number).sort((a, b) => a - b);
      const teamKey = playerIds.join("-");
      const teamName = gPlayers.find((p) => p.teamName)?.teamName ?? g.name;
      const teamEmoji = gPlayers.find((p) => p.teamEmoji)?.teamEmoji ?? null;

      const playerNames =
        playerIds.length > 0
          ? await db
              .select({ id: users.id, name: users.name })
              .from(users)
              .where(inArray(users.id, playerIds))
          : [];

      const existing = teamMap.get(teamKey);
      const totalNet = groupScores.reduce((s, r) => s + r.netScore, 0);
      const totalStableford = groupScores.reduce(
        (s, r) => s + r.stablefordPoints,
        0
      );

      if (existing) {
        existing.roundsPlayed += 1;
        existing.cumulativeNet += totalNet;
        existing.cumulativeStableford += totalStableford;
      } else {
        teamMap.set(teamKey, {
          teamName,
          teamEmoji,
          players: playerIds.map((uid) => ({
            userId: uid as number,
            name: playerNames.find((u) => u.id === uid)?.name ?? `Player ${uid}`,
          })),
          roundsPlayed: 1,
          cumulativeNet: totalNet,
          cumulativeStableford: totalStableford,
        });
      }
    }
  }

  const sorted = Array.from(teamMap.entries())
    .map(([teamKey, v]) => ({ teamKey, ...v }))
    .sort((a, b) => a.cumulativeNet - b.cumulativeNet);

  return sorted.map((t, i) => ({ ...t, position: i + 1 }));
}

// ─── Pennant Match Play Helpers ───────────────────────────────────────────────

/** Compute handicap strokes a player receives on a given hole.
 *  Uses the standard GA method: if handicap >= strokeIndex, player gets 1 stroke;
 *  if handicap >= strokeIndex + 18, player gets 2 strokes.
 */
function hcpStrokesOnHole(handicap: number, strokeIndex: number): number {
  let strokes = 0;
  if (handicap >= strokeIndex) strokes++;
  if (handicap >= strokeIndex + 18) strokes++;
  return strokes;
}

/** Compute net score for a player on a hole. */
function netScore(gross: number, handicap: number, strokeIndex: number): number {
  return gross - hcpStrokesOnHole(handicap, strokeIndex);
}

/** Determine hole winner for a singles or 4BBB fixture hole.
 *  For Stableford 4BBB: the higher Stableford points score from the pair is used.
 *  Returns 'teamA' | 'teamB' | 'halved'.
 */
function computeHoleWinner(
  gross1A: number, gross2A: number | null,
  gross1B: number, gross2B: number | null,
  hcp1A: number, hcp2A: number,
  hcp1B: number, hcp2B: number,
  strokeIndex: number,
  useHandicap: boolean,
  type: "singles" | "4bbb"
): "teamA" | "teamB" | "halved" {
  let scoreA: number;
  let scoreB: number;
  if (type === "4bbb") {
    const net1A = useHandicap ? netScore(gross1A, hcp1A, strokeIndex) : gross1A;
    const net2A = gross2A != null ? (useHandicap ? netScore(gross2A, hcp2A, strokeIndex) : gross2A) : 99;
    const net1B = useHandicap ? netScore(gross1B, hcp1B, strokeIndex) : gross1B;
    const net2B = gross2B != null ? (useHandicap ? netScore(gross2B, hcp2B, strokeIndex) : gross2B) : 99;
    scoreA = Math.min(net1A, net2A);
    scoreB = Math.min(net1B, net2B);
  } else {
    scoreA = useHandicap ? netScore(gross1A, hcp1A, strokeIndex) : gross1A;
    scoreB = useHandicap ? netScore(gross1B, hcp1B, strokeIndex) : gross1B;
  }
  if (scoreA < scoreB) return "teamA";
  if (scoreB < scoreA) return "teamB";
  return "halved";
}

export async function getPennantTeams(roundId: number) {
  const db = await getDb();
  if (!db) return [];
  const teams = await db.select().from(matchPlayTeams).where(eq(matchPlayTeams.roundId, roundId));
  const players = await db.select().from(matchPlayTeamPlayers).where(eq(matchPlayTeamPlayers.roundId, roundId));
  // Enrich with display names
  const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
  const allTripPlayers = await db.select({ id: tripPlayers.id, userId: tripPlayers.userId, nickname: tripPlayers.nickname, currentHandicap: tripPlayers.currentHandicap }).from(tripPlayers);
  const allInvites = await db.select({ id: tripInvites.id, name: tripInvites.name, startingHandicap: tripInvites.startingHandicap }).from(tripInvites);
  const userMap = new Map(allUsers.map(u => [u.id, u.name]));
  const tpMap = new Map(allTripPlayers.map(tp => [tp.id, tp]));
  const inviteMap = new Map(allInvites.map(inv => [inv.id, inv]));
  return teams.map(team => ({
    ...team,
    players: players
      .filter(p => p.teamId === team.id)
      .map(p => {
        const tp = p.tripPlayerId != null ? tpMap.get(p.tripPlayerId as number) : undefined;
        const inv = p.inviteId != null ? inviteMap.get(p.inviteId as number) : undefined;
        const name = tp?.nickname ?? (p.userId != null ? userMap.get(p.userId as number) : undefined) ?? inv?.name ?? `Player ?`;
        const handicap = tp?.currentHandicap ?? inv?.startingHandicap ?? 0;
        return { ...p, displayName: name, currentHandicap: handicap, registered: p.userId != null };
      }),
  }));
}

export async function createPennantTeam(roundId: number, name: string, emoji: string) {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  const [result] = await db.insert(matchPlayTeams).values({ roundId, name, emoji });
  return result.insertId;
}

export async function deletePennantTeam(teamId: number) {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  await db.delete(matchPlayTeamPlayers).where(eq(matchPlayTeamPlayers.teamId, teamId));
  await db.delete(matchPlayTeams).where(eq(matchPlayTeams.id, teamId));
}

export async function assignPlayerToTeam(teamId: number, roundId: number, userId: number | null, tripPlayerId: number | null, inviteId?: number) {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  // Remove from any existing team in this round first (by userId or inviteId)
  if (userId !== null) {
    await db.delete(matchPlayTeamPlayers).where(
      and(eq(matchPlayTeamPlayers.roundId, roundId), eq(matchPlayTeamPlayers.userId, userId))
    );
  } else if (inviteId) {
    await db.delete(matchPlayTeamPlayers).where(
      and(eq(matchPlayTeamPlayers.roundId, roundId), eq(matchPlayTeamPlayers.inviteId, inviteId))
    );
  }
  await db.insert(matchPlayTeamPlayers).values({ teamId, roundId, userId: userId ?? null, tripPlayerId: tripPlayerId ?? null, inviteId: inviteId ?? null });
}

export async function removePlayerFromTeam(roundId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  await db.delete(matchPlayTeamPlayers).where(
    and(eq(matchPlayTeamPlayers.roundId, roundId), eq(matchPlayTeamPlayers.userId, userId))
  );
}

export async function getPennantFixtures(roundId: number) {
  const db = await getDb();
  if (!db) return [];
  const fixtures = await db.select().from(matchPlayFixtures).where(eq(matchPlayFixtures.roundId, roundId));
  const holeResults = await db.select().from(matchPlayFixtureHoles);
  const teams = await getPennantTeams(roundId);
  const teamMap = new Map(teams.map(t => [t.id, t]));

  // Enrich with player names and handicaps
  const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
  const allTripPlayers = await db.select({ id: tripPlayers.id, userId: tripPlayers.userId, nickname: tripPlayers.nickname, currentHandicap: tripPlayers.currentHandicap }).from(tripPlayers);
  const userMap = new Map(allUsers.map(u => [u.id, u.name]));
  const tpMap = new Map(allTripPlayers.map(tp => [tp.userId, tp]));

  function playerName(userId: number) {
    const tp = tpMap.get(userId);
    return tp?.nickname ?? userMap.get(userId) ?? `Player ${userId}`;
  }
  function playerHcp(userId: number) {
    return tpMap.get(userId)?.currentHandicap ?? 0;
  }

  return fixtures.map(f => {
    const holes = holeResults.filter(h => h.fixtureId === f.id);
    const teamA = teamMap.get(f.teamAId);
    const teamB = teamMap.get(f.teamBId);
    return {
      ...f,
      teamAName: teamA?.name ?? "Team A",
      teamAEmoji: teamA?.emoji ?? "🏌️",
      teamBName: teamB?.name ?? "Team B",
      teamBEmoji: teamB?.emoji ?? "🏌️",
      player1AName: playerName(f.player1AId),
      player1AHcp: playerHcp(f.player1AId),
      player2AName: f.player2AId ? playerName(f.player2AId) : null,
      player2AHcp: f.player2AId ? playerHcp(f.player2AId) : null,
      player1BName: playerName(f.player1BId),
      player1BHcp: playerHcp(f.player1BId),
      player2BName: f.player2BId ? playerName(f.player2BId) : null,
      player2BHcp: f.player2BId ? playerHcp(f.player2BId) : null,
      holes,
    };
  });
}

export async function createPennantFixture(data: {
  roundId: number;
  teamAId: number;
  teamBId: number;
  type: "singles" | "4bbb";
  useHandicap: boolean;
  player1AId: number;
  player2AId?: number;
  player1BId: number;
  player2BId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  const [result] = await db.insert(matchPlayFixtures).values({
    roundId: data.roundId,
    teamAId: data.teamAId,
    teamBId: data.teamBId,
    type: data.type,
    useHandicap: data.useHandicap,
    player1AId: data.player1AId,
    player2AId: data.player2AId ?? null,
    player1BId: data.player1BId,
    player2BId: data.player2BId ?? null,
  });
  return result.insertId;
}

export async function deletePennantFixture(fixtureId: number) {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  await db.delete(matchPlayFixtureHoles).where(eq(matchPlayFixtureHoles.fixtureId, fixtureId));
  await db.delete(matchPlayFixtures).where(eq(matchPlayFixtures.id, fixtureId));
}

/** Submit gross scores for one hole in a fixture and recompute match status. */
export async function submitPennantHoleScores(
  fixtureId: number,
  holeNumber: number,
  gross1A: number,
  gross2A: number | null,
  gross1B: number,
  gross2B: number | null,
  holeStrokeIndex: number,
  holePar: number
) {
  const db = await getDb();
  if (!db) throw new Error("No DB");

  // Fetch fixture to get player IDs, useHandicap, type
  const [fixture] = await db.select().from(matchPlayFixtures).where(eq(matchPlayFixtures.id, fixtureId));
  if (!fixture) throw new Error("Fixture not found");

  // Fetch handicaps
  const allTripPlayers = await db.select({ userId: tripPlayers.userId, currentHandicap: tripPlayers.currentHandicap }).from(tripPlayers);
  const tpMap = new Map(allTripPlayers.map(tp => [tp.userId, tp.currentHandicap ?? 0]));
  const hcp1A = tpMap.get(fixture.player1AId) ?? 0;
  const hcp2A = fixture.player2AId ? (tpMap.get(fixture.player2AId) ?? 0) : 0;
  const hcp1B = tpMap.get(fixture.player1BId) ?? 0;
  const hcp2B = fixture.player2BId ? (tpMap.get(fixture.player2BId) ?? 0) : 0;

  const holeWinner = computeHoleWinner(
    gross1A, gross2A, gross1B, gross2B,
    hcp1A, hcp2A, hcp1B, hcp2B,
    holeStrokeIndex, fixture.useHandicap,
    fixture.type as "singles" | "4bbb"
  );

  // Upsert hole result
  const existing = await db.select().from(matchPlayFixtureHoles)
    .where(and(eq(matchPlayFixtureHoles.fixtureId, fixtureId), eq(matchPlayFixtureHoles.holeNumber, holeNumber)));
  if (existing.length > 0) {
    await db.update(matchPlayFixtureHoles)
      .set({ gross1A, gross2A: gross2A ?? null, gross1B, gross2B: gross2B ?? null, holeWinner })
      .where(and(eq(matchPlayFixtureHoles.fixtureId, fixtureId), eq(matchPlayFixtureHoles.holeNumber, holeNumber)));
  } else {
    await db.insert(matchPlayFixtureHoles).values({ fixtureId, holeNumber, gross1A, gross2A: gross2A ?? null, gross1B, gross2B: gross2B ?? null, holeWinner });
  }

  // Recompute running match status from all holes
  const allHoles = await db.select().from(matchPlayFixtureHoles).where(eq(matchPlayFixtureHoles.fixtureId, fixtureId));
  let status = 0; // positive = teamA up
  for (const h of allHoles) {
    if (h.holeWinner === "teamA") status++;
    else if (h.holeWinner === "teamB") status--;
  }
  const holesPlayed = allHoles.length;
  const holesRemaining = 18 - holesPlayed;

  // Check if match is decided (can't be caught)
  let result: "teamA" | "teamB" | "halved" | null = null;
  let endedOnHole: number | null = null;
  let matchStatus_final = "in_progress" as "pending" | "in_progress" | "complete";

  if (Math.abs(status) > holesRemaining) {
    result = status > 0 ? "teamA" : "teamB";
    endedOnHole = holeNumber;
    matchStatus_final = "complete";
  } else if (holesPlayed === 18) {
    result = status > 0 ? "teamA" : status < 0 ? "teamB" : "halved";
    endedOnHole = 18;
    matchStatus_final = "complete";
  } else {
    matchStatus_final = "in_progress";
  }

  await db.update(matchPlayFixtures)
    .set({ matchStatus: status, holesPlayed, result: result ?? undefined, endedOnHole: endedOnHole ?? undefined, status: matchStatus_final })
    .where(eq(matchPlayFixtures.id, fixtureId));
}

/** Get team score summary: actual (completed) + estimated (in-progress projected) points. */
export async function getPennantTeamScore(roundId: number) {
  const db = await getDb();
  if (!db) return [];
  const teams = await db.select().from(matchPlayTeams).where(eq(matchPlayTeams.roundId, roundId));
  const fixtures = await db.select().from(matchPlayFixtures).where(eq(matchPlayFixtures.roundId, roundId));

  return teams.map(team => {
    let actualPoints = 0;
    let estimatedPoints = 0;
    let fixturesComplete = 0;
    let fixturesInProgress = 0;

    for (const f of fixtures) {
      const isTeamA = f.teamAId === team.id;
      const isTeamB = f.teamBId === team.id;
      if (!isTeamA && !isTeamB) continue;

      if (f.status === "complete" && f.result) {
        const won = (isTeamA && f.result === "teamA") || (isTeamB && f.result === "teamB");
        const halved = f.result === "halved";
        actualPoints += won ? 1 : halved ? 0.5 : 0;
        fixturesComplete++;
      } else if (f.status === "in_progress") {
        // Estimate: project current match status
        const leading = (isTeamA && f.matchStatus > 0) || (isTeamB && f.matchStatus < 0);
        const tied = f.matchStatus === 0;
        estimatedPoints += leading ? 1 : tied ? 0.5 : 0;
        fixturesInProgress++;
      }
    }

    return {
      teamId: team.id,
      teamName: team.name,
      teamEmoji: team.emoji,
      actualPoints,
      estimatedPoints,
      totalFixtures: fixtures.filter(f => f.teamAId === team.id || f.teamBId === team.id).length,
      fixturesComplete,
      fixturesInProgress,
    };
  });
}

/**
 * Apply custom group assignments from the drag-to-edit preview.
 * Clears existing groups on the target round and creates new ones from the provided layout.
 */
export async function applyCustomGroupings(
  targetRoundId: number,
  tripId: number,
  groupLayout: { name: string; userIds: number[] }[]
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Clear existing groups
  const existingTarget = await db.select({ id: groups.id }).from(groups).where(eq(groups.roundId, targetRoundId));
  for (const g of existingTarget) {
    await db.delete(groupPlayers).where(eq(groupPlayers.groupId, g.id));
    await db.delete(groups).where(eq(groups.id, g.id));
  }
  // Create new groups from layout
  for (const layout of groupLayout) {
    const newGroupResult = await db.insert(groups).values({
      roundId: targetRoundId,
      tripId,
      name: layout.name,
      pairsLocked: false,
    });
    const newGroupId = (newGroupResult[0] as any).insertId as number;
    for (const userId of layout.userIds) {
      await db.insert(groupPlayers).values({
        groupId: newGroupId,
        userId,
        partnerId: null,
        pairId: null,
        scorerId: null,
      });
    }
  }
  return groupLayout.length;
}

// ─── All trip players + pending invites (for admin assignment) ────────────────
// Returns a unified list of registered players and pending invites for a trip.
// Pending invitees have userId=null and inviteId set; registered players have userId set.
export async function getAllTripPlayersAndInvites(tripId: number): Promise<{
  id: string; // "user-{userId}" or "invite-{inviteId}"
  userId: number | null;
  inviteId: number | null;
  tripPlayerId: number | null;
  name: string;
  nickname: string | null;
  currentHandicap: number;
  registered: boolean; // true = accepted invite / direct add; false = pending invite
}[]> {
  const db = await getDb();
  if (!db) return [];

  // Registered players
  const tpRows = await db
    .select({
      id: tripPlayers.id,
      userId: tripPlayers.userId,
      nickname: tripPlayers.nickname,
      currentHandicap: tripPlayers.currentHandicap,
      userName: users.name,
    })
    .from(tripPlayers)
    .leftJoin(users, eq(users.id, tripPlayers.userId))
    .where(eq(tripPlayers.tripId, tripId));

  // Pending invites (not yet accepted)
  const inviteRows = await db
    .select()
    .from(tripInvites)
    .where(and(eq(tripInvites.tripId, tripId), eq(tripInvites.status, "pending")));

  const result: {
    id: string;
    userId: number | null;
    inviteId: number | null;
    tripPlayerId: number | null;
    name: string;
    nickname: string | null;
    currentHandicap: number;
    registered: boolean;
  }[] = [];

  for (const tp of tpRows) {
    result.push({
      id: `user-${tp.userId}`,
      userId: tp.userId,
      inviteId: null,
      tripPlayerId: tp.id,
      name: tp.nickname ?? tp.userName ?? `Player ${tp.userId}`,
      nickname: tp.nickname,
      currentHandicap: tp.currentHandicap,
      registered: true,
    });
  }

  for (const inv of inviteRows) {
    // Skip if the invitee has already been added as a registered player
    if (inv.acceptedByUserId && tpRows.some((tp) => tp.userId === inv.acceptedByUserId)) continue;
    result.push({
      id: `invite-${inv.id}`,
      userId: null,
      inviteId: inv.id,
      tripPlayerId: null,
      name: inv.name,
      nickname: null,
      currentHandicap: inv.startingHandicap,
      registered: false,
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Smart Group Seeding ───────────────────────────────────────────────────────

export type SeedMethod = "random" | "handicap_mix" | "top_together" | "previous_round";
export type PairingMethod = "random" | "keep_last" | "seed_4bbb";
export type TeeOrder = "top_first" | "bottom_first";

/** Snake-draft an array of userIds into numGroups buckets. */
function snakeDraft(sorted: number[], numGroups: number): number[][] {
  const buckets: number[][] = Array.from({ length: numGroups }, () => []);
  for (let i = 0; i < sorted.length; i++) {
    const round = Math.floor(i / numGroups);
    const pos = i % numGroups;
    const idx = round % 2 === 0 ? pos : numGroups - 1 - pos;
    buckets[idx].push(sorted[i]);
  }
  return buckets;
}

/** Assign 4BBB pairs within each group bucket using the chosen pairing method. */
async function assignSmartPairs(
  buckets: number[][],
  pairingMethod: PairingMethod,
  sourceRoundId: number | null
): Promise<{ userId: number; partnerId: number | null }[][]> {
  const db = await getDb();
  if (!db) return buckets.map((b) => b.map((u) => ({ userId: u, partnerId: null })));

  if (pairingMethod === "keep_last" && sourceRoundId) {
    const srcGroups = await db.select({ id: groups.id }).from(groups).where(eq(groups.roundId, sourceRoundId));
    const srcGroupIds = srcGroups.map((g) => g.id);
    const srcGPs = srcGroupIds.length > 0
      ? await db.select().from(groupPlayers).where(inArray(groupPlayers.groupId, srcGroupIds))
      : [];
    const lastPartner = new Map<number, number>();
    for (const gp of srcGPs) {
      if (gp.userId && gp.partnerId) {
        lastPartner.set(gp.userId, gp.partnerId);
        lastPartner.set(gp.partnerId, gp.userId);
      }
    }
    return buckets.map((bucket) => {
      const assigned = new Set<number>();
      const result: { userId: number; partnerId: number | null }[] = [];
      for (const uid of bucket) {
        if (assigned.has(uid)) continue;
        const partner = lastPartner.get(uid);
        if (partner && bucket.includes(partner) && !assigned.has(partner)) {
          result.push({ userId: uid, partnerId: partner });
          result.push({ userId: partner, partnerId: uid });
          assigned.add(uid);
          assigned.add(partner);
        }
      }
      for (const uid of bucket) {
        if (!assigned.has(uid)) result.push({ userId: uid, partnerId: null });
      }
      return result;
    });
  }

  if (pairingMethod === "seed_4bbb" && sourceRoundId) {
    const srcGroups = await db.select({ id: groups.id }).from(groups).where(eq(groups.roundId, sourceRoundId));
    const srcGroupIds = srcGroups.map((g) => g.id);
    const srcGPs = srcGroupIds.length > 0
      ? await db.select().from(groupPlayers).where(inArray(groupPlayers.groupId, srcGroupIds))
      : [];
    const allUserIds = buckets.flat();
    const allScores = allUserIds.length > 0
      ? await db.select().from(scores).where(and(eq(scores.roundId, sourceRoundId), inArray(scores.userId, allUserIds)))
      : [];
    const scoreMap = new Map(allScores.map((s) => [`${s.userId}-${s.holeId}`, s.stablefordPoints ?? 0]));
    const holeIds = [...new Set(allScores.map((s) => s.holeId))];
    type PairScore = { u1: number; u2: number; total: number };
    const pairScores: PairScore[] = [];
    const seenPairs = new Set<string>();
    for (const gp of srcGPs) {
      if (!gp.userId || !gp.partnerId) continue;
      const key = [gp.userId, gp.partnerId].sort().join("-");
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      let total = 0;
      for (const hId of holeIds) {
        const s1 = scoreMap.get(`${gp.userId}-${hId}`) ?? 0;
        const s2 = scoreMap.get(`${gp.partnerId}-${hId}`) ?? 0;
        total += Math.max(s1, s2);
      }
      pairScores.push({ u1: gp.userId, u2: gp.partnerId, total });
    }
    pairScores.sort((a, b) => b.total - a.total);
    return buckets.map((bucket) => {
      const assigned = new Set<number>();
      const result: { userId: number; partnerId: number | null }[] = [];
      for (const ps of pairScores) {
        if (bucket.includes(ps.u1) && bucket.includes(ps.u2) && !assigned.has(ps.u1) && !assigned.has(ps.u2)) {
          result.push({ userId: ps.u1, partnerId: ps.u2 });
          result.push({ userId: ps.u2, partnerId: ps.u1 });
          assigned.add(ps.u1);
          assigned.add(ps.u2);
        }
      }
      for (const uid of bucket) {
        if (!assigned.has(uid)) result.push({ userId: uid, partnerId: null });
      }
      return result;
    });
  }

  // Default: random pairing within each group
  return buckets.map((bucket) => {
    const shuffled = [...bucket].sort(() => Math.random() - 0.5);
    const result: { userId: number; partnerId: number | null }[] = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      const u1 = shuffled[i];
      const u2 = shuffled[i + 1] ?? null;
      result.push({ userId: u1, partnerId: u2 });
      if (u2 !== null) result.push({ userId: u2, partnerId: u1 });
    }
    return result;
  });
}

/**
 * Preview smart seeding — dry-run, no DB writes.
 * Returns proposed GroupPreview[] with pairs assigned.
 */
export async function previewSmartSeed(
  tripId: number,
  seedMethod: SeedMethod,
  pairingMethod: PairingMethod,
  teeOrder: TeeOrder,
  groupSize: number,
  sourceRoundId: number | null
): Promise<GroupPreview[]> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const tpList = await db
    .select({ userId: tripPlayers.userId, nickname: tripPlayers.nickname, currentHandicap: tripPlayers.currentHandicap })
    .from(tripPlayers)
    .where(eq(tripPlayers.tripId, tripId));
  const allUserIds = tpList.map((t) => t.userId).filter(Boolean) as number[];
  if (allUserIds.length === 0) return [];

  const userList = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, allUserIds));
  const nameMap = new Map(userList.map((u) => [u.id, u.name]));
  const hcpMap = new Map(tpList.map((t) => [t.userId, t.currentHandicap ?? 0]));

  const numGroups = Math.max(1, Math.ceil(allUserIds.length / groupSize));
  let buckets: number[][];

  if (seedMethod === "handicap_mix") {
    // Sort by HCP ascending (lowest = best), snake-draft for balanced groups
    const sorted = [...allUserIds].sort((a, b) => (hcpMap.get(a) ?? 0) - (hcpMap.get(b) ?? 0));
    buckets = snakeDraft(sorted, numGroups);
  } else if (seedMethod === "top_together") {
    // Sort by HCP ascending, fill groups sequentially (best players together)
    const sorted = [...allUserIds].sort((a, b) => (hcpMap.get(a) ?? 0) - (hcpMap.get(b) ?? 0));
    buckets = Array.from({ length: numGroups }, () => [] as number[]);
    for (let i = 0; i < sorted.length; i++) {
      buckets[Math.floor(i / groupSize)].push(sorted[i]);
    }
  } else if (seedMethod === "previous_round") {
    const tripRoundList = await db
      .select({ id: rounds.id, status: rounds.status, roundDate: rounds.roundDate, individualScoringMode: rounds.individualScoringMode })
      .from(rounds)
      .where(eq(rounds.tripId, tripId))
      .orderBy(rounds.roundDate);
    const completedRounds = tripRoundList.filter((r) => r.status === "completed" || r.status === "active");
    const refRound = sourceRoundId
      ? completedRounds.find((r) => r.id === sourceRoundId) ?? completedRounds[completedRounds.length - 1]
      : completedRounds[completedRounds.length - 1];

    if (!refRound) {
      // No completed rounds — fall back to handicap mix
      const sorted = [...allUserIds].sort((a, b) => (hcpMap.get(a) ?? 0) - (hcpMap.get(b) ?? 0));
      buckets = snakeDraft(sorted, numGroups);
    } else {
      const roundScores = await db.select().from(scores).where(eq(scores.roundId, refRound.id));
      const scoreByUser = new Map<number, number>();
      for (const s of roundScores) {
        const val = refRound.individualScoringMode === "net_stroke" ? (s.netScore ?? 0) : (s.stablefordPoints ?? 0);
        scoreByUser.set(s.userId, (scoreByUser.get(s.userId) ?? 0) + val);
      }
      const sorted = [...allUserIds].sort((a, b) => {
        const sa = scoreByUser.get(a) ?? (refRound.individualScoringMode === "net_stroke" ? 999 : 0);
        const sb = scoreByUser.get(b) ?? (refRound.individualScoringMode === "net_stroke" ? 999 : 0);
        return refRound.individualScoringMode === "net_stroke" ? sa - sb : sb - sa;
      });
      buckets = snakeDraft(sorted, numGroups);
    }
  } else {
    // Random
    const shuffled = [...allUserIds].sort(() => Math.random() - 0.5);
    buckets = snakeDraft(shuffled, numGroups);
  }

  // Apply tee order
  if (teeOrder === "bottom_first") buckets = [...buckets].reverse();

  // Assign pairs within each group
  const pairedBuckets = await assignSmartPairs(buckets, pairingMethod, sourceRoundId);

  return pairedBuckets
    .filter((b) => b.length > 0)
    .map((bucket, gi) => ({
      name: `Group ${gi + 1}`,
      players: bucket.map((p) => ({
        userId: p.userId,
        displayName: tpList.find((t) => t.userId === p.userId)?.nickname ?? nameMap.get(p.userId) ?? `User ${p.userId}`,
        handicap: hcpMap.get(p.userId) ?? 0,
        partnerId: p.partnerId,
      })),
    }));
}

// ─── Trip-Level Pennant (Match Play) Leaderboard ─────────────────────────────
/**
 * Aggregate pennant team scores across all match-play-enabled rounds in a trip.
 * Teams are identified by name (stable across rounds).
 * Returns sorted by total actual points descending.
 */
export async function getTripPennantLeaderboard(tripId: number): Promise<{
  teamName: string;
  teamEmoji: string;
  wins: number;
  halves: number;
  losses: number;
  totalPoints: number;
  roundsPlayed: number;
  position: number;
}[]> {
  const db = await getDb();
  if (!db) return [];
  // Get all match-play-enabled rounds for this trip
  const mpRounds = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.tripId, tripId), eq(rounds.matchPlayEnabled, true)));
  if (mpRounds.length === 0) return [];

  // Aggregate per team name across rounds
  const teamMap = new Map<string, {
    teamEmoji: string;
    wins: number;
    halves: number;
    losses: number;
    totalPoints: number;
    roundsPlayed: number;
  }>();

  for (const round of mpRounds) {
    const teams = await db.select().from(matchPlayTeams).where(eq(matchPlayTeams.roundId, round.id));
    const fixtures = await db.select().from(matchPlayFixtures).where(eq(matchPlayFixtures.roundId, round.id));
    const hasAnyComplete = fixtures.some((f) => f.status === "complete");
    if (teams.length === 0) continue;

    for (const team of teams) {
      const teamFixtures = fixtures.filter((f) => f.teamAId === team.id || f.teamBId === team.id);
      let wins = 0, halves = 0, losses = 0;
      for (const f of teamFixtures) {
        if (f.status !== "complete" || !f.result) continue;
        const isA = f.teamAId === team.id;
        if (f.result === "halved") halves++;
        else if ((isA && f.result === "teamA") || (!isA && f.result === "teamB")) wins++;
        else losses++;
      }
      const points = wins + halves * 0.5;
      const existing = teamMap.get(team.name);
      if (existing) {
        existing.wins += wins;
        existing.halves += halves;
        existing.losses += losses;
        existing.totalPoints += points;
        if (hasAnyComplete) existing.roundsPlayed += 1;
      } else {
        teamMap.set(team.name, {
          teamEmoji: team.emoji,
          wins,
          halves,
          losses,
          totalPoints: points,
          roundsPlayed: hasAnyComplete ? 1 : 0,
        });
      }
    }
  }

  const sorted = Array.from(teamMap.entries())
    .map(([teamName, v]) => ({ teamName, ...v }))
    .sort((a, b) => b.totalPoints - a.totalPoints || b.wins - a.wins);
  return sorted.map((t, i) => ({ ...t, position: i + 1 }));
}

// ─── Auto-link pending invite slots to registered user ────────────────────────
/**
 * When a pending invitee accepts their invite and registers, promote their
 * placeholder slots in group_players and match_play_team_players from
 * inviteId → userId/tripPlayerId.
 */
export async function promoteInviteSlots(inviteId: number, userId: number, tripId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Find the tripPlayer record for this user+trip
  const tpRows = await db
    .select()
    .from(tripPlayers)
    .where(and(eq(tripPlayers.tripId, tripId), eq(tripPlayers.userId, userId)))
    .limit(1);
  const tripPlayerId = tpRows[0]?.id ?? null;

  // Promote group_players slots
  await db
    .update(groupPlayers)
    .set({ userId, inviteId: null })
    .where(eq(groupPlayers.inviteId, inviteId));

  // Promote match_play_team_players slots
  await db
    .update(matchPlayTeamPlayers)
    .set({ userId, inviteId: null, ...(tripPlayerId ? { tripPlayerId } : {}) })
    .where(eq(matchPlayTeamPlayers.inviteId, inviteId));
}
