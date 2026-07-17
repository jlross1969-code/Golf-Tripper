import {
  boolean,
  float,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Courses ──────────────────────────────────────────────────────────────────

export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  totalHoles: int("totalHoles").default(18).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Course = typeof courses.$inferSelect;

export const holes = mysqlTable("holes", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  holeNumber: int("holeNumber").notNull(),
  par: int("par").notNull(),
  strokeIndex: int("strokeIndex").notNull(), // 1–18 difficulty ranking
});

export type Hole = typeof holes.$inferSelect;

// ─── Trips ────────────────────────────────────────────────────────────────────

export const trips = mysqlTable("trips", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  // Handicap adjustment config
  handicapMode: mysqlEnum("handicapMode", ["stableford", "net_stroke"]).default("stableford").notNull(),
  handicapBaseline: float("handicapBaseline").default(32).notNull(),
  handicapFactor: float("handicapFactor").default(0.25).notNull(),
  handicapAutoAdjust: boolean("handicapAutoAdjust").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Trip = typeof trips.$inferSelect;

// ─── Trip Players ─────────────────────────────────────────────────────────────

export const tripPlayers = mysqlTable("trip_players", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  userId: int("userId").notNull(),
  startingHandicap: float("startingHandicap").default(0).notNull(),
  currentHandicap: float("currentHandicap").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TripPlayer = typeof tripPlayers.$inferSelect;

// ─── Rounds ───────────────────────────────────────────────────────────────────

export const rounds = mysqlTable("rounds", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  courseId: int("courseId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  roundDate: timestamp("roundDate").notNull(),
  // Active formats for this round
  strokePlayEnabled: boolean("strokePlayEnabled").default(true).notNull(),
  fourBBBEnabled: boolean("fourBBBEnabled").default(false).notNull(),
  skinsEnabled: boolean("skinsEnabled").default(false).notNull(),
  status: mysqlEnum("status", ["scheduled", "active", "completed"]).default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Round = typeof rounds.$inferSelect;

// ─── Groups ───────────────────────────────────────────────────────────────────

export const groups = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  roundId: int("roundId").notNull(),
  tripId: int("tripId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Group = typeof groups.$inferSelect;

export const groupPlayers = mysqlTable("group_players", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  userId: int("userId").notNull(),
  // Partner for 4BBB — nullable if not playing 4BBB
  partnerId: int("partnerId"),
});

export type GroupPlayer = typeof groupPlayers.$inferSelect;

// ─── Scores ───────────────────────────────────────────────────────────────────

export const scores = mysqlTable("scores", {
  id: int("id").autoincrement().primaryKey(),
  roundId: int("roundId").notNull(),
  userId: int("userId").notNull(),
  holeId: int("holeId").notNull(),
  grossScore: int("grossScore").notNull(),
  netScore: int("netScore").notNull(),
  stablefordPoints: int("stablefordPoints").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Score = typeof scores.$inferSelect;

// ─── Achievements ─────────────────────────────────────────────────────────────

export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  roundId: int("roundId").notNull(),
  userId: int("userId").notNull(),
  holeId: int("holeId").notNull(),
  holeNumber: int("holeNumber").notNull(),
  par: int("par").notNull(),
  grossScore: int("grossScore").notNull(),
  type: mysqlEnum("type", ["hole_in_one", "eagle", "birdie"]).notNull(),
  confirmed: boolean("confirmed").default(false).notNull(),
  broadcastSent: boolean("broadcastSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Achievement = typeof achievements.$inferSelect;

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["achievement", "round_start", "round_complete", "handicap_update", "general"]).notNull(),
  achievementId: int("achievementId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

// ─── Handicap History ─────────────────────────────────────────────────────────

export const handicapHistory = mysqlTable("handicap_history", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  userId: int("userId").notNull(),
  roundId: int("roundId"),
  oldHandicap: float("oldHandicap").notNull(),
  newHandicap: float("newHandicap").notNull(),
  roundScore: float("roundScore"),
  reason: text("reason").notNull(),
  isManual: boolean("isManual").default(false).notNull(),
  adjustedBy: int("adjustedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HandicapHistory = typeof handicapHistory.$inferSelect;

// ─── Side Matches ─────────────────────────────────────────────────────────────

export const sideMatches = mysqlTable("side_matches", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  roundId: int("roundId").notNull(),
  type: mysqlEnum("type", ["match_play", "nassau", "skins", "stableford", "stroke"]).notNull(),
  status: mysqlEnum("status", ["pending", "active", "completed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SideMatch = typeof sideMatches.$inferSelect;

export const sideMatchPlayers = mysqlTable("side_match_players", {
  id: int("id").autoincrement().primaryKey(),
  sideMatchId: int("sideMatchId").notNull(),
  userId: int("userId").notNull(),
  partnerId: int("partnerId"),
  score: float("score"),
});

export type SideMatchPlayer = typeof sideMatchPlayers.$inferSelect;
