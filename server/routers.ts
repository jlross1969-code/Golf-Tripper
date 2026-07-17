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
  updateTrip,
  upsertScore,
} from "./db";
import {
  buildAchievementMessage,
  calculate4BBBScore,
  calculateNewHandicap,
  calculateNetScore,
  calculateSkins,
  calculateStablefordPoints,
  detectAchievement,
  formatAchievementType,
} from "../shared/scoring";
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
          handicapBaseline: z.number().default(32),
          handicapFactor: z.number().default(0.25),
          handicapAutoAdjust: z.boolean().default(true),
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
        });
        return { tripId };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          handicapMode: z.enum(["stableford", "net_stroke"]).optional(),
          handicapBaseline: z.number().optional(),
          handicapFactor: z.number().optional(),
          handicapAutoAdjust: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateTrip(id, data as any);
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
          name: z.string().optional(),
          status: z.enum(["scheduled", "active", "completed"]).optional(),
          strokePlayEnabled: z.boolean().optional(),
          fourBBBEnabled: z.boolean().optional(),
          skinsEnabled: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateRound(id, data as any);
        return { success: true };
      }),
  }),

  // ─── Groups ───────────────────────────────────────────────────────────────

  groups: router({
    list: publicProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ input }) => {
        const groupList = await getGroupsByRound(input.roundId);
        const withPlayers = await Promise.all(
          groupList.map(async (g) => ({
            ...g,
            players: await getGroupPlayers(g.id),
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
      .mutation(async ({ input, ctx }) => {
        const trip = await getTrip(input.tripId);
        if (!trip) throw new TRPCError({ code: "NOT_FOUND" });
        if (!trip.handicapAutoAdjust) return { updated: 0 };

        const scorecard = await getRoundScorecard(input.roundId);
        let updated = 0;

        for (const player of scorecard) {
          const roundScore =
            trip.handicapMode === "stableford" ? player.totalStableford : player.totalNet;

          if (player.holesPlayed < 18) continue; // Only adjust for complete rounds

          const newHandicap = calculateNewHandicap(
            player.handicap,
            roundScore,
            trip.handicapBaseline,
            trip.handicapFactor
          );

          if (newHandicap !== player.handicap) {
            await recordHandicapChange({
              tripId: input.tripId,
              userId: player.userId,
              roundId: input.roundId,
              oldHandicap: player.handicap,
              newHandicap,
              roundScore,
              reason: `Auto-adjusted after round. Score: ${roundScore}, Baseline: ${trip.handicapBaseline}, Factor: ${trip.handicapFactor}`,
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

        const scorecard = await getRoundScorecard(input.roundId);
        const courseHoles = await getHolesByCourse(round.courseId);

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

        return { round, strokePlay, fourBBB: fourBBBResults, skins: skinsResults };
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
});

export type AppRouter = typeof appRouter;
