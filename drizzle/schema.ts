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
  // ─── Billing ──────────────────────────────────────────────────────────────
  // planTier controls which features the user can access across all trips.
  // All users default to 'free'. Upgrade to 'playerPremium' or 'clubPlan'
  // when a Stripe subscription is confirmed via webhook.
  planTier: mysqlEnum("planTier", ["free", "playerPremium", "clubPlan"]).default("free").notNull(),
  // subscriptionStatus mirrors the Stripe subscription state.
  // 'none' = never subscribed; 'active' = paid; 'trialing' = trial period;
  // 'cancelled' = lapsed. Gate checks use planTier, not this field directly.
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["none", "active", "trialing", "cancelled"]).default("none").notNull(),
  // Stripe customer ID — set when the user first initiates a payment.
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  // ──────────────────────────────────────────────────────────────────────────
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
  teeName: varchar("teeName", { length: 64 }),
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
  distanceMeters: int("distanceMeters"),
});

export type Hole = typeof holes.$inferSelect;

// ─── Trips ────────────────────────────────────────────────────────────────────

export const trips = mysqlTable("trips", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  // Handicap adjustment config
  // Tournament type — drives round format defaults and trip-level leaderboard behaviour
  // stableford: individual Stableford | stableford_4bbb: Stableford + 4BBB pairs
  // stroke: net stroke | stroke_4bbb: net stroke + 4BBB pairs
  // matchplay: pennant match play (team wins/losses) | ambrose: team scramble | alternate_shot: foursomes
  tournamentType: mysqlEnum("tournamentType", [
    "stableford",
    "stableford_4bbb",
    "stroke",
    "stroke_4bbb",
    "matchplay",
    "ambrose",
    "alternate_shot",
  ]).default("stableford").notNull(),
  handicapMode: mysqlEnum("handicapMode", ["stableford", "net_stroke"]).default("stableford").notNull(),
  handicapBaseline: float("handicapBaseline").default(0).notNull(),
  handicapFactor: float("handicapFactor").default(0.25).notNull(),
  handicapAutoAdjust: boolean("handicapAutoAdjust").default(true).notNull(),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  shareToken: varchar("shareToken", { length: 64 }),
  rules: text("rules"),
  logoUrl: varchar("logoUrl", { length: 512 }),
  // Optional colour scheme applied to players who have not chosen a personal appearance preference.
  defaultColorScheme: varchar("defaultColorScheme", { length: 16 }),
  createdBy: int("createdBy").notNull(),
  // ─── Billing ──────────────────────────────────────────────────────────────
  // planTier for this trip. 'free' = up to 8 players, core features only.
  // 'tripPass' = all premium features unlocked for this trip.
  // 'clubPlan' = inherited from organiser's club plan (no per-trip charge).
  tripPlanTier: mysqlEnum("tripPlanTier", ["free", "tripPass", "clubPlan"]).default("free").notNull(),
  // Set when the trip is upgraded — used for audit and expiry logic.
  planActivatedAt: timestamp("planActivatedAt"),
  // Stripe PaymentIntent ID for the trip pass purchase.
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  // ──────────────────────────────────────────────────────────────────────────
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Trip = typeof trips.$inferSelect;

// ─── Trip Appearance Schedules ─────────────────────────────────────────────────

/** A per-day appearance override, applied only when players have no personal preference. */
export const tripAppearanceSchedules = mysqlTable("trip_appearance_schedules", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  appearanceDate: timestamp("appearanceDate").notNull(),
  colorScheme: varchar("colorScheme", { length: 16 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TripAppearanceSchedule = typeof tripAppearanceSchedules.$inferSelect;

/** Admin-saved appearance presets that can be reused for event-day themes within a trip. */
export const tripAppearanceTemplates = mysqlTable("trip_appearance_templates", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  colorScheme: varchar("colorScheme", { length: 16 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TripAppearanceTemplate = typeof tripAppearanceTemplates.$inferSelect;

// ─── Trip Players ─────────────────────────────────────────────────────────────

export const tripPlayers = mysqlTable("trip_players", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  userId: int("userId").notNull(),
  startingHandicap: float("startingHandicap").default(0).notNull(),
  currentHandicap: float("currentHandicap").default(0).notNull(),
  // Player-settable preferred display name (set after accepting invite)
  nickname: varchar("nickname", { length: 64 }),
  // Profile photo stored in S3
  photoUrl: varchar("photoUrl", { length: 512 }),
  // Co-admin: can perform admin actions on this trip (max 4 per trip, assigned by owner)
  isCoAdmin: boolean("isCoAdmin").default(false).notNull(),
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
  matchPlayEnabled: boolean("matchPlayEnabled").default(false).notNull(),
  alternateShotEnabled: boolean("alternateShotEnabled").default(false).notNull(),
  status: mysqlEnum("status", ["scheduled", "active", "completed"]).default("scheduled").notNull(),
  // Per-round handicap adjustment applied before the formula (positive = harder course, negative = easier)
  dailyAdjustment: float("dailyAdjustment").default(0).notNull(),
  // Long Drive competition settings
  longDriveEnabled: boolean("longDriveEnabled").default(false).notNull(),
  longDriveHole: int("longDriveHole"),
  // Mercy rule: cap gross score at par + mercyRuleStrokes (default off, 5 over par)
  mercyRuleEnabled: boolean("mercyRuleEnabled").default(false).notNull(),
  mercyRuleStrokes: int("mercyRuleStrokes").default(5).notNull(),
  // Individual scoring mode for this round (overrides trip-level handicapMode)
  // 'stableford' = Stableford points, 'net_stroke' = Net Stroke Play
  individualScoringMode: mysqlEnum("individualScoringMode", ["stableford", "net_stroke"]).default("stableford").notNull(),
  // Ambrose team scramble format
  ambroseEnabled: boolean("ambroseEnabled").default(false).notNull(),
  ambroseTeamSize: int("ambroseTeamSize").default(4).notNull(),
  // Optional round-specific logo (falls back to trip logo if not set)
  logoUrl: varchar("logoUrl", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Round = typeof rounds.$inferSelect;

// ─── Groups ───────────────────────────────────────────────────────────────────

export const groups = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  roundId: int("roundId").notNull(),
  tripId: int("tripId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  // Whether pairs have been locked (no more self-pairing allowed once true)
  pairsLocked: boolean("pairsLocked").default(false).notNull(),
  // Tee time for this group (e.g. "08:30")
  teeTime: varchar("teeTime", { length: 10 }),
  // Starting hole number (1-18)
  startingHole: int("startingHole"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Group = typeof groups.$inferSelect;

export const groupPlayers = mysqlTable("group_players", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  // For registered players; null for pending-invite placeholder rows
  userId: int("userId"),
  // For pending invitees who haven't registered yet; null once they register
  inviteId: int("inviteId"),
  // Partner for 4BBB / matchplay pairing — nullable until paired
  partnerId: int("partnerId"),
  // pairId groups two players into Pair A (1) or Pair B (2) within the group
  pairId: int("pairId"),
  // Player selected to mark this player's scorecard; mutual selections create a pair
  selectedMarkerId: int("selectedMarkerId"),
  // The user who will enter scores for this player (cross-scoring)
  scorerId: int("scorerId"),
  // Optional team name for the pair (shared by both players in a pair)
  teamName: varchar("teamName", { length: 64 }),
  // Optional emoji mascot for the pair (single emoji, shared by both players)
  teamEmoji: varchar("teamEmoji", { length: 8 }),
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
  mercyCapped: boolean("mercyCapped").default(false).notNull(),
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

// ─── Match Play Results ───────────────────────────────────────────────────────
// Stores hole-by-hole match play result between two players/pairs in a round

export const matchPlayResults = mysqlTable("matchplay_results", {
  id: int("id").autoincrement().primaryKey(),
  roundId: int("roundId").notNull(),
  groupId: int("groupId").notNull(),
  // The two competitors (can be individual or 4BBB pairs)
  player1Id: int("player1Id").notNull(),
  player2Id: int("player2Id").notNull(),
  // partner IDs for alternate shot / 4BBB matchplay
  player1PartnerId: int("player1PartnerId"),
  player2PartnerId: int("player2PartnerId"),
  // Hole-by-hole results stored as JSON: [{hole:1, result:'player1'|'player2'|'halved'}]
  holeResults: text("holeResults").default("[]").notNull(),
  // Running match status: positive = player1 up, negative = player2 up, 0 = AS
  matchStatus: int("matchStatus").default(0).notNull(),
  // Final result
  winner: mysqlEnum("winner", ["player1", "player2", "halved", "pending"]).default("pending").notNull(),
  // How the match ended
  endedOnHole: int("endedOnHole"),
  // Alternate shot: whose turn it is to tee off next hole
  nextTeePlayer: int("nextTeePlayer"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MatchPlayResult = typeof matchPlayResults.$inferSelect;

// ─── Trip Chat Messages ───────────────────────────────────────────────────────

export const tripMessages = mysqlTable("trip_messages", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  userId: int("userId").notNull(),
  message: text("message").notNull(),
  imageUrl: varchar("imageUrl", { length: 1024 }),
  imageKey: varchar("imageKey", { length: 1024 }),
  imageAlt: varchar("imageAlt", { length: 180 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TripMessage = typeof tripMessages.$inferSelect;

export const tripMessageMentions = mysqlTable("trip_message_mentions", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  messageId: int("messageId").notNull(),
  mentionedUserId: int("mentionedUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TripMessageMention = typeof tripMessageMentions.$inferSelect;

export const tripMessageAttachments = mysqlTable("trip_message_attachments", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(),
  imageUrl: varchar("imageUrl", { length: 1024 }).notNull(),
  imageKey: varchar("imageKey", { length: 1024 }).notNull(),
  imageAlt: varchar("imageAlt", { length: 180 }),
  caption: varchar("caption", { length: 240 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  isRemoved: boolean("isRemoved").default(false).notNull(),
  removedAt: timestamp("removedAt"),
  removedByUserId: int("removedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TripMessageAttachment = typeof tripMessageAttachments.$inferSelect;

export const tripMessageReactions = mysqlTable("trip_message_reactions", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(),
  userId: int("userId").notNull(),
  emoji: varchar("emoji", { length: 16 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TripMessageReaction = typeof tripMessageReactions.$inferSelect;

export const tripMessageAttachmentReports = mysqlTable("trip_message_attachment_reports", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  attachmentId: int("attachmentId").notNull(),
  reporterUserId: int("reporterUserId").notNull(),
  reason: varchar("reason", { length: 600 }),
  status: mysqlEnum("status", ["open", "dismissed", "removed"]).default("open").notNull(),
  resolvedAt: timestamp("resolvedAt"),
  resolvedByUserId: int("resolvedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TripMessageAttachmentReport = typeof tripMessageAttachmentReports.$inferSelect;

export const tripMessageModerationAudit = mysqlTable("trip_message_moderation_audit", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  attachmentId: int("attachmentId").notNull(),
  actorUserId: int("actorUserId").notNull(),
  action: mysqlEnum("action", ["attachment_removed", "report_dismissed"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TripMessageModerationAudit = typeof tripMessageModerationAudit.$inferSelect;

// Aggregate-only photo action event records. No viewer identity is stored.
export const tripMessageAttachmentActionEvents = mysqlTable("trip_message_attachment_action_events", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  attachmentId: int("attachmentId").notNull(),
  action: mysqlEnum("action", ["download", "share"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TripMessageAttachmentActionEvent = typeof tripMessageAttachmentActionEvents.$inferSelect;

// ─── Golf Trip AI Assistant ───────────────────────────────────────────────────
// Saved assistant conversations are private to their owner. A conversation can
// optionally be tied to a trip so the assistant can include that trip's FAQs.

export const assistantConversations = mysqlTable("assistant_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tripId: int("tripId"),
  title: varchar("title", { length: 180 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssistantConversation = typeof assistantConversations.$inferSelect;

export const assistantMessages = mysqlTable("assistant_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssistantMessage = typeof assistantMessages.$inferSelect;

// Administrator-maintained answers that are supplied to the assistant whenever
// a user asks it a question in the relevant trip context.
export const tripFaqs = mysqlTable("trip_faqs", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  category: varchar("category", { length: 40 }).default("general").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  visibleFromRoundId: int("visibleFromRoundId"),
  question: varchar("question", { length: 300 }).notNull(),
  answer: text("answer").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TripFaq = typeof tripFaqs.$inferSelect;

// ─── Trip Invites ─────────────────────────────────────────────────────────────
// Pre-registered player roster with invite tokens for joining the trip

export const tripInvites = mysqlTable("trip_invites", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  // Player details entered by admin
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  // Unique token embedded in the invite link
  token: varchar("token", { length: 64 }).notNull().unique(),
  // Status of the invite
  status: mysqlEnum("status", ["pending", "accepted", "revoked"]).default("pending").notNull(),
  // Starting handicap pre-set by admin (optional)
  startingHandicap: float("startingHandicap").default(0).notNull(),
  // Linked user account once they accept
  acceptedByUserId: int("acceptedByUserId"),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TripInvite = typeof tripInvites.$inferSelect;
export type InsertTripInvite = typeof tripInvites.$inferInsert;

// ─── Nearest to Pin ───────────────────────────────────────────────────────────
// Admin enables NTP competition for specific holes in a round.
// Players submit their distance in cm; admin confirms the winner.

export const nearestToPin = mysqlTable("nearest_to_pin", {
  id: int("id").autoincrement().primaryKey(),
  roundId: int("roundId").notNull(),
  holeId: int("holeId").notNull(),
  holeNumber: int("holeNumber").notNull(),
  // Admin-confirmed winner
  winnerId: int("winnerId"),
  winnerDistanceCm: float("winnerDistanceCm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NearestToPin = typeof nearestToPin.$inferSelect;

export const ntpEntries = mysqlTable("ntp_entries", {
  id: int("id").autoincrement().primaryKey(),
  ntpId: int("ntpId").notNull(),
  userId: int("userId").notNull(),
  distanceCm: float("distanceCm").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

export type NtpEntry = typeof ntpEntries.$inferSelect;

// ─── Custom Awards ──────────────────────────────────────────────────────────────
// Admin-defined named prizes for top/bottom finishes in individual or team scoring

export const tripAwards = mysqlTable("trip_awards", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  // Optional: if set, award is for a specific round (daily); if null, it's overall
  roundId: int("roundId"),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  prize: varchar("prize", { length: 255 }),
  // individual or team (4BBB pair)
  category: mysqlEnum("category", ["individual", "team"]).default("individual").notNull(),
  // Which finishing position this award targets
  position: mysqlEnum("position", ["top1", "top2", "top3", "top4", "top5", "last"]).notNull(),
  // daily (round-specific) or overall (trip total)
  scope: mysqlEnum("scope", ["daily", "overall"]).default("overall").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TripAward = typeof tripAwards.$inferSelect;
export type InsertTripAward = typeof tripAwards.$inferInsert;

export const tripAwardWinners = mysqlTable("trip_award_winners", {
  id: int("id").autoincrement().primaryKey(),
  awardId: int("awardId").notNull(),
  // For individual awards
  tripPlayerId: int("tripPlayerId"),
  // For team awards (stores the groupPlayer id of one member of the pair)
  groupPlayerId: int("groupPlayerId"),
  // Denormalised for quick display
  displayName: varchar("displayName", { length: 255 }),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
});

export type TripAwardWinner = typeof tripAwardWinners.$inferSelect;

// ─── Long Drive ───────────────────────────────────────────────────────────────
// Admin enables long drive competition for a specific hole in a round.
// Players enter their rangefinder distance-to-pin; drive distance = hole distance - distanceToPin.

export const longDriveEntries = mysqlTable("long_drive_entries", {
  id: int("id").autoincrement().primaryKey(),
  roundId: int("roundId").notNull(),
  tripPlayerId: int("tripPlayerId").notNull(),
  userId: int("userId").notNull(),
  // Distance from ball to pin in metres (entered by player via rangefinder)
  distanceToPinM: int("distanceToPinM").notNull(),
  // Hole total distance in metres (from holes table at time of entry)
  holeDistanceM: int("holeDistanceM").notNull(),
  // Computed: holeDistanceM - distanceToPinM
  driveDistanceM: int("driveDistanceM").notNull(),
  // Whether this entry is the current leader
  isLeader: boolean("isLeader").default(false).notNull(),
  // Achievement broadcast sent for this entry becoming leader
  broadcastSent: boolean("broadcastSent").default(false).notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

export type LongDriveEntry = typeof longDriveEntries.$inferSelect;

// ─── Push Subscriptions ───────────────────────────────────────────────────────
// Stores Web Push API subscriptions so the server can push achievement alerts.

export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// ─── Ambrose Scores ───────────────────────────────────────────────────────────
// Stores team hole scores for Ambrose (scramble) rounds.
// One row per group per hole per round.

export const ambroseScores = mysqlTable("ambrose_scores", {
  id: int("id").autoincrement().primaryKey(),
  roundId: int("roundId").notNull(),
  groupId: int("groupId").notNull(),
  holeId: int("holeId").notNull(),
  holeNumber: int("holeNumber").notNull(),
  grossScore: int("grossScore").notNull(),
  netScore: int("netScore").notNull(),
  stablefordPoints: int("stablefordPoints").notNull(),
  // Which player's drive was selected for this hole
  selectedDriveUserId: int("selectedDriveUserId"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

export type AmbroseScore = typeof ambroseScores.$inferSelect;

// ─── Pennant Match Play ───────────────────────────────────────────────────────
// A round with matchPlayEnabled can have two teams. Admin assigns players to
// teams, then creates fixtures (singles or 4BBB) between players from each team.
// Results count toward a team score (wins = 1pt, halved = 0.5pt, loss = 0pt).

export const matchPlayTeams = mysqlTable("match_play_teams", {
  id: int("id").autoincrement().primaryKey(),
  roundId: int("roundId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  emoji: varchar("emoji", { length: 10 }).default("🏌️").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MatchPlayTeam = typeof matchPlayTeams.$inferSelect;
export type InsertMatchPlayTeam = typeof matchPlayTeams.$inferInsert;

export const matchPlayTeamPlayers = mysqlTable("match_play_team_players", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  roundId: int("roundId").notNull(),
  // For registered players; null for pending-invite placeholder rows
  userId: int("userId"),
  // For pending invitees who haven't registered yet; null once they register
  inviteId: int("inviteId"),
  tripPlayerId: int("tripPlayerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MatchPlayTeamPlayer = typeof matchPlayTeamPlayers.$inferSelect;

// A fixture is one match: singles (1v1) or 4BBB (pair vs pair)
export const matchPlayFixtures = mysqlTable("match_play_fixtures", {
  id: int("id").autoincrement().primaryKey(),
  roundId: int("roundId").notNull(),
  // Which team each side belongs to
  teamAId: int("teamAId").notNull(),
  teamBId: int("teamBId").notNull(),
  // Match type
  type: mysqlEnum("type", ["singles", "4bbb"]).default("singles").notNull(),
  // Whether handicap strokes are applied
  useHandicap: boolean("useHandicap").default(true).notNull(),
  // Side A players (player2AId null for singles)
  player1AId: int("player1AId").notNull(),
  player2AId: int("player2AId"),
  // Side B players (player2BId null for singles)
  player1BId: int("player1BId").notNull(),
  player2BId: int("player2BId"),
  // Running match status: positive = teamA up, negative = teamB up, 0 = AS
  matchStatus: int("matchStatus").default(0).notNull(),
  // Holes completed so far
  holesPlayed: int("holesPlayed").default(0).notNull(),
  // Final result (null = in progress or not started)
  result: mysqlEnum("result", ["teamA", "teamB", "halved"]),
  // Hole the match ended on (e.g. 15 means won 4&3)
  endedOnHole: int("endedOnHole"),
  status: mysqlEnum("status", ["pending", "in_progress", "complete"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MatchPlayFixture = typeof matchPlayFixtures.$inferSelect;
export type InsertMatchPlayFixture = typeof matchPlayFixtures.$inferInsert;

// Hole-by-hole gross scores for each fixture
export const matchPlayFixtureHoles = mysqlTable("match_play_fixture_holes", {
  id: int("id").autoincrement().primaryKey(),
  fixtureId: int("fixtureId").notNull(),
  holeNumber: int("holeNumber").notNull(),
  // Gross scores for each player (null = not yet entered)
  gross1A: int("gross1A"),
  gross2A: int("gross2A"),
  gross1B: int("gross1B"),
  gross2B: int("gross2B"),
  // Who won this hole after handicap applied (null = not yet determined)
  holeWinner: mysqlEnum("holeWinner", ["teamA", "teamB", "halved"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MatchPlayFixtureHole = typeof matchPlayFixtureHoles.$inferSelect;
