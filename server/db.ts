import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
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
  tripPlayers,
  trips,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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

export async function createCourse(name: string, totalHoles: number = 18): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(courses).values({ name, totalHoles });
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

export async function createHoles(courseId: number, holeData: { holeNumber: number; par: number; strokeIndex: number }[]): Promise<void> {
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
  handicapMode?: "stableford" | "net_stroke";
  handicapBaseline?: number;
  handicapFactor?: number;
  handicapAutoAdjust?: boolean;
  location?: string;
  description?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(trips).values({
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    createdBy: data.createdBy,
    handicapMode: data.handicapMode ?? "stableford",
    handicapBaseline: data.handicapBaseline ?? 0,
    handicapFactor: data.handicapFactor ?? 0.25,
    handicapAutoAdjust: data.handicapAutoAdjust ?? true,
    ...(data.location !== undefined ? { location: data.location } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
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
    status: "scheduled",
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

export async function addPlayerToGroup(groupId: number, userId: number, partnerId?: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Check if player is already in another group for the same round
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
  await db
    .insert(groupPlayers)
    .values({ groupId, userId, partnerId: partnerId ?? null })
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

export async function getGroupPlayers(groupId: number, tripId?: number): Promise<(GroupPlayer & { user: User | undefined; nickname?: string | null })[]> {
  const db = await getDb();
  if (!db) return [];
  const players = await db.select().from(groupPlayers).where(eq(groupPlayers.groupId, groupId));
  const userIds = players.map((p) => p.userId);
  if (userIds.length === 0) return [];
  const userList = await db.select().from(users).where(inArray(users.id, userIds));
  const userMap = new Map(userList.map((u) => [u.id, u]));
  // Also fetch nicknames and handicaps from trip_players if tripId is provided
  let nicknameMap = new Map<number, string | null>();
  let handicapMap = new Map<number, number>();
  if (tripId) {
    const tpList = await db.select({ userId: tripPlayers.userId, nickname: tripPlayers.nickname, currentHandicap: tripPlayers.currentHandicap })
      .from(tripPlayers)
      .where(and(eq(tripPlayers.tripId, tripId), inArray(tripPlayers.userId, userIds)));
    nicknameMap = new Map(tpList.map((tp) => [tp.userId, tp.nickname ?? null]));
    handicapMap = new Map(tpList.map((tp) => [tp.userId, tp.currentHandicap]));
  }
  return players.map((p) => ({ ...p, user: userMap.get(p.userId), nickname: nicknameMap.get(p.userId) ?? null, currentHandicap: handicapMap.get(p.userId) ?? null }));
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
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .insert(scores)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        grossScore: data.grossScore,
        netScore: data.netScore,
        stablefordPoints: data.stablefordPoints,
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
  const result = await db.insert(achievements).values({ ...data, confirmed: false, broadcastSent: false });
  return (result[0] as any).insertId;
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
    rounds: { roundId: number; roundName: string; totalGross: number; totalNet: number; totalStableford: number; holesPlayed: number }[];
    cumulativeGross: number;
    cumulativeNet: number;
    cumulativeStableford: number;
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
          return {
            roundId: r.id,
            roundName: r.name,
            totalGross: playerScores.reduce((s, sc) => s + sc.grossScore, 0),
            totalNet: playerScores.reduce((s, sc) => s + sc.netScore, 0),
            totalStableford: playerScores.reduce((s, sc) => s + sc.stablefordPoints, 0),
            holesPlayed: playerScores.length,
          };
        })
      );
      return {
        userId: tp.userId,
        userName: tp.nickname ?? tp.user?.name ?? null,
        rounds: roundBreakdown,
        cumulativeGross: roundBreakdown.reduce((s, r) => s + r.totalGross, 0),
        cumulativeNet: roundBreakdown.reduce((s, r) => s + r.totalNet, 0),
        cumulativeStableford: roundBreakdown.reduce((s, r) => s + r.totalStableford, 0),
      };
    })
  );

  return result;
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

export async function sendTripMessage(data: { tripId: number; userId: number; message: string }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(tripMessages).values(data);
  return (result as any).insertId;
}

export async function getTripMessages(tripId: number, limit = 50, beforeId?: number): Promise<(TripMessage & { userName: string | null })[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: tripMessages.id,
      tripId: tripMessages.tripId,
      userId: tripMessages.userId,
      message: tripMessages.message,
      createdAt: tripMessages.createdAt,
      userName: users.name,
      userNickname: tripPlayers.nickname,
    })
    .from(tripMessages)
    .leftJoin(users, eq(tripMessages.userId, users.id))
    .leftJoin(tripPlayers, and(eq(tripPlayers.userId, tripMessages.userId), eq(tripPlayers.tripId, tripMessages.tripId)))
    .where(
      beforeId
        ? and(eq(tripMessages.tripId, tripId), lt(tripMessages.id, beforeId))
        : eq(tripMessages.tripId, tripId)
    )
    .orderBy(desc(tripMessages.id))
    .limit(limit);
  return rows.map((r) => ({ ...r, userName: r.userNickname ?? r.userName ?? null }));
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
    .set({ partnerId: player2UserId, pairId, scorerId: player2UserId })
    .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.userId, player1UserId)));
  // Update player2: partner = player1, scorer = player1
  await db
    .update(groupPlayers)
    .set({ partnerId: player1UserId, pairId, scorerId: player1UserId })
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
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
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
  // Determine pairId — assign 1 if no pairs yet, else 2
  const existingPairs = members.filter((m) => m.pairId !== null);
  const usedPairIds = Array.from(new Set(existingPairs.map((m) => m.pairId)));
  const pairId = (usedPairIds.length === 0 || (usedPairIds.length === 1 && !usedPairIds.includes(1))) ? 1 : 2;
  await setPair(groupId, requestingUserId, chosenPartnerId, pairId as 1 | 2);
  return { success: true };
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
    .where(and(eq(matchPlayResults.roundId, roundId), eq(matchPlayResults.groupId, groupId)))
    .limit(1);
  if (existing[0]) return { matchId: existing[0].id };
  const [result] = await db.insert(matchPlayResults).values({
    roundId,
    groupId,
    player1Id: pairA[0].userId,
    player1PartnerId: pairA[1].userId,
    player2Id: pairB[0].userId,
    player2PartnerId: pairB[1].userId,
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
    const userIds = members.map((m) => m.userId);
    const userList = await db.select().from(users).where(inArray(users.id, userIds));
    const userMap = new Map(userList.map((u) => [u.id, u]));
    const withUser = members.map((m) => ({ ...m, user: userMap.get(m.userId) }));
    const partner = myEntry.partnerId
      ? (withUser.find((m) => m.userId === myEntry.partnerId) ?? null)
      : null;
    const opponents = withUser.filter((m) => m.userId !== userId && m.userId !== myEntry.partnerId);
    return {
      groupId: grp.id,
      groupName: grp.name,
      pairsLocked: grp.pairsLocked,
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
    const gPlayers = await db.select().from(groupPlayers).where(eq(groupPlayers.groupId, groupId));
    if (gPlayers.length >= 2) {
      // Pair A: first two players
      await db.update(groupPlayers)
        .set({ pairId: 1, partnerId: gPlayers[1].userId, scorerId: gPlayers[1].userId })
        .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.userId, gPlayers[0].userId)));
      await db.update(groupPlayers)
        .set({ pairId: 1, partnerId: gPlayers[0].userId, scorerId: gPlayers[0].userId })
        .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.userId, gPlayers[1].userId)));
    }
    if (gPlayers.length >= 4) {
      // Pair B: third and fourth players
      await db.update(groupPlayers)
        .set({ pairId: 2, partnerId: gPlayers[3].userId, scorerId: gPlayers[3].userId })
        .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.userId, gPlayers[2].userId)));
      await db.update(groupPlayers)
        .set({ pairId: 2, partnerId: gPlayers[2].userId, scorerId: gPlayers[2].userId })
        .where(and(eq(groupPlayers.groupId, groupId), eq(groupPlayers.userId, gPlayers[3].userId)));
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
