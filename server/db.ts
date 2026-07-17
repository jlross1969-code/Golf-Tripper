import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Achievement,
  Course,
  Group,
  GroupPlayer,
  HandicapHistory,
  Hole,
  InsertUser,
  Notification,
  Round,
  Score,
  SideMatch,
  SideMatchPlayer,
  Trip,
  TripPlayer,
  User,
  achievements,
  courses,
  groupPlayers,
  groups,
  handicapHistory,
  holes,
  notifications,
  rounds,
  scores,
  sideMatchPlayers,
  sideMatches,
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
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(trips).values({
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    createdBy: data.createdBy,
    handicapMode: data.handicapMode ?? "stableford",
    handicapBaseline: data.handicapBaseline ?? 32,
    handicapFactor: data.handicapFactor ?? 0.25,
    handicapAutoAdjust: data.handicapAutoAdjust ?? true,
  });
  return (result[0] as any).insertId;
}

export async function getTrip(id: number): Promise<Trip | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
  return result[0];
}

export async function getAllTrips(): Promise<Trip[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trips).orderBy(desc(trips.startDate));
}

export async function updateTrip(id: number, data: Partial<Trip>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(trips).set(data).where(eq(trips.id, id));
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
  await db
    .insert(groupPlayers)
    .values({ groupId, userId, partnerId: partnerId ?? null })
    .onDuplicateKeyUpdate({ set: { partnerId: partnerId ?? null } });
}

export async function getGroupPlayers(groupId: number): Promise<(GroupPlayer & { user: User | undefined })[]> {
  const db = await getDb();
  if (!db) return [];
  const players = await db.select().from(groupPlayers).where(eq(groupPlayers.groupId, groupId));
  const userIds = players.map((p) => p.userId);
  if (userIds.length === 0) return [];
  const userList = await db.select().from(users).where(inArray(users.id, userIds));
  const userMap = new Map(userList.map((u) => [u.id, u]));
  return players.map((p) => ({ ...p, user: userMap.get(p.userId) }));
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

export async function getAchievementsByTrip(tripId: number): Promise<Achievement[]> {
  const db = await getDb();
  if (!db) return [];
  // Join through rounds to filter by tripId
  const roundList = await db.select({ id: rounds.id }).from(rounds).where(eq(rounds.tripId, tripId));
  const roundIds = roundList.map((r) => r.id);
  if (roundIds.length === 0) return [];
  return db
    .select()
    .from(achievements)
    .where(and(inArray(achievements.roundId, roundIds), eq(achievements.confirmed, true)))
    .orderBy(desc(achievements.createdAt));
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
      userName: tp.user?.name ?? null,
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
        userName: tp.user?.name ?? null,
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

import { matchPlayResults, tripMessages, MatchPlayResult, TripMessage } from "../drizzle/schema";

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
    })
    .from(tripMessages)
    .leftJoin(users, eq(tripMessages.userId, users.id))
    .where(
      beforeId
        ? and(eq(tripMessages.tripId, tripId), lt(tripMessages.id, beforeId))
        : eq(tripMessages.tripId, tripId)
    )
    .orderBy(desc(tripMessages.id))
    .limit(limit);
  return rows.map((r) => ({ ...r, userName: r.userName ?? null }));
}
