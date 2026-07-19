import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addPlayerToGroup,
  addPlayerToTrip,
  addSideMatchPlayer,
  confirmAchievement,
  createAchievement,
  createCourse,
  createGroup,
  createHoles,
  createNotification,
  createRound,
  createSideMatch,
  createTrip,
  deleteGroup,
  getAchievementsByTrip,
  getAllCourses,
  getAllTrips,
  getAllUsers,
  getCourse,
  getGroupPlayers,
  getGroupsByRound,
  getHandicapHistory,
  getHolesByCourse,
  getNotificationsByTrip,
  getRound,
  getRoundScorecard,
  getRoundsByTrip,
  getSideMatchPlayers,
  getSideMatchesByGroup,
  getSideMatchesByRound,
  getTrip,
  getTripLeaderboard,
  getTripPlayer,
  getTripPlayers,
  markAchievementBroadcast,
  recordHandicapChange,
  removePlayerFromTrip,
  updatePlayerHandicap,
  updateRound,
  updateSideMatchStatus,
  deleteTrip,
  updateTrip,
  upsertScore,
  setPlayerNickname,
  getNtpByRound,
  enableNtp,
  disableNtp,
  submitNtpEntry,
  setNtpWinner,
  setPair,
  selfPair,
  lockGroupPairs,
  unlockGroupPairs,
  getMyGroupForRound,
  recalcGroupMatch,
  removePlayerFromGroup,
  autoGroupRound,
} from "./db";
import {
  buildAchievementMessage,
  calculate4BBBScore,
  calculateAlternateShotHandicap,
  calculateMatchStatus,
  calculateNewHandicap,
  calculateNetScore,
  calculateSkins,
  calculateStablefordPoints,
  checkMatchOver,
  detectAchievement,
  formatAchievementType,
  matchPlayHoleResult,
} from "../shared/scoring";
import {
  createMatchPlayResult,
  getMatchPlayResult,
  getMatchPlayResultsByRound,
  getTripMessages,
  sendTripMessage,
  updateMatchPlayResult,
  createInvite,
  getInvitesByTrip,
  getInviteByToken,
  acceptInvite,
  revokeInvite,
  updateInvite,
  deleteInvite,
  revokeTripShareLink,
} from "./db";
import { TRPCError } from "@trpc/server";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Courses ──────────────────────────────────────────────────────────────

  courses: router({
    list: publicProcedure.query(() => getAllCourses()),

    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const course = await getCourse(input.id);
      const courseHoles = await getHolesByCourse(input.id);
      return { course, holes: courseHoles };
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          holes: z.array(
            z.object({
              holeNumber: z.number().min(1).max(18),
              par: z.number().min(3).max(5),
              strokeIndex: z.number().min(1).max(18),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const courseId = await createCourse(input.name, input.holes.length);
        await createHoles(courseId, input.holes);
        return { courseId };
      }),
  }),

  // ─── Trips ────────────────────────────────────────────────────────────────

  trips: router({
    list: publicProcedure.query(() => getAllTrips()),

    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getTrip(input.id)),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          startDate: z.string(),
          endDate: z.string(),
          handicapMode: z.enum(["stableford", "net_stroke"]).default("stableford"),
          handicapBaseline: z.number().default(0),
          handicapFactor: z.number().default(0.25),
          handicapAutoAdjust: z.boolean().default(true),
          location: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const tripId = await createTrip({
          name: input.name,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          createdBy: ctx.user.id,
          handicapMode: input.handicapMode,
          handicapBaseline: input.handicapBaseline,
          handicapFactor: input.handicapFactor,
          handicapAutoAdjust: input.handicapAutoAdjust,
          location: input.location,
          description: input.description,
        });
        return { tripId };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          handicapMode: z.enum(["stableford", "net_stroke"]).optional(),
          handicapBaseline: z.number().optional(),
          handicapFactor: z.number().optional(),
          handicapAutoAdjust: z.boolean().optional(),
          location: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, startDate, endDate, ...rest } = input;
        await updateTrip(id, {
          ...rest,
          ...(startDate ? { startDate: new Date(startDate) } : {}),
          ...(endDate ? { endDate: new Date(endDate) } : {}),
        } as any);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const result = await deleteTrip(input.id);
        if (!result.allowed) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.reason ?? "Cannot delete this trip." });
        }
        return { success: true };
      }),
  }),

  // ─── Players ──────────────────────────────────────────────────────────────

  players: router({
    allUsers: protectedProcedure.query(() => getAllUsers()),

    tripPlayers: publicProcedure
      .input(z.object({ tripId: z.number() }))
      .query(({ input }) => getTripPlayers(input.tripId)),

    add: adminProcedure
      .input(z.object({ tripId: z.number(), userId: z.number(), startingHandicap: z.number().min(0) }))
      .mutation(async ({ input }) => {
        await addPlayerToTrip(input.tripId, input.userId, input.startingHandicap);
        return { success: true };
      }),

    remove: adminProcedure
      .input(z.object({ tripId: z.number(), userId: z.number() }))
      .mutation(async ({ input }) => {
        await removePlayerFromTrip(input.tripId, input.userId);
        return { success: true };
      }),

    updateHandicap: adminProcedure
      .input(
        z.object({
          tripId: z.number(),
          userId: z.number(),
          newHandicap: z.number().min(0),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const tp = await getTripPlayer(input.tripId, input.userId);
        if (!tp) throw new TRPCError({ code: "NOT_FOUND" });
        await recordHandicapChange({
          tripId: input.tripId,
          userId: input.userId,
          oldHandicap: tp.currentHandicap,
          newHandicap: input.newHandicap,
          reason: input.reason ?? "Manual override by admin",
          isManual: true,
          adjustedBy: ctx.user.id,
        });
        await updatePlayerHandicap(input.tripId, input.userId, input.newHandicap);
        return { success: true };
      }),

    handicapHistory: publicProcedure
      .input(z.object({ tripId: z.number(), userId: z.number().optional() }))
      .query(({ input }) => getHandicapHistory(input.tripId, input.userId)),

    setNickname: protectedProcedure
      .input(z.object({
        tripId: z.number(),
        nickname: z.string().max(64).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify the user is a member of this trip
        const tp = await getTripPlayer(input.tripId, ctx.user.id);
        if (!tp) throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this trip" });
        await setPlayerNickname(input.tripId, ctx.user.id, input.nickname ?? null);
        return { success: true };
      }),

    // Player: set their own starting handicap (only allowed once, before any rounds are scored)
    setMyHandicap: protectedProcedure
      .input(z.object({
        tripId: z.number(),
        handicap: z.number().min(0).max(54),
      }))
      .mutation(async ({ input, ctx }) => {
        const tp = await getTripPlayer(input.tripId, ctx.user.id);
        if (!tp) throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this trip" });
        await recordHandicapChange({
          tripId: input.tripId,
          userId: ctx.user.id,
          oldHandicap: tp.currentHandicap,
          newHandicap: input.handicap,
          reason: "Set by player on join",
          isManual: true,
          adjustedBy: ctx.user.id,
        });
        await updatePlayerHandicap(input.tripId, ctx.user.id, input.handicap);
        return { success: true };
      }),
  }),

  // ─── Rounds ───────────────────────────────────────────────────────────────

  rounds: router({
    list: publicProcedure
      .input(z.object({ tripId: z.number() }))
      .query(({ input }) => getRoundsByTrip(input.tripId)),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const round = await getRound(input.id);
        if (!round) throw new TRPCError({ code: "NOT_FOUND" });
        const course = await getCourse(round.courseId);
        const courseHoles = await getHolesByCourse(round.courseId);
        return { round, course, holes: courseHoles };
      }),

    create: adminProcedure
      .input(
        z.object({
          tripId: z.number(),
          courseId: z.number(),
          name: z.string().min(1),
          roundDate: z.string(),
          strokePlayEnabled: z.boolean().default(true),
          fourBBBEnabled: z.boolean().default(false),
          skinsEnabled: z.boolean().default(false),
          matchPlayEnabled: z.boolean().default(false),
          alternateShotEnabled: z.boolean().default(false),
        })
      )
      .mutation(async ({ input }) => {
        const roundId = await createRound({
          ...input,
          roundDate: new Date(input.roundDate),
        });
        return { roundId };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          roundDate: z.string().optional(),
          courseId: z.number().optional(),
          status: z.enum(["scheduled", "active", "completed"]).optional(),
          strokePlayEnabled: z.boolean().optional(),
          fourBBBEnabled: z.boolean().optional(),
          skinsEnabled: z.boolean().optional(),
          matchPlayEnabled: z.boolean().optional(),
          alternateShotEnabled: z.boolean().optional(),
          dailyAdjustment: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, roundDate, ...rest } = input;
        await updateRound(id, {
          ...rest,
          ...(roundDate ? { roundDate: new Date(roundDate) } : {}),
        } as any);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await import("../drizzle/schema").then(() => null); // just for type reference
        // Delete all child records then the round
        const { getDb } = await import("./db");
        const database = await getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { groupPlayers: gp, groups: g, scores: sc, achievements: ach,
          nearestToPin: ntp, ntpEntries: ntpe, sideMatchPlayers: smp,
          sideMatches: sm, matchPlayResults: mpr } = await import("../drizzle/schema");
        const { eq, inArray } = await import("drizzle-orm");
        const tripGroups = await database.select({ id: g.id }).from(g).where(eq(g.roundId, input.id));
        const groupIds = tripGroups.map((gr: { id: number }) => gr.id);
        if (groupIds.length > 0) {
          await database.delete(gp).where(inArray(gp.groupId, groupIds));
          const smRows = await database.select({ id: sm.id }).from(sm).where(inArray(sm.groupId, groupIds));
          if (smRows.length > 0) await database.delete(smp).where(inArray(smp.sideMatchId, smRows.map((s: { id: number }) => s.id)));
          await database.delete(sm).where(inArray(sm.groupId, groupIds));
          await database.delete(mpr).where(inArray(mpr.groupId, groupIds));
          await database.delete(g).where(inArray(g.id, groupIds));
        }
        await database.delete(sc).where(eq(sc.roundId, input.id));
        await database.delete(ach).where(eq(ach.roundId, input.id));
        const ntpRows = await database.select({ id: ntp.id }).from(ntp).where(eq(ntp.roundId, input.id));
        if (ntpRows.length > 0) await database.delete(ntpe).where(inArray(ntpe.ntpId, ntpRows.map((n: { id: number }) => n.id)));
        await database.delete(ntp).where(eq(ntp.roundId, input.id));
        const { rounds: r } = await import("../drizzle/schema");
        await database.delete(r).where(eq(r.id, input.id));
        return { success: true };
      }),
  }),

  // ─── Groups ───────────────────────────────────────────────────────────────

  groups: router({
    list: publicProcedure
      .input(z.object({ roundId: z.number(), tripId: z.number().optional() }))
      .query(async ({ input }) => {
        const groupList = await getGroupsByRound(input.roundId);
        const withPlayers = await Promise.all(
          groupList.map(async (g) => ({
            ...g,
            players: await getGroupPlayers(g.id, input.tripId),
          }))
        );
        return withPlayers;
      }),

    create: adminProcedure
      .input(z.object({ roundId: z.number(), tripId: z.number(), name: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const groupId = await createGroup(input.roundId, input.tripId, input.name);
        return { groupId };
      }),

    addPlayer: adminProcedure
      .input(z.object({ groupId: z.number(), userId: z.number(), partnerId: z.number().optional() }))
      .mutation(async ({ input }) => {
        await addPlayerToGroup(input.groupId, input.userId, input.partnerId);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteGroup(input.groupId);
        return { success: true };
      }),

    // Admin: assign two players as a pair (pairId 1 = Pair A, 2 = Pair B)
    setPair: adminProcedure
      .input(z.object({
        groupId: z.number(),
        player1UserId: z.number(),
        player2UserId: z.number(),
        pairId: z.union([z.literal(1), z.literal(2)]),
      }))
      .mutation(async ({ input }) => {
        await setPair(input.groupId, input.player1UserId, input.player2UserId, input.pairId);
        return { success: true };
      }),

    // Player: self-pair with a chosen partner in the same group
    selfPair: protectedProcedure
      .input(z.object({ groupId: z.number(), chosenPartnerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const result = await selfPair(input.groupId, ctx.user.id, input.chosenPartnerId);
        if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        return { success: true };
      }),

    // Admin: lock pairs and auto-create the 4BBB matchplay record
    lockPairs: adminProcedure
      .input(z.object({ groupId: z.number(), roundId: z.number() }))
      .mutation(async ({ input }) => {
        const result = await lockGroupPairs(input.groupId, input.roundId);
        if (!result.matchId && result.error) throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        return { matchId: result.matchId };
      }),

    // Admin: unlock pairs so they can be reassigned
    unlockPairs: adminProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ input }) => {
        await unlockGroupPairs(input.groupId);
        return { success: true };
      }),

    // Admin: remove a player from a group (frees them for other groups)
    removePlayer: adminProcedure
      .input(z.object({ groupId: z.number(), userId: z.number() }))
      .mutation(async ({ input }) => {
        await removePlayerFromGroup(input.groupId, input.userId);
        return { success: true };
      }),

    // Admin: auto-create groups + pairs with handicap-biased snake pairing
    autoGroup: adminProcedure
      .input(z.object({
        roundId: z.number(),
        tripId: z.number(),
        groupCount: z.number().min(1).max(20).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await autoGroupRound(input.roundId, input.tripId, input.groupCount);
        return result;
      }),

    // Player/Public: get the current user's group info for a round (partner, opponents)
    getMyGroup: protectedProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        return getMyGroupForRound(input.roundId, ctx.user.id);
      }),
  }),

  // ─── Group Matches (4BBB Matchplay between pairs) ─────────────────────────
  groupMatch: router({
    // Get all group matches for a round with running status
    getByRound: publicProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ input }) => {
        const matches = await import("./db").then(db => db.getMatchPlayResultsByRound(input.roundId));
        // Enrich with player names
        const enriched = await Promise.all(matches.map(async (m) => {
          const { users: usersTable, tripPlayers: tp } = await import("../drizzle/schema");
          const { eq: eqOp, inArray: inArr } = await import("drizzle-orm");
          const { getDb } = await import("./db");
          const db = await getDb();
          if (!db) return { ...m, pairANames: [], pairBNames: [], holeResultsParsed: JSON.parse(m.holeResults || "[]") };
          const ids = [m.player1Id, m.player1PartnerId, m.player2Id, m.player2PartnerId].filter(Boolean) as number[];
          const userRows = await db.select().from(usersTable).where(inArr(usersTable.id, ids));
          const userMap = new Map(userRows.map(u => [u.id, u.name ?? `Player ${u.id}`]));
          return {
            ...m,
            pairANames: [m.player1Id, m.player1PartnerId].filter(Boolean).map(id => userMap.get(id!) ?? `Player ${id}`),
            pairBNames: [m.player2Id, m.player2PartnerId].filter(Boolean).map(id => userMap.get(id!) ?? `Player ${id}`),
            holeResultsParsed: JSON.parse(m.holeResults || "[]"),
          };
        }));
        return enriched;
      }),

    // Recalculate a group match from current scores (called after each score submission)
    recalc: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .mutation(async ({ input }) => {
        await recalcGroupMatch(input.matchId);
        return { success: true };
      }),
  }),

  // ─── Scores ───────────────────────────────────────────────────────────────

  scores: router({
    submit: protectedProcedure
      .input(
        z.object({
          roundId: z.number(),
          userId: z.number(),
          holeId: z.number(),
          holeNumber: z.number(),
          par: z.number(),
          strokeIndex: z.number(),
          grossScore: z.number().min(1),
          handicap: z.number().min(0),
        })
      )
      .mutation(async ({ input }) => {
        const netScore = calculateNetScore(input.grossScore, input.handicap, input.strokeIndex);
        const stablefordPoints = calculateStablefordPoints(netScore, input.par);

        await upsertScore({
          roundId: input.roundId,
          userId: input.userId,
          holeId: input.holeId,
          grossScore: input.grossScore,
          netScore,
          stablefordPoints,
        });

        // Detect achievement
        const achievementType = detectAchievement(input.grossScore, input.par);

        return {
          netScore,
          stablefordPoints,
          achievementType,
        };
      }),

    getScorecard: publicProcedure
      .input(z.object({ roundId: z.number() }))
      .query(({ input }) => getRoundScorecard(input.roundId)),

    getPlayerScorecard: publicProcedure
      .input(z.object({ roundId: z.number(), userId: z.number() }))
      .query(async ({ input }) => {
        const round = await getRound(input.roundId);
        if (!round) throw new TRPCError({ code: "NOT_FOUND" });
        const courseHoles = await getHolesByCourse(round.courseId);
        const playerScores = await import("./db").then((db) =>
          db.getScoresByRoundAndUser(input.roundId, input.userId)
        );
        const scoreMap = new Map(playerScores.map((s) => [s.holeId, s]));
        return courseHoles.map((h) => ({
          hole: h,
          score: scoreMap.get(h.id) ?? null,
        }));
      }),
  }),

  // ─── Achievements ─────────────────────────────────────────────────────────

  achievements: router({
    create: protectedProcedure
      .input(
        z.object({
          roundId: z.number(),
          userId: z.number(),
          holeId: z.number(),
          holeNumber: z.number(),
          par: z.number(),
          grossScore: z.number(),
          type: z.enum(["hole_in_one", "eagle", "birdie"]),
        })
      )
      .mutation(async ({ input }) => {
        const id = await createAchievement(input);
        return { achievementId: id };
      }),

    confirm: protectedProcedure
      .input(z.object({ achievementId: z.number(), tripId: z.number(), playerName: z.string() }))
      .mutation(async ({ input }) => {
        const achievement = await confirmAchievement(input.achievementId);
        if (!achievement) throw new TRPCError({ code: "NOT_FOUND" });

        const message = buildAchievementMessage(input.playerName, achievement.type, achievement.holeNumber);

        await createNotification({
          tripId: input.tripId,
          message,
          type: "achievement",
          achievementId: achievement.id,
        });

        await markAchievementBroadcast(achievement.id);

        return { success: true, message };
      }),

    listByTrip: publicProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ input }) => {
        const achievementList = await getAchievementsByTrip(input.tripId);
        return achievementList;
      }),
  }),

  // ─── Notifications ────────────────────────────────────────────────────────

  notifications: router({
    list: publicProcedure
      .input(z.object({ tripId: z.number(), limit: z.number().optional() }))
      .query(({ input }) => getNotificationsByTrip(input.tripId, input.limit ?? 50)),
  }),

  // ─── Handicap ─────────────────────────────────────────────────────────────

  handicap: router({
    recalculateAfterRound: adminProcedure
      .input(z.object({ roundId: z.number(), tripId: z.number() }))
      .mutation(async ({ input }) => {
        const trip = await getTrip(input.tripId);
        if (!trip) throw new TRPCError({ code: "NOT_FOUND" });
        if (!trip.handicapAutoAdjust) return { updated: 0 };

        // Fetch the round to get its dailyAdjustment
        const currentRound = await getRound(input.roundId);
        if (!currentRound) throw new TRPCError({ code: "NOT_FOUND", message: "Round not found" });
        const dailyAdj = (currentRound as any).dailyAdjustment ?? 0;

        // Effective baseline: trip baseline shifted by the round's daily adjustment
        // Positive dailyAdj = harder course → raise effective baseline (players score higher, HCP goes up less)
        // Negative dailyAdj = easier course → lower effective baseline
        const effectiveBaseline = trip.handicapBaseline + dailyAdj;

        // Determine the previous completed round (by date) to chain handicaps correctly
        const allRounds = await getRoundsByTrip(input.tripId);
        const completedBefore = allRounds
          .filter((r) => r.status === "completed" && r.id !== input.roundId)
          .sort((a, b) => new Date(a.roundDate).getTime() - new Date(b.roundDate).getTime());
        const prevRound = completedBefore.length > 0 ? completedBefore[completedBefore.length - 1] : null;

        const scorecard = await getRoundScorecard(input.roundId);
        let updated = 0;

        for (const player of scorecard) {
          const roundScore =
            trip.handicapMode === "stableford" ? player.totalStableford : player.totalNet;

          if (player.holesPlayed < 18) continue; // Only adjust for complete rounds

          // Chain from previous round's handicap result (not the initial handicap)
          // Look up the most recent handicap history entry for this player from the previous round
          let sourceHandicap = player.handicap; // fallback: current trip handicap
          if (prevRound) {
            const history = await getHandicapHistory(input.tripId, player.userId);
            const prevEntry = history.find((h) => h.roundId === prevRound.id);
            if (prevEntry) sourceHandicap = prevEntry.newHandicap;
          } else {
            // First round — use the player's starting handicap
            const tripPlayer = await getTripPlayer(input.tripId, player.userId);
            if (tripPlayer) sourceHandicap = tripPlayer.startingHandicap;
          }

          const newHandicap = calculateNewHandicap(
            sourceHandicap,
            roundScore,
            effectiveBaseline,
            trip.handicapFactor
          );

          if (newHandicap !== sourceHandicap) {
            await recordHandicapChange({
              tripId: input.tripId,
              userId: player.userId,
              roundId: input.roundId,
              oldHandicap: sourceHandicap,
              newHandicap,
              roundScore,
              reason: `Auto-adjusted after round. Score: ${roundScore}, Baseline: ${effectiveBaseline}${dailyAdj !== 0 ? ` (trip ${trip.handicapBaseline} ${dailyAdj > 0 ? "+" : ""}${dailyAdj} daily adj)` : ""}, Factor: ${trip.handicapFactor}`,
              isManual: false,
            });
            await updatePlayerHandicap(input.tripId, player.userId, newHandicap);
            updated++;
          }
        }

        return { updated };
      }),

    history: publicProcedure
      .input(z.object({ tripId: z.number(), userId: z.number().optional() }))
      .query(({ input }) => getHandicapHistory(input.tripId, input.userId)),
  }),

  // ─── Leaderboards ─────────────────────────────────────────────────────────

  leaderboard: router({
    daily: publicProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ input }) => {
        const round = await getRound(input.roundId);
        if (!round) throw new TRPCError({ code: "NOT_FOUND" });

        const trip = await getTrip(round.tripId);
        const scorecard = await getRoundScorecard(input.roundId);
        const courseHoles = await getHolesByCourse(round.courseId);

        // Effective baseline = trip baseline + round daily adjustment
        const tripBaseline = trip?.handicapBaseline ?? 0;
        const effectiveBaseline = tripBaseline === 0
          ? (trip?.handicapMode === "stableford" ? 34 : 70)
          : tripBaseline + (round.dailyAdjustment ?? 0);

        // Stroke Play leaderboard — sorted by net score ascending
        const strokePlay = [...scorecard]
          .filter((p) => p.holesPlayed > 0)
          .sort((a, b) => a.totalNet - b.totalNet)
          .map((p, i) => ({ ...p, position: i + 1 }));

        // 4BBB leaderboard — group by partnerships
        const groupList = await getGroupsByRound(input.roundId);
        const fourBBBResults: {
          teamName: string;
          player1: string;
          player2: string;
          totalBestBall: number;
          holesPlayed: number;
          position: number;
        }[] = [];

        if (round.fourBBBEnabled) {
          for (const group of groupList) {
            const gPlayers = await getGroupPlayers(group.id);
            const partnered = new Set<number>();

            for (const gp of gPlayers) {
              if (partnered.has(gp.userId) || !gp.partnerId) continue;
              partnered.add(gp.userId);
              partnered.add(gp.partnerId);

              const p1 = scorecard.find((s) => s.userId === gp.userId);
              const p2 = scorecard.find((s) => s.userId === gp.partnerId);
              if (!p1 || !p2) continue;

              let totalBestBall = 0;
              let holesPlayed = 0;

              for (const hole of courseHoles) {
                const s1 = p1.scores.find((s) => s.holeId === hole.id);
                const s2 = p2.scores.find((s) => s.holeId === hole.id);
                const bestBall = calculate4BBBScore(s1?.netScore ?? null, s2?.netScore ?? null);
                if (bestBall !== null) {
                  totalBestBall += bestBall;
                  holesPlayed++;
                }
              }

              fourBBBResults.push({
                teamName: `${p1.userName ?? "Player"} & ${p2.userName ?? "Player"}`,
                player1: p1.userName ?? "Player",
                player2: p2.userName ?? "Player",
                totalBestBall,
                holesPlayed,
                position: 0,
              });
            }
          }
          fourBBBResults.sort((a, b) => a.totalBestBall - b.totalBestBall);
          fourBBBResults.forEach((r, i) => (r.position = i + 1));
        }

        // Skins leaderboard
        const skinsResults: { userId: number; userName: string | null; skinsWon: number }[] = [];

        if (round.skinsEnabled) {
          const holeScores = courseHoles.map((h) => ({
            holeNumber: h.holeNumber,
            scores: scorecard
              .map((p) => {
                const s = p.scores.find((sc) => sc.holeId === h.id);
                return s ? { userId: p.userId, grossScore: s.grossScore } : null;
              })
              .filter(Boolean) as { userId: number; grossScore: number }[],
          }));

          const skinsMap = calculateSkins(holeScores);
          for (const [userId, skinsWon] of Array.from(skinsMap.entries())) {
            const player = scorecard.find((p) => p.userId === userId);
            skinsResults.push({ userId, userName: player?.userName ?? null, skinsWon });
          }
          skinsResults.sort((a, b) => b.skinsWon - a.skinsWon);
        }

        return { round, trip, strokePlay, fourBBB: fourBBBResults, skins: skinsResults, effectiveBaseline };
      }),

    trip: publicProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ input }) => {
        const leaderboard = await getTripLeaderboard(input.tripId);

        const strokePlay = [...leaderboard]
          .sort((a, b) => a.cumulativeNet - b.cumulativeNet)
          .map((p, i) => ({ ...p, position: i + 1 }));

        const stableford = [...leaderboard]
          .sort((a, b) => b.cumulativeStableford - a.cumulativeStableford)
          .map((p, i) => ({ ...p, position: i + 1 }));

        return { strokePlay, stableford };
      }),
  }),

  // ─── Side Matches ─────────────────────────────────────────────────────────

  sideMatches: router({
    list: publicProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ input }) => {
        const matches = await getSideMatchesByRound(input.roundId);
        return Promise.all(
          matches.map(async (m) => ({
            ...m,
            players: await getSideMatchPlayers(m.id),
          }))
        );
      }),

    listByGroup: publicProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        const matches = await getSideMatchesByGroup(input.groupId);
        return Promise.all(
          matches.map(async (m) => ({
            ...m,
            players: await getSideMatchPlayers(m.id),
          }))
        );
      }),

    create: protectedProcedure
      .input(
        z.object({
          groupId: z.number(),
          roundId: z.number(),
          type: z.enum(["match_play", "nassau", "skins", "stableford", "stroke"]),
          players: z.array(z.object({ userId: z.number(), partnerId: z.number().optional() })),
        })
      )
      .mutation(async ({ input }) => {
        const matchId = await createSideMatch({ groupId: input.groupId, roundId: input.roundId, type: input.type });
        for (const p of input.players) {
          await addSideMatchPlayer({ sideMatchId: matchId, userId: p.userId, partnerId: p.partnerId });
        }
        return { matchId };
      }),

    updateStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(["pending", "active", "completed"]) }))
      .mutation(async ({ input }) => {
        await updateSideMatchStatus(input.id, input.status);
        return { success: true };
      }),
  }),

  // ─── Match Play ─────────────────────────────────────────────────────────────
  matchPlay: router({
    create: protectedProcedure
      .input(
        z.object({
          roundId: z.number(),
          groupId: z.number(),
          player1Id: z.number(),
          player2Id: z.number(),
          player1PartnerId: z.number().optional(),
          player2PartnerId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const id = await createMatchPlayResult(input);
        return { id };
      }),

    getByRound: protectedProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ input }) => {
        return getMatchPlayResultsByRound(input.roundId);
      }),

    submitHoleResult: protectedProcedure
      .input(
        z.object({
          matchId: z.number(),
          holeNumber: z.number(),
          player1NetScore: z.number(),
          player2NetScore: z.number(),
          totalHoles: z.number().default(18),
          // For alternate shot: which player tees off next hole
          nextTeePlayer: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const match = await getMatchPlayResult(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });

        const existingResults: { holeNumber: number; result: "player1" | "player2" | "halved" }[] =
          JSON.parse(match.holeResults || "[]");

        // Remove any existing result for this hole (re-entry)
        const filtered = existingResults.filter((r) => r.holeNumber !== input.holeNumber);
        const holeResult = matchPlayHoleResult(input.player1NetScore, input.player2NetScore);
        filtered.push({ holeNumber: input.holeNumber, result: holeResult });
        filtered.sort((a, b) => a.holeNumber - b.holeNumber);

        const newStatus = calculateMatchStatus(filtered);
        const winner = checkMatchOver(newStatus, filtered.length, input.totalHoles);

        await updateMatchPlayResult(input.matchId, {
          holeResults: JSON.stringify(filtered),
          matchStatus: newStatus,
          winner: winner ?? "pending",
          endedOnHole: winner !== null ? input.holeNumber : undefined,
          nextTeePlayer: input.nextTeePlayer,
        });

        return {
          holeResult,
          matchStatus: newStatus,
          winner,
          holeResults: filtered,
        };
      }),

    calculateAlternateShotHcp: protectedProcedure
      .input(z.object({ player1Handicap: z.number(), player2Handicap: z.number() }))
      .query(({ input }) => ({
        combinedHandicap: calculateAlternateShotHandicap(input.player1Handicap, input.player2Handicap),
      })),
  }),

  // ─── Trip Chat ───────────────────────────────────────────────────────────────
  chat: router({
    getMessages: protectedProcedure
      .input(z.object({ tripId: z.number(), limit: z.number().default(50), beforeId: z.number().optional() }))
      .query(async ({ input }) => {
        const messages = await getTripMessages(input.tripId, input.limit, input.beforeId);
        return messages.reverse(); // Return oldest-first for display
      }),

    sendMessage: protectedProcedure
      .input(z.object({ tripId: z.number(), message: z.string().min(1).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const id = await sendTripMessage({
          tripId: input.tripId,
          userId: ctx.user.id,
          message: input.message.trim(),
        });
        return { id };
      }),
  }),
  // ─── Invites ─────────────────────────────────────────────────────────────────
  invites: router({
    // Admin: list all invites for a trip
    list: adminProcedure
      .input(z.object({ tripId: z.number() }))
      .query(({ input }) => getInvitesByTrip(input.tripId)),

    // Admin: create a new invite (adds player to roster)
    create: adminProcedure
      .input(z.object({
        tripId: z.number(),
        name: z.string().min(1).max(255),
        email: z.string().email(),
        startingHandicap: z.number().min(0).max(54).default(0),
        origin: z.string().url(),
      }))
      .mutation(async ({ input }) => {
        const { nanoid } = await import("nanoid");
        const token = nanoid(32);
        const id = await createInvite({
          tripId: input.tripId,
          name: input.name,
          email: input.email,
          startingHandicap: input.startingHandicap,
          token,
        });
        const inviteUrl = `${input.origin}/join/${token}`;
        return { id, token, inviteUrl };
      }),

    // Admin: update player details on an invite
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        startingHandicap: z.number().min(0).max(54).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateInvite(id, data);
        return { success: true };
      }),

    // Admin: revoke an invite
    revoke: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await revokeInvite(input.id);
        return { success: true };
      }),

    // Admin: delete an invite from the roster
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteInvite(input.id);
        return { success: true };
      }),

    // Admin: regenerate invite link (new token)
    regenerate: adminProcedure
      .input(z.object({ id: z.number(), origin: z.string().url() }))
      .mutation(async ({ input }) => {
        const { nanoid } = await import("nanoid");
        const token = nanoid(32);
        const db = await import("./db");
        const { getDb } = db;
        const drizzleDb = await getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { tripInvites } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await drizzleDb.update(tripInvites).set({ token, status: "pending", acceptedByUserId: null, acceptedAt: null }).where(eq(tripInvites.id, input.id));
        const inviteUrl = `${input.origin}/join/${token}`;
        return { token, inviteUrl };
      }),

    // Public: look up invite details by token (for the join landing page)
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const invite = await getInviteByToken(input.token);
        if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found or expired" });
        if (invite.status === "revoked") throw new TRPCError({ code: "FORBIDDEN", message: "This invite has been revoked" });
        // Return safe subset — no token in response
        const trip = await import("./db").then(m => m.getTrip(invite.tripId));
        return {
          inviteId: invite.id,
          tripId: invite.tripId,
          tripName: trip?.name ?? "Golf Trip",
          playerName: invite.name,
          email: invite.email,
          status: invite.status,
          startingHandicap: invite.startingHandicap,
        };
      }),

    // Admin: send invite email via Resend
    sendEmail: adminProcedure
      .input(z.object({
        inviteId: z.number(),
        origin: z.string().url(),
      }))
      .mutation(async ({ input }) => {
        const { sendInviteEmail } = await import("./email");
        const invite = await getInviteByToken("").then(() => null).catch(() => null);
        // Fetch the invite directly
        const db = await import("./db");
        const drizzleDb = await db.getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { tripInvites } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await drizzleDb.select().from(tripInvites).where(eq(tripInvites.id, input.inviteId)).limit(1);
        const inv = rows[0];
        if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
        if (inv.status === "revoked") throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot email a revoked invite" });
        // Fetch trip details for the email
        const trip = await db.getTrip(inv.tripId);
        if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
        const startDate = trip.startDate ? new Date(trip.startDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "";
        const endDate = trip.endDate ? new Date(trip.endDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "";
        const tripDates = startDate && endDate ? `${startDate} – ${endDate}` : trip.name;
        const inviteUrl = `${input.origin}/join/${inv.token}`;
        const result = await sendInviteEmail({
          toName: inv.name,
          toEmail: inv.email,
          tripName: trip.name,
          tripDates,
          startingHandicap: inv.startingHandicap,
          inviteUrl,
        });
        if (!result.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error ?? "Failed to send email" });
        return { success: true };
      }),

    // Protected: accept invite — called after the player logs in
    accept: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const invite = await getInviteByToken(input.token);
        if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
        if (invite.status === "revoked") throw new TRPCError({ code: "FORBIDDEN", message: "This invite has been revoked" });
        if (invite.status === "accepted") {
          // Already accepted — just ensure they are in trip_players
          const existing = await import("./db").then(m => m.getTripPlayer(invite.tripId, ctx.user!.id));
          if (existing) return { success: true, tripId: invite.tripId, alreadyJoined: true };
        }
        // Mark invite as accepted
        await acceptInvite(input.token, ctx.user.id);
        // Add to trip_players if not already there
        const existing = await import("./db").then(m => m.getTripPlayer(invite.tripId, ctx.user!.id));
        if (!existing) {
          await import("./db").then(m => m.addPlayerToTrip(invite.tripId, ctx.user!.id, invite.startingHandicap));
        }
        return { success: true, tripId: invite.tripId, alreadyJoined: false };
      }),
    // Admin: get or create a trip-level shareable link (open invite token on the trip row)
    getShareLink: adminProcedure
      .input(z.object({ tripId: z.number(), origin: z.string().url() }))
      .mutation(async ({ input }) => {
        const db = await import("./db");
        const drizzleDb = await db.getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { trips } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await drizzleDb.select().from(trips).where(eq(trips.id, input.tripId)).limit(1);
        const trip = rows[0];
        if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
        let token = trip.shareToken;
        if (!token) {
          const { nanoid } = await import("nanoid");
          token = nanoid(32);
          await drizzleDb.update(trips).set({ shareToken: token }).where(eq(trips.id, input.tripId));
        }
        return { shareUrl: `${input.origin}/join-trip/${input.tripId}?t=${token}` };
      }),
    // Public: accept a trip-level share link (no pre-registered invite needed)
    acceptShareLink: protectedProcedure
      .input(z.object({ tripId: z.number(), token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const db = await import("./db");
        const drizzleDb = await db.getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { trips } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await drizzleDb.select().from(trips).where(eq(trips.id, input.tripId)).limit(1);
        const trip = rows[0];
        if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
        if (trip.shareToken !== input.token) throw new TRPCError({ code: "FORBIDDEN", message: "Invalid share token" });
        const existing = await db.getTripPlayer(input.tripId, ctx.user.id);
        if (!existing) {
          await db.addPlayerToTrip(input.tripId, ctx.user.id, 0);
        }
        return { success: true, tripId: input.tripId, alreadyJoined: !!existing };
      }),
    // Admin: revoke the trip-level share link so old URLs stop working
    revokeShareLink: adminProcedure
      .input(z.object({ tripId: z.number() }))
      .mutation(async ({ input }) => {
        await revokeTripShareLink(input.tripId);
        return { success: true };
      }),
  }),
  // ─── Nearest to Pin ─────────────────────────────────────────────────────────
  ntp: router({
    // Public: get all NTP holes for a round with entries and current leader
    getByRound: publicProcedure
      .input(z.object({ roundId: z.number() }))
      .query(({ input }) => getNtpByRound(input.roundId)),

    // Admin: toggle NTP on/off for a specific hole in a round
    enableHole: adminProcedure
      .input(z.object({ roundId: z.number(), holeId: z.number(), holeNumber: z.number() }))
      .mutation(async ({ input }) => {
        const id = await enableNtp(input.roundId, input.holeId, input.holeNumber);
        return { id };
      }),

    disableHole: adminProcedure
      .input(z.object({ roundId: z.number(), holeId: z.number() }))
      .mutation(async ({ input }) => {
        await disableNtp(input.roundId, input.holeId);
        return { success: true };
      }),

    // Player: submit distance in cm for a NTP hole
    submitEntry: protectedProcedure
      .input(z.object({ ntpId: z.number(), distanceCm: z.number().min(0.1).max(10000) }))
      .mutation(async ({ ctx, input }) => {
        await submitNtpEntry(input.ntpId, ctx.user.id, input.distanceCm);
        return { success: true };
      }),

    // Admin: confirm winner for a NTP hole
    setWinner: adminProcedure
      .input(z.object({ ntpId: z.number(), winnerId: z.number(), winnerDistanceCm: z.number() }))
      .mutation(async ({ input }) => {
        await setNtpWinner(input.ntpId, input.winnerId, input.winnerDistanceCm);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
