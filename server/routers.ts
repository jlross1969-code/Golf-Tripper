import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookie } from "cookie";
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
  createTripPayment,
  createTripScheduledAnnouncement,
  createTripFinancialLineItem,
  createTripActualExpense,
  createTripSupplier,
  createTripDocument,
  createTripTravelChecklistItem,
  createTripItineraryItem,
  createTripPaymentReminderStage,
  createRound,
  createSideMatch,
  createTrip,
  deleteGroup,
  getAchievementsByTrip,
  getAchievementsByPlayer,
  getAchievementsByRound,
  getAllCourses,
  getAllTrips,
  getAllTripPlayersAndInvites,
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
  getTripByPaymentReminderTaskUid,
  getTripPaymentReminderStages,
  getTripFinancialPlan,
  getTripSuppliers,
  getTripDocuments,
  getTripTravelChecklist,
  getTripItinerary,
  getTripPaymentSummary,
  getTripPayments,
  getTripScheduledAnnouncements,
  getTripLeaderboard,
  getTripFourBBBLeaderboard,
  getFourBBBPairScorecard,
  getAssistantConversations,
  createAssistantConversation,
  getAssistantConversation,
  getAssistantMessages,
  appendAssistantMessages,
  deleteAssistantConversation,
  getTripFaqs,
  getTripFaq,
  getVisibleTripFaqs,
  createTripFaq,
  updateTripFaq,
  deleteTripFaq,
  getTripPlayer,
  getTripPlayers,
  markAchievementBroadcast,
  recordHandicapChange,
  removePlayerFromTrip,
  updatePlayerHandicap,
  updateRound,
  updateSideMatchStatus,
  deleteTrip,
  deleteTripFinancialLineItem,
  deleteTripActualExpense,
  deleteTripSupplier,
  deleteTripDocument,
  deleteTripTravelChecklistItem,
  deleteTripItineraryItem,
  updateTrip,
  updateTripItineraryAssignments,
  setTripFinancialSettings,
  setTripPaymentReminderStageTask,
  setTripPlayerPrice,
  setTripTravelChecklistReminderTask,
  setTripSupplierInvoiceReminder,
  setTripSupplierInvoiceAttachment,
  updateTripSupplierPayment,
  getTripSupplierByInvoiceReminderTaskUid,
  markTripSupplierInvoiceReminderSent,
  approveTripActualExpense,
  toggleTripTravelChecklistCompletion,
  reviewTripPayment,
  setTripScheduledAnnouncementTask,
  getTripScheduledAnnouncementByTaskUid,
  getTripByCourseRevealTaskUid,
  markTripScheduledAnnouncementSent,
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
  recalcMatchesForPlayerScore,
  removePlayerFromGroup,
  autoGroupRound,
  getAwardsByTrip,
  createAward,
  updateAward,
  deleteAward,
  assignAwardWinner,
  getLongDriveLeaderboard,
  submitLongDriveEntry,
  markLongDriveBroadcast,
  upsertAmbroseScore,
  getAmbroseScoresByGroup,
  getAmbroseLeaderboard,
  getTripAmbroseLeaderboard,
  getPennantTeams,
  createPennantTeam,
  deletePennantTeam,
  assignPlayerToTeam,
  removePlayerFromTeam,
  getPennantFixtures,
  createPennantFixture,
  deletePennantFixture,
  submitPennantHoleScores,
  getPennantTeamScore,
  syncRoundsToTournamentType,
  roundFlagsFromTournamentType,
  getTripPennantLeaderboard,
  promoteInviteSlots,
  isCoAdminForTrip,
} from "./db";
import {
  buildAchievementMessage,
  calculate4BBBScore,
  calculate4BBBStablefordPoints,
  calculateAlternateShotHandicap,
  calculateAmbroseTeamHandicap,
  calculateAmbroseNetScore,
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
import { calculateCountback, compareCountback } from "../shared/countback";
import { extractCourseScorecard } from "./courseScorecardImport";
import { getImportedTeeNames, selectImportedTee } from "../shared/courseScorecardImport";
import {
  createMatchPlayResult,
  getMatchPlayResult,
  getMatchPlayResultsByRound,
  getTripMessages,
  sendTripMessage,
  getTripChatModerationAudit,
  getUnreadTripChatMentions,
  markTripChatMentionsRead,
  getPinnedTripMessages,
  setTripChatMessagePinned,
  updateTripChatMessage,
  softDeleteTripChatMessage,
  getDailySideMatchResults,
  getTripChatMessage,
  toggleTripMessageReaction,
  getTripChatAttachment,
  updateTripChatAttachmentCaption,
  createTripChatAttachmentReport,
  getTripChatAttachmentReports,
  removeTripChatAttachment,
  dismissTripChatAttachmentReport,
  recordTripChatPhotoAction,
  getTripChatPhotoActionSummary,
  getTripChatPhotoActionMonthlyTrend,
  getTripAppearanceSchedules,
  setTripAppearanceSchedule,
  deleteTripAppearanceSchedule,
  copyTripAppearanceSchedules,
  getTripAppearanceTemplates,
  createTripAppearanceTemplate,
  deleteTripAppearanceTemplate,
  updateMatchPlayResult,
  createInvite,
  getInvitesByTrip,
  getInviteByToken,
  acceptInvite,
  revokeInvite,
  updateInvite,
  deleteInvite,
  revokeTripShareLink,
  updateGroupSettings,
  setCoAdmin,
  getCoAdminCount,
  copyGroupingsToRound,
  reseedGroupsBy4BBB,
  reseedGroupsByIndividual,
  previewCopyGroupings,
  previewReseedBy4BBB,
  previewReseedByIndividual,
  applyCustomGroupings,
  previewSmartSeed,
  type SeedMethod,
  type PairingMethod,
  type TeeOrder,
} from "./db";
import { TRPCError } from "@trpc/server";
import { sendPushToTrip, sendPushToUsers } from "./webPush";
import { createHeartbeatJob, updateHeartbeatJob } from "./_core/heartbeat";
import { invokeLLM } from "./_core/llm";
import { recentGolfAssistantMessages } from "../shared/golfAssistant";
import { createAssistantConversationTitle, formatTripFaqContext } from "../shared/assistantEnhancements";
import { TRIP_FAQ_CATEGORIES } from "../shared/tripFaq";
import { isTripChatImageReference } from "../shared/tripChatAttachment";
import { canManageTripChatAttachment } from "../shared/tripChatAlbum";
import { APP_COLOR_SCHEME_IDS } from "../shared/appearance";
import { copyAppearanceDateToTrip } from "../shared/seasonalAppearanceTemplates";
import { normaliseTripChatMentionedUserIds } from "../shared/tripChatMention";
import { shouldHideTripCourses } from "../shared/mysteryCourse";
import { isFutureSchedule, toOneTimeUtcCron } from "../shared/tripSchedule";

const golfAssistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
});

const GOLF_TRIP_ASSISTANT_INSTRUCTIONS = `You are the Golf Trip Assistant for the Golf Trip App. Help players and administrators use this app, including trips, rounds, groups, scoring, Stableford, 4BBB best Stableford points, leaderboards, countback, handicaps, match play, side matches, Long Drive, NTP, scorecard imports, invitations, and PDFs.

For this app's Stableford 4BBB, each player earns their own Stableford points after handicap strokes, and the pair counts the higher points score on each hole. You can also answer general golf-rules questions clearly and practically. Golf-rules answers are general information only, not an official ruling. For competition-specific, exceptional, or disputed situations, state that the player should confirm the current Rules of Golf and ask the event committee for the official decision. Do not invent app features, scores, player data, or official rule references. If a request relies on a particular local rule or information not supplied, ask a brief clarifying question.

Use concise Australian English. Prefer short numbered steps where they aid clarity, but do not use Markdown emphasis. Do not provide legal, medical, gambling, financial, or account-security advice.`;

async function assertTripChatAccess(userId: number, tripId: number, isPlatformAdmin: boolean) {
  const trip = await getTrip(tripId);
  if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
  const player = await getTripPlayer(tripId, userId);
  if (!player && trip.createdBy !== userId && !isPlatformAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this trip" });
  return trip;
}

async function assertTripChatModerator(userId: number, tripId: number, isPlatformAdmin: boolean) {
  const trip = await assertTripChatAccess(userId, tripId, isPlatformAdmin);
  if (!isPlatformAdmin && trip.createdBy !== userId && !(await isCoAdminForTrip(userId, tripId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Trip admin access required" });
  }
  return trip;
}

async function assertTripFinancialManager(userId: number, tripId: number, isPlatformAdmin: boolean) {
  const trip = await getTrip(tripId);
  if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
  if (!isPlatformAdmin && trip.createdBy !== userId && trip.financialManagerUserId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Trip financial-manager access is required" });
  }
  return trip;
}

async function assertAssistantTripAccess(userId: number, tripId: number, isPlatformAdmin: boolean): Promise<void> {
  const trip = await getTrip(tripId);
  if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
  const player = await getTripPlayer(tripId, userId);
  if (!player && trip.createdBy !== userId && !isPlatformAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this trip's assistant context." });
  }
}

async function answerGolfAssistant(
  messages: { role: "user" | "assistant"; content: string }[],
  tripId?: number | null,
  scoreContext?: string,
  activeRoundId?: number | null,
): Promise<string> {
  const faqs = tripId ? await getVisibleTripFaqs(tripId, activeRoundId) : [];
  const response = await invokeLLM({
    model: "gpt-5-mini",
    maxTokens: 850,
    messages: [
      { role: "system", content: `${GOLF_TRIP_ASSISTANT_INSTRUCTIONS}${formatTripFaqContext(faqs)}${scoreContext ? `\n\nAuthoritative score context for this explanation:\n${scoreContext}` : ""}` },
      ...recentGolfAssistantMessages(messages),
    ],
  });
  const content = response.choices[0]?.message.content;
  const answer = typeof content === "string"
    ? content.trim()
    : content?.filter((part) => part.type === "text").map((part) => part.text).join("\n").trim();
  if (!answer) throw new Error("The assistant returned an empty answer.");
  return answer;
}

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

  assistant: router({
    ask: protectedProcedure
      .input(z.object({ messages: z.array(golfAssistantMessageSchema).min(1).max(12), conversationId: z.number().optional(), tripId: z.number().optional(), roundId: z.number().optional(), saveConversation: z.boolean().default(false) }))
      .mutation(async ({ input, ctx }) => {
        try {
          const existingConversation = input.conversationId
            ? await getAssistantConversation(input.conversationId, ctx.user.id)
            : undefined;
          if (input.conversationId && !existingConversation) throw new TRPCError({ code: "NOT_FOUND", message: "Saved chat not found" });
          const tripId = existingConversation?.tripId ?? input.tripId ?? null;
          if (tripId) await assertAssistantTripAccess(ctx.user.id, tripId, ctx.user.role === "admin");
          if (input.roundId) {
            const round = await getRound(input.roundId);
            if (!round || round.tripId !== tripId) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected round does not belong to this trip." });
          }
          const answer = await answerGolfAssistant(input.messages, tripId, undefined, input.roundId);
          const latestQuestion = [...input.messages].reverse().find((message) => message.role === "user")?.content ?? "Golf Trip question";
          const shouldSave = input.saveConversation || Boolean(existingConversation);
          if (!shouldSave) return { answer, conversationId: null, tripId };
          const conversationId = existingConversation?.id ?? await createAssistantConversation({
            userId: ctx.user.id,
            tripId,
            title: createAssistantConversationTitle(latestQuestion),
          });
          await appendAssistantMessages({
            conversationId,
            userId: ctx.user.id,
            messages: [{ role: "user", content: latestQuestion }, { role: "assistant", content: answer }],
          });
          return { answer, conversationId, tripId };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Golf Trip Assistant error:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The Golf Trip Assistant is temporarily unavailable. Please try again." });
        }
      }),

    listConversations: protectedProcedure.query(({ ctx }) => getAssistantConversations(ctx.user.id)),

    getConversation: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input, ctx }) => {
        const conversation = await getAssistantConversation(input.conversationId, ctx.user.id);
        if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "Saved chat not found" });
        return { conversation, messages: await getAssistantMessages(input.conversationId, ctx.user.id) };
      }),

    deleteConversation: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ input, ctx }) => ({ success: await deleteAssistantConversation(input.conversationId, ctx.user.id) })),

    explainScore: protectedProcedure
      .input(z.object({ tripId: z.number(), kind: z.enum(["player", "pair"]), userId: z.number().optional(), teamKey: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await assertAssistantTripAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const trip = await getTrip(input.tripId);
        if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
        let question = "Explain this score in clear golfing terms.";
        let scoreContext = `Trip: ${trip.name}. Tournament type: ${trip.tournamentType ?? "stableford"}.`;
        if (input.kind === "player") {
          if (!input.userId) throw new TRPCError({ code: "BAD_REQUEST", message: "Player is required" });
          const player = (await getTripLeaderboard(input.tripId)).find((entry) => entry.userId === input.userId);
          if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "Player score was not found" });
          question = `Explain ${player.userName ?? "this player's"} trip score and standing.`;
          scoreContext += `\nPlayer: ${player.userName ?? "Unknown"}. Cumulative Stableford: ${player.cumulativeStableford}. Cumulative net: ${player.cumulativeNet}. Countback Stableford: B9 ${player.stablefordCountback.back9 ?? "—"}, L6 ${player.stablefordCountback.last6 ?? "—"}, L3 ${player.stablefordCountback.last3 ?? "—"}, H18 ${player.stablefordCountback.hole18 ?? "—"}. Rounds: ${player.rounds.map((round) => `${round.roundName}: ${round.totalStableford} pts, ${round.totalNet} net (${round.holesPlayed} holes)`).join("; ") || "No scores yet"}.`;
        } else {
          if (!input.teamKey) throw new TRPCError({ code: "BAD_REQUEST", message: "4BBB pair is required" });
          const team = (await getTripFourBBBLeaderboard(input.tripId)).find((entry) => entry.teamKey === input.teamKey);
          if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "4BBB pair score was not found" });
          question = `Explain the 4BBB score for ${team.player1Name} and ${team.player2Name}.`;
          scoreContext += `\n4BBB pair: ${team.player1Name} and ${team.player2Name}. Total best Stableford points: ${team.cumulativeBestBall}. Countback: B9 ${team.countback.back9 ?? "—"}, L6 ${team.countback.last6 ?? "—"}, L3 ${team.countback.last3 ?? "—"}, H18 ${team.countback.hole18 ?? "—"}. Rounds: ${team.rounds.map((round) => `${round.roundName}: ${round.totalBestBall} best points (${round.holesPlayed} holes)`).join("; ") || "No scores yet"}.`;
        }
        try {
          const answer = await answerGolfAssistant([{ role: "user", content: question }], input.tripId, scoreContext);
          const conversationId = await createAssistantConversation({ userId: ctx.user.id, tripId: input.tripId, title: createAssistantConversationTitle(question) });
          await appendAssistantMessages({ conversationId, userId: ctx.user.id, messages: [{ role: "user", content: question }, { role: "assistant", content: answer }] });
          return { answer, conversationId };
        } catch (error) {
          console.error("Golf Trip score explanation error:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The score explanation is temporarily unavailable. Please try again." });
        }
      }),

    explainDailyScore: protectedProcedure
      .input(z.object({ roundId: z.number(), kind: z.enum(["player", "pair"]), userId: z.number().optional(), teamKey: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const round = await getRound(input.roundId);
        if (!round) throw new TRPCError({ code: "NOT_FOUND", message: "Round not found" });
        await assertAssistantTripAccess(ctx.user.id, round.tripId, ctx.user.role === "admin");
        const trip = await getTrip(round.tripId);
        const scorecard = await getRoundScorecard(round.id);
        const courseHoles = await getHolesByCourse(round.courseId);
        const scoringMode = (round as any).individualScoringMode ?? trip?.handicapMode ?? "stableford";
        let question = "Explain this daily leaderboard score.";
        let scoreContext = `Trip: ${trip?.name ?? "Unknown"}. Round: ${round.name}. Format: ${scoringMode === "net_stroke" ? "Net Stroke" : "Stableford"}.`;

        if (input.kind === "player") {
          if (!input.userId) throw new TRPCError({ code: "BAD_REQUEST", message: "Player is required" });
          const player = scorecard.find((entry) => entry.userId === input.userId);
          if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "Player score was not found" });
          const scoreMap = new Map(player.scores.map((score) => [score.holeId, score]));
          const countback = calculateCountback(courseHoles.map((hole) => ({
            holeNumber: hole.holeNumber,
            value: scoringMode === "net_stroke" ? scoreMap.get(hole.id)?.netScore ?? null : scoreMap.get(hole.id)?.stablefordPoints ?? null,
          })));
          question = `Explain ${player.userName ?? "this player's"} daily score in ${round.name}.`;
          scoreContext += `\nPlayer: ${player.userName ?? "Unknown"}. Handicap: ${player.handicap}. Gross: ${player.totalGross}. Net: ${player.totalNet}. Stableford points: ${player.totalStableford}. Holes played: ${player.holesPlayed}. Countback: B9 ${countback.back9 ?? "—"}, L6 ${countback.last6 ?? "—"}, L3 ${countback.last3 ?? "—"}, H18 ${countback.hole18 ?? "—"}.`;
        } else {
          if (!input.teamKey) throw new TRPCError({ code: "BAD_REQUEST", message: "4BBB pair is required" });
          const ids = input.teamKey.split("-").map(Number).filter(Boolean);
          if (ids.length !== 2) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid 4BBB pair" });
          const player1 = scorecard.find((entry) => entry.userId === ids[0]);
          const player2 = scorecard.find((entry) => entry.userId === ids[1]);
          if (!player1 || !player2) throw new TRPCError({ code: "NOT_FOUND", message: "4BBB pair score was not found" });
          let totalBestPoints = 0;
          let holesPlayed = 0;
          const countback = calculateCountback(courseHoles.map((hole) => {
            const p1 = player1.scores.find((score) => score.holeId === hole.id);
            const p2 = player2.scores.find((score) => score.holeId === hole.id);
            const bestPoints = calculate4BBBStablefordPoints(p1?.stablefordPoints ?? null, p2?.stablefordPoints ?? null);
            if (bestPoints !== null) { totalBestPoints += bestPoints; holesPlayed++; }
            return { holeNumber: hole.holeNumber, value: bestPoints };
          }));
          question = `Explain the 4BBB daily score for ${player1.userName ?? "Player"} and ${player2.userName ?? "Player"} in ${round.name}.`;
          scoreContext += `\n4BBB pair: ${player1.userName ?? "Player"} and ${player2.userName ?? "Player"}. Best Stableford points: ${totalBestPoints}. Holes played: ${holesPlayed}. Countback: B9 ${countback.back9 ?? "—"}, L6 ${countback.last6 ?? "—"}, L3 ${countback.last3 ?? "—"}, H18 ${countback.hole18 ?? "—"}. The higher player Stableford points count on each 4BBB hole.`;
        }

        try {
          const answer = await answerGolfAssistant([{ role: "user", content: question }], round.tripId, scoreContext);
          const conversationId = await createAssistantConversation({ userId: ctx.user.id, tripId: round.tripId, title: createAssistantConversationTitle(question) });
          await appendAssistantMessages({ conversationId, userId: ctx.user.id, messages: [{ role: "user", content: question }, { role: "assistant", content: answer }] });
          return { answer, conversationId };
        } catch (error) {
          console.error("Golf Trip daily score explanation error:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The daily score explanation is temporarily unavailable. Please try again." });
        }
      }),
  }),

  tripFaqs: router({
    list: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ input, ctx }) => {
        await assertAssistantTripAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        return getTripFaqs(input.tripId);
      }),
    listVisible: protectedProcedure
      .input(z.object({ tripId: z.number(), roundId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        await assertAssistantTripAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        if (input.roundId) {
          const round = await getRound(input.roundId);
          if (!round || round.tripId !== input.tripId) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected round does not belong to this trip." });
        }
        return getVisibleTripFaqs(input.tripId, input.roundId);
      }),
    create: adminProcedure
      .input(z.object({ tripId: z.number(), category: z.enum(TRIP_FAQ_CATEGORIES.map((entry) => entry.value) as [string, ...string[]]).default("general"), isPinned: z.boolean().default(false), visibleFromRoundId: z.number().nullable().optional(), question: z.string().trim().min(3).max(300), answer: z.string().trim().min(3).max(4000) }))
      .mutation(async ({ input, ctx }) => {
        if (input.visibleFromRoundId) {
          const round = await getRound(input.visibleFromRoundId);
          if (!round || round.tripId !== input.tripId) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected round does not belong to this trip." });
        }
        return { id: await createTripFaq({ ...input, createdByUserId: ctx.user.id }) };
      }),
    update: adminProcedure
      .input(z.object({ id: z.number(), category: z.enum(TRIP_FAQ_CATEGORIES.map((entry) => entry.value) as [string, ...string[]]).optional(), isPinned: z.boolean().optional(), visibleFromRoundId: z.number().nullable().optional(), question: z.string().trim().min(3).max(300).optional(), answer: z.string().trim().min(3).max(4000).optional() }))
      .mutation(async ({ input }) => {
        const existing = await getTripFaq(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "FAQ not found" });
        if (input.visibleFromRoundId) {
          const round = await getRound(input.visibleFromRoundId);
          if (!round || round.tripId !== existing.tripId) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected round does not belong to this trip." });
        }
        await updateTripFaq(input.id, input);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await deleteTripFaq(input.id); return { success: true }; }),
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
              distanceMeters: z.number().int().min(40).max(900).nullable().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const courseId = await createCourse(input.name, input.holes.length);
        await createHoles(courseId, input.holes);
        return { courseId };
      }),

    previewScorecardImport: adminProcedure
      .input(z.object({ imageKey: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const scorecard = await extractCourseScorecard(input.imageKey);
        const teeNames = getImportedTeeNames(scorecard);
        if (teeNames.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No complete tee sets could be read from this scorecard." });
        return { ...scorecard, teeNames };
      }),

    importScorecard: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        teeName: z.string().min(1).max(64),
        measurement: z.enum(["meters", "yards"]),
        holes: z.array(z.object({
          holeNumber: z.number().int().min(1).max(18),
          par: z.number().int().min(3).max(6),
          strokeIndex: z.number().int().min(1).max(18),
          distanceMeters: z.number().int().min(40).max(900),
        })).length(18),
      }))
      .mutation(async ({ input }) => {
        const uniqueHoles = new Set(input.holes.map((hole) => hole.holeNumber));
        const uniqueStrokeIndexes = new Set(input.holes.map((hole) => hole.strokeIndex));
        if (uniqueHoles.size !== 18 || uniqueStrokeIndexes.size !== 18) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Imported holes must contain one of each hole number and stroke index from 1 to 18." });
        }
        const courseId = await createCourse(input.name, 18, input.teeName);
        await createHoles(courseId, input.holes);
        return { courseId, teeName: input.teeName };
      }),
  }),

  // ─── Trips ────────────────────────────────────────────────────────────────

  trips: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const allTrips = await getAllTrips();
      // Attach isCoAdmin flag for the current user on each trip
      const tripIds = allTrips.map((t) => t.id);
      if (tripIds.length === 0) return allTrips.map((t) => ({ ...t, isCoAdmin: false }));
      const playerRows = await Promise.all(
        tripIds.map((tid) => getTripPlayer(tid, ctx.user.id))
      );
      return allTrips.map((t, i) => ({
        ...t,
        isCoAdmin: !!(playerRows[i]?.isCoAdmin),
      }));
    }),

    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getTrip(input.id)),

    getTeeSheet: publicProcedure
      .input(z.object({ roundId: z.number(), tripId: z.number() }))
      .query(async ({ input }) => {
        const groupList = await getGroupsByRound(input.roundId);
        const groupsWithPlayers = await Promise.all(
          groupList.map(async (g) => {
            const players = await getGroupPlayers(g.id, input.tripId);
            return { ...g, players };
          })
        );
        // Sort by teeTime (nulls last)
        groupsWithPlayers.sort((a, b) => {
          if (!a.teeTime && !b.teeTime) return 0;
          if (!a.teeTime) return 1;
          if (!b.teeTime) return -1;
          return a.teeTime.localeCompare(b.teeTime);
        });
        return groupsWithPlayers;
      }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          startDate: z.string(),
          endDate: z.string(),
          tournamentType: z.enum(["stableford", "stableford_4bbb", "stroke", "stroke_4bbb", "matchplay", "ambrose", "alternate_shot"]).default("stableford"),
          handicapMode: z.enum(["stableford", "net_stroke"]).default("stableford"),
          handicapBaseline: z.number().default(0),
          handicapFactor: z.number().default(0.25),
          handicapAutoAdjust: z.boolean().default(true),
          location: z.string().optional(),
          description: z.string().optional(),
          rules: z.string().optional(),
          logoUrl: z.string().optional(),
          defaultColorScheme: z.enum(APP_COLOR_SCHEME_IDS).nullable().optional(),
          hideCourses: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Derive handicapMode from tournamentType for consistency
        const derivedHandicapMode = (input.tournamentType === "stroke" || input.tournamentType === "stroke_4bbb") ? "net_stroke" : "stableford";
        const tripId = await createTrip({
          name: input.name,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          createdBy: ctx.user.id,
          tournamentType: input.tournamentType,
          handicapMode: derivedHandicapMode,
          handicapBaseline: input.handicapBaseline,
          handicapFactor: input.handicapFactor,
          handicapAutoAdjust: input.handicapAutoAdjust,
          location: input.location,
          description: input.description,
          defaultColorScheme: input.defaultColorScheme ?? undefined,
          hideCourses: input.hideCourses,
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
          tournamentType: z.enum(["stableford", "stableford_4bbb", "stroke", "stroke_4bbb", "matchplay", "ambrose", "alternate_shot"]).optional(),
          handicapMode: z.enum(["stableford", "net_stroke"]).optional(),
          handicapBaseline: z.number().optional(),
          handicapFactor: z.number().optional(),
          handicapAutoAdjust: z.boolean().optional(),
          location: z.string().optional(),
          description: z.string().optional(),
          rules: z.string().optional(),
          logoUrl: z.string().optional(),
          defaultColorScheme: z.enum(APP_COLOR_SCHEME_IDS).nullable().optional(),
          hideCourses: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, startDate, endDate, tournamentType, ...rest } = input;
        // Block tournament type change if trip has started (has active or completed rounds)
        if (tournamentType !== undefined) {
          const existingRounds = await getRoundsByTrip(id);
          const hasStarted = existingRounds.some((r) => r.status === "active" || r.status === "completed");
          if (hasStarted) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change tournament type after the trip has started. Rounds are already in progress or completed." });
          }
        }
        // Derive handicapMode from tournamentType
        const derivedHandicapMode = tournamentType
          ? ((tournamentType === "stroke" || tournamentType === "stroke_4bbb") ? "net_stroke" : "stableford")
          : undefined;
        await updateTrip(id, {
          ...rest,
          ...(tournamentType !== undefined ? { tournamentType } : {}),
          ...(derivedHandicapMode !== undefined ? { handicapMode: derivedHandicapMode } : {}),
          ...(startDate ? { startDate: new Date(startDate) } : {}),
          ...(endDate ? { endDate: new Date(endDate) } : {}),
        } as any);
        // Sync all scheduled rounds to the new tournament type
        if (tournamentType !== undefined) {
          await syncRoundsToTournamentType(id, tournamentType);
        }
        return { success: true };
      }),

    revealCourses: adminProcedure
      .input(z.object({ tripId: z.number() }))
      .mutation(async ({ input }) => {
        const trip = await getTrip(input.tripId);
        if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
        if (!trip.hideCourses) throw new TRPCError({ code: "BAD_REQUEST", message: "Course hiding is not enabled for this trip." });
        await updateTrip(input.tripId, { coursesRevealed: true } as any);
        const body = `Course details have been revealed for ${trip.name}. Check your rounds for the full information.`;
        await createNotification({ tripId: input.tripId, message: body, type: "general" });
        void sendPushToTrip(input.tripId, { title: `⛳ ${trip.name} courses revealed`, body, tag: `courses-revealed-${input.tripId}`, url: `/trip/${input.tripId}` });
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

  tripPlanning: router({
    listScheduledAnnouncements: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        return getTripScheduledAnnouncements(input.tripId);
      }),
    scheduleAnnouncement: protectedProcedure
      .input(z.object({ tripId: z.number(), message: z.string().trim().min(1).max(1000), scheduledAt: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const scheduledAt = new Date(input.scheduledAt);
        if (Number.isNaN(scheduledAt.getTime()) || !isFutureSchedule(scheduledAt)) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a time at least one minute in the future." });
        const announcementId = await createTripScheduledAnnouncement({ tripId: input.tripId, createdByUserId: ctx.user.id, message: input.message, scheduledAt });
        const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        const job = await createHeartbeatJob({ name: `trip-announcement-${input.tripId}-${announcementId}`, cron: toOneTimeUtcCron(scheduledAt), path: "/api/scheduled/trip-announcement", payload: {}, description: `Trip announcement ${announcementId}` }, sessionToken);
        await setTripScheduledAnnouncementTask(announcementId, job.taskUid);
        return { id: announcementId, nextExecutionAt: job.nextExecutionAt };
      }),
    scheduleCourseReveal: protectedProcedure
      .input(z.object({ tripId: z.number(), revealAt: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const trip = await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        if (!trip.hideCourses || trip.coursesRevealed) throw new TRPCError({ code: "BAD_REQUEST", message: "Enable mystery-course mode before scheduling a reveal." });
        const revealAt = new Date(input.revealAt);
        if (Number.isNaN(revealAt.getTime()) || !isFutureSchedule(revealAt)) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a time at least one minute in the future." });
        const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        const job = await createHeartbeatJob({ name: `course-reveal-${input.tripId}-${revealAt.getTime()}`, cron: toOneTimeUtcCron(revealAt), path: "/api/scheduled/course-reveal", payload: {}, description: `Mystery-course reveal for trip ${input.tripId}` }, sessionToken);
        await updateTrip(input.tripId, { courseRevealAt: revealAt, courseRevealCronTaskUid: job.taskUid } as any);
        return { nextExecutionAt: job.nextExecutionAt };
      }),
  }),

  tripItinerary: router({
    list: protectedProcedure.input(z.object({ tripId: z.number() })).query(async ({ ctx, input }) => {
      await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
      return getTripItinerary(input.tripId);
    }),
    create: protectedProcedure.input(z.object({ tripId: z.number(), type: z.enum(["transport", "accommodation", "activity", "other"]), title: z.string().trim().min(1).max(180), location: z.string().trim().max(255).optional(), startsAt: z.string().optional(), endsAt: z.string().optional(), notes: z.string().trim().max(2000).optional(), assignedUserIds: z.array(z.number()).max(200).default([]) })).mutation(async ({ ctx, input }) => {
      await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
      for (const userId of input.assignedUserIds) if (!(await getTripPlayer(input.tripId, userId))) throw new TRPCError({ code: "BAD_REQUEST", message: "Assignments must be trip players." });
      const id = await createTripItineraryItem({ ...input, location: input.location || undefined, notes: input.notes || undefined, startsAt: input.startsAt ? new Date(input.startsAt) : undefined, endsAt: input.endsAt ? new Date(input.endsAt) : undefined });
      return { id };
    }),
    setAssignments: protectedProcedure.input(z.object({ tripId: z.number(), itemId: z.number(), userIds: z.array(z.number()).max(200) })).mutation(async ({ ctx, input }) => {
      await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
      if (!(await getTripItinerary(input.tripId)).some((item) => item.id === input.itemId)) throw new TRPCError({ code: "NOT_FOUND", message: "Itinerary item not found" });
      for (const userId of input.userIds) if (!(await getTripPlayer(input.tripId, userId))) throw new TRPCError({ code: "BAD_REQUEST", message: "Assignments must be trip players." });
      await updateTripItineraryAssignments(input.itemId, input.userIds);
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ tripId: z.number(), itemId: z.number() })).mutation(async ({ ctx, input }) => {
      await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
      if (!(await getTripItinerary(input.tripId)).some((item) => item.id === input.itemId)) throw new TRPCError({ code: "NOT_FOUND", message: "Itinerary item not found" });
      await deleteTripItineraryItem(input.itemId);
      return { success: true };
    }),
  }),

  tripFinances: router({
    access: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        const trip = await getTrip(input.tripId);
        if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
        const member = await getTripPlayer(input.tripId, ctx.user.id);
        return { canManage: ctx.user.role === "admin" || trip.createdBy === ctx.user.id || trip.financialManagerUserId === ctx.user.id, isOwner: trip.createdBy === ctx.user.id, isMember: Boolean(member) };
      }),
    summary: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
        return getTripPaymentSummary(input.tripId);
      }),
    myBalance: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        const player = await getTripPlayer(input.tripId, ctx.user.id);
        if (!player) throw new TRPCError({ code: "FORBIDDEN", message: "You are not a trip player" });
        const summary = await getTripPaymentSummary(input.tripId);
        return summary.find((entry) => entry.userId === ctx.user.id) ?? { userId: ctx.user.id, displayName: "Player", priceCents: 0, confirmedCents: 0, outstandingCents: 0, payments: [] };
      }),
    plan: protectedProcedure.input(z.object({ tripId: z.number() })).query(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      return getTripFinancialPlan(input.tripId);
    }),
    suppliers: protectedProcedure.input(z.object({ tripId: z.number() })).query(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      return getTripSuppliers(input.tripId);
    }),
    addSupplier: protectedProcedure.input(z.object({ tripId: z.number(), name: z.string().trim().min(1).max(180), contactName: z.string().trim().max(120).optional(), email: z.string().trim().email().max(255).optional().or(z.literal("")), phone: z.string().trim().max(60).optional(), notes: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      return { id: await createTripSupplier({ ...input, contactName: input.contactName || undefined, email: input.email || undefined, phone: input.phone || undefined, notes: input.notes || undefined }) };
    }),
    removeSupplier: protectedProcedure.input(z.object({ tripId: z.number(), supplierId: z.number() })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      if (!(await getTripSuppliers(input.tripId)).some((supplier) => supplier.id === input.supplierId)) throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });
      await deleteTripSupplier(input.supplierId);
      return { success: true };
    }),
    updateSupplierPayment: protectedProcedure.input(z.object({ tripId: z.number(), supplierId: z.number(), paymentDueCents: z.number().int().min(0).max(100_000_000), paidCents: z.number().int().min(0).max(100_000_000) })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      if (!(await getTripSuppliers(input.tripId)).some((supplier) => supplier.id === input.supplierId)) throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });
      await updateTripSupplierPayment(input.supplierId, input.paymentDueCents, Math.min(input.paidCents, input.paymentDueCents));
      return { success: true };
    }),
    scheduleSupplierInvoiceReminder: protectedProcedure.input(z.object({ tripId: z.number(), supplierId: z.number(), invoiceDueAt: z.string().optional(), reminderAt: z.string().optional() })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      const supplier = (await getTripSuppliers(input.tripId)).find((entry) => entry.id === input.supplierId);
      if (!supplier) throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });
      const invoiceDueAt = input.invoiceDueAt ? new Date(input.invoiceDueAt) : undefined;
      const reminderAt = input.reminderAt ? new Date(input.reminderAt) : undefined;
      if (invoiceDueAt && Number.isNaN(invoiceDueAt.getTime())) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a valid invoice due date." });
      if (reminderAt && (Number.isNaN(reminderAt.getTime()) || !isFutureSchedule(reminderAt))) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a reminder time at least one minute in the future." });
      let taskUid: string | undefined;
      if (reminderAt) {
        const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        const job = await createHeartbeatJob({ name: `supplier-invoice-${input.tripId}-${supplier.id}`, cron: toOneTimeUtcCron(reminderAt), path: "/api/scheduled/supplier-invoice-reminder", payload: {}, description: `Supplier invoice reminder for ${supplier.name}` }, sessionToken);
        taskUid = job.taskUid;
      }
      await setTripSupplierInvoiceReminder(supplier.id, invoiceDueAt, reminderAt, taskUid);
      return { success: true };
    }),
    attachSupplierInvoice: protectedProcedure.input(z.object({ tripId: z.number(), supplierId: z.number(), fileKey: z.string().min(1).max(512), fileUrl: z.string().min(1).max(512), fileName: z.string().min(1).max(255) })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      if (!(await getTripSuppliers(input.tripId)).some((supplier) => supplier.id === input.supplierId)) throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });
      await setTripSupplierInvoiceAttachment(input.supplierId, input.fileKey, input.fileUrl, input.fileName);
      return { success: true };
    }),
    setDailyFinancialDigest: protectedProcedure.input(z.object({ tripId: z.number(), enabled: z.boolean(), hourUtc: z.number().int().min(0).max(23) })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      const trip = await getTrip(input.tripId);
      if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const cron = `0 0 ${input.hourUtc} * * *`;
      let taskUid = (trip as any).financialDigestCronTaskUid as string | null | undefined;
      if (taskUid) {
        await updateHeartbeatJob(taskUid, { cron, enable: input.enabled, description: `Daily financial digest for ${trip.name}` }, sessionToken);
      } else if (input.enabled) {
        const job = await createHeartbeatJob({ name: `financial-digest-${input.tripId}`, cron, path: "/api/scheduled/financial-digest", payload: {}, description: `Daily financial digest for ${trip.name}` }, sessionToken);
        taskUid = job.taskUid;
      }
      await updateTrip(input.tripId, { financialDigestEnabled: input.enabled, financialDigestHourUtc: input.hourUtc, financialDigestCronTaskUid: taskUid ?? null } as any);
      return { success: true };
    }),
    setPaymentSchedule: protectedProcedure.input(z.object({ tripId: z.number(), dueAt: z.string().optional(), reminderAt: z.string().optional() })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      const dueAt = input.dueAt ? new Date(input.dueAt) : undefined;
      const reminderAt = input.reminderAt ? new Date(input.reminderAt) : undefined;
      if (dueAt && Number.isNaN(dueAt.getTime())) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a valid payment due date." });
      if (reminderAt && (Number.isNaN(reminderAt.getTime()) || !isFutureSchedule(reminderAt))) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a reminder time at least one minute in the future." });
      let taskUid: string | undefined;
      if (reminderAt) {
        const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        const job = await createHeartbeatJob({ name: `payment-reminder-${input.tripId}-${reminderAt.getTime()}`, cron: toOneTimeUtcCron(reminderAt), path: "/api/scheduled/payment-reminder", payload: {}, description: `Payment due reminder for trip ${input.tripId}` }, sessionToken);
        taskUid = job.taskUid;
      }
      await updateTrip(input.tripId, { paymentDueAt: dueAt, paymentReminderAt: reminderAt, paymentReminderCronTaskUid: taskUid ?? null } as any);
      return { success: true };
    }),
    reminderStages: protectedProcedure.input(z.object({ tripId: z.number() })).query(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      return getTripPaymentReminderStages(input.tripId);
    }),
    scheduleReminderStage: protectedProcedure.input(z.object({ tripId: z.number(), label: z.string().trim().min(1).max(100), reminderAt: z.string() })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      const reminderAt = new Date(input.reminderAt);
      if (Number.isNaN(reminderAt.getTime()) || !isFutureSchedule(reminderAt)) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a reminder time at least one minute in the future." });
      const id = await createTripPaymentReminderStage({ tripId: input.tripId, label: input.label, reminderAt });
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const job = await createHeartbeatJob({ name: `payment-reminder-stage-${input.tripId}-${id}`, cron: toOneTimeUtcCron(reminderAt), path: "/api/scheduled/payment-reminder-stage", payload: {}, description: `${input.label} payment reminder for trip ${input.tripId}` }, sessionToken);
      await setTripPaymentReminderStageTask(id, job.taskUid);
      return { id, nextExecutionAt: job.nextExecutionAt };
    }),
    addActualExpense: protectedProcedure.input(z.object({ tripId: z.number(), plannedLineItemId: z.number().optional(), supplierId: z.number().optional(), category: z.string().trim().min(1).max(80).default("Other"), label: z.string().trim().min(1).max(180), amountCents: z.number().int().min(0).max(100_000_000), paidAt: z.string().optional(), notes: z.string().trim().max(500).optional(), receiptUrl: z.string().max(512).optional(), receiptFileName: z.string().max(255).optional() })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      const plan = await getTripFinancialPlan(input.tripId);
      if (input.plannedLineItemId && !plan.lines.some((line) => line.id === input.plannedLineItemId)) throw new TRPCError({ code: "BAD_REQUEST", message: "The planned line item does not belong to this trip." });
      if (input.supplierId && !(await getTripSuppliers(input.tripId)).some((supplier) => supplier.id === input.supplierId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Supplier does not belong to this trip." });
      const needsApproval = plan.settings.expenseApprovalThresholdCents > 0 && input.amountCents >= plan.settings.expenseApprovalThresholdCents;
      const id = await createTripActualExpense({ tripId: input.tripId, plannedLineItemId: input.plannedLineItemId, supplierId: input.supplierId, category: input.category, label: input.label, amountCents: input.amountCents, paidAt: input.paidAt ? new Date(input.paidAt) : undefined, notes: input.notes || undefined, receiptUrl: input.receiptUrl, receiptFileName: input.receiptFileName, approvalStatus: needsApproval ? "pending" : "approved" });
      return { id };
    }),
    approveActualExpense: protectedProcedure.input(z.object({ tripId: z.number(), expenseId: z.number() })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      const plan = await getTripFinancialPlan(input.tripId);
      if (!plan.actualExpenses.some((expense) => expense.id === input.expenseId)) throw new TRPCError({ code: "NOT_FOUND", message: "Actual expense not found" });
      await approveTripActualExpense(input.expenseId, ctx.user.id);
      return { success: true };
    }),
    removeActualExpense: protectedProcedure.input(z.object({ tripId: z.number(), expenseId: z.number() })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      const plan = await getTripFinancialPlan(input.tripId);
      if (!plan.actualExpenses.some((expense) => expense.id === input.expenseId)) throw new TRPCError({ code: "NOT_FOUND", message: "Actual expense not found" });
      await deleteTripActualExpense(input.expenseId);
      return { success: true };
    }),
    savePlanSettings: protectedProcedure.input(z.object({ tripId: z.number(), contingencyPercent: z.number().min(0).max(100), rolloverCents: z.number().int().min(0).max(100_000_000), expenseApprovalThresholdCents: z.number().int().min(0).max(100_000_000).default(0) })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      await setTripFinancialSettings(input.tripId, input.contingencyPercent, input.rolloverCents, input.expenseApprovalThresholdCents);
      return { success: true };
    }),
    addPlanLine: protectedProcedure.input(z.object({ tripId: z.number(), type: z.enum(["fixed_cost", "per_person_cost", "prize", "income"]), label: z.string().trim().min(1).max(180), amountCents: z.number().int().min(0).max(100_000_000) })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      return { id: await createTripFinancialLineItem(input) };
    }),
    removePlanLine: protectedProcedure.input(z.object({ tripId: z.number(), lineId: z.number() })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      const plan = await getTripFinancialPlan(input.tripId);
      if (!plan.lines.some((line) => line.id === input.lineId)) throw new TRPCError({ code: "NOT_FOUND", message: "Financial line item not found" });
      await deleteTripFinancialLineItem(input.lineId);
      return { success: true };
    }),
    applySuggestedPrice: protectedProcedure.input(z.object({ tripId: z.number() })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      const plan = await getTripFinancialPlan(input.tripId);
      const players = await getTripPlayers(input.tripId);
      await Promise.all(players.map((player) => setTripPlayerPrice(input.tripId, player.userId, plan.suggestedPricePerPersonCents)));
      return { priceCents: plan.suggestedPricePerPersonCents };
    }),
    setFinancialManager: protectedProcedure
      .input(z.object({ tripId: z.number(), userId: z.number().nullable() }))
      .mutation(async ({ ctx, input }) => {
        const trip = await getTrip(input.tripId);
        if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
        if (ctx.user.role !== "admin" && trip.createdBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the trip owner can manage financial access." });
        if (input.userId !== null && !(await isCoAdminForTrip(input.userId, input.tripId))) throw new TRPCError({ code: "BAD_REQUEST", message: "Financial access can only be given to a trip co-admin." });
        await updateTrip(input.tripId, { financialManagerUserId: input.userId } as any);
        return { success: true };
      }),
    setPrice: protectedProcedure
      .input(z.object({ tripId: z.number(), userId: z.number(), priceCents: z.number().int().min(0).max(10_000_000) }))
      .mutation(async ({ ctx, input }) => {
        await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
        if (!(await getTripPlayer(input.tripId, input.userId))) throw new TRPCError({ code: "NOT_FOUND", message: "Trip player not found" });
        await setTripPlayerPrice(input.tripId, input.userId, input.priceCents);
        return { success: true };
      }),
    submitPayment: protectedProcedure
      .input(z.object({ tripId: z.number(), amountCents: z.number().int().min(1).max(10_000_000), note: z.string().trim().max(240).optional() }))
      .mutation(async ({ ctx, input }) => {
        const balance = await getTripPaymentSummary(input.tripId).then((summary) => summary.find((entry) => entry.userId === ctx.user.id));
        if (!balance) throw new TRPCError({ code: "FORBIDDEN", message: "You are not a trip player" });
        if (input.amountCents > balance.outstandingCents) throw new TRPCError({ code: "BAD_REQUEST", message: "Payment cannot exceed your outstanding balance." });
        const id = await createTripPayment({ tripId: input.tripId, userId: ctx.user.id, amountCents: input.amountCents, status: "submitted", note: input.note || undefined, submittedByUserId: ctx.user.id });
        return { id };
      }),
    recordPayment: protectedProcedure
      .input(z.object({ tripId: z.number(), userId: z.number(), amountCents: z.number().int().min(1).max(10_000_000), note: z.string().trim().max(240).optional() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const id = await createTripPayment({ tripId: input.tripId, userId: input.userId, amountCents: input.amountCents, status: "manual_confirmed", note: input.note || undefined, submittedByUserId: ctx.user.id, reviewedByUserId: ctx.user.id, reviewedAt: new Date() });
        return { id };
      }),
    reviewPayment: protectedProcedure
      .input(z.object({ tripId: z.number(), paymentId: z.number(), status: z.enum(["confirmed", "rejected"]) }))
      .mutation(async ({ ctx, input }) => {
        await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const payment = (await getTripPayments(input.tripId)).find((entry) => entry.id === input.paymentId);
        if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Payment submission not found" });
        await reviewTripPayment(input.paymentId, ctx.user.id, input.status);
        return { success: true };
      }),
  }),

  tripDocuments: router({
    list: protectedProcedure.input(z.object({ tripId: z.number() })).query(async ({ ctx, input }) => {
      if (!(await getTripPlayer(input.tripId, ctx.user.id)) && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "You are not a trip player" });
      return getTripDocuments(input.tripId);
    }),
    create: protectedProcedure.input(z.object({ tripId: z.number(), title: z.string().trim().min(1).max(180), folder: z.string().trim().min(1).max(120).default("General"), tags: z.string().trim().max(500).optional(), fileKey: z.string().min(1).max(512), fileUrl: z.string().min(1).max(512), fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(120), sizeBytes: z.number().int().min(1).max(15 * 1024 * 1024) })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      return { id: await createTripDocument({ ...input, uploadedByUserId: ctx.user.id }) };
    }),
    remove: protectedProcedure.input(z.object({ tripId: z.number(), documentId: z.number() })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      if (!(await getTripDocuments(input.tripId)).some((document) => document.id === input.documentId)) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      await deleteTripDocument(input.documentId);
      return { success: true };
    }),
  }),

  travelChecklist: router({
    list: protectedProcedure.input(z.object({ tripId: z.number() })).query(async ({ ctx, input }) => {
      if (!(await getTripPlayer(input.tripId, ctx.user.id)) && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "You are not a trip player" });
      return getTripTravelChecklist(input.tripId, ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({ tripId: z.number(), label: z.string().trim().min(1).max(240), dueAt: z.string().optional(), reminderAt: z.string().optional() })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      const dueAt = input.dueAt ? new Date(input.dueAt) : undefined;
      const reminderAt = input.reminderAt ? new Date(input.reminderAt) : undefined;
      if (dueAt && Number.isNaN(dueAt.getTime())) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a valid checklist deadline." });
      if (reminderAt && (Number.isNaN(reminderAt.getTime()) || !isFutureSchedule(reminderAt))) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a reminder time at least one minute in the future." });
      const id = await createTripTravelChecklistItem({ tripId: input.tripId, label: input.label, dueAt, reminderAt, createdByUserId: ctx.user.id });
      if (reminderAt) {
        const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        const job = await createHeartbeatJob({ name: `checklist-reminder-${input.tripId}-${id}`, cron: toOneTimeUtcCron(reminderAt), path: "/api/scheduled/checklist-reminder", payload: {}, description: `Travel checklist reminder for trip ${input.tripId}` }, sessionToken);
        await setTripTravelChecklistReminderTask(id, job.taskUid);
      }
      return { id };
    }),
    remove: protectedProcedure.input(z.object({ tripId: z.number(), itemId: z.number() })).mutation(async ({ ctx, input }) => {
      await assertTripFinancialManager(ctx.user.id, input.tripId, ctx.user.role === "admin");
      if (!(await getTripTravelChecklist(input.tripId, ctx.user.id)).some((item) => item.id === input.itemId)) throw new TRPCError({ code: "NOT_FOUND", message: "Checklist item not found" });
      await deleteTripTravelChecklistItem(input.itemId);
      return { success: true };
    }),
    toggleMine: protectedProcedure.input(z.object({ tripId: z.number(), itemId: z.number(), completed: z.boolean() })).mutation(async ({ ctx, input }) => {
      if (!(await getTripPlayer(input.tripId, ctx.user.id))) throw new TRPCError({ code: "FORBIDDEN", message: "You are not a trip player" });
      if (!(await getTripTravelChecklist(input.tripId, ctx.user.id)).some((item) => item.id === input.itemId)) throw new TRPCError({ code: "NOT_FOUND", message: "Checklist item not found" });
      await toggleTripTravelChecklistCompletion(input.itemId, ctx.user.id, input.completed);
      return { success: true };
    }),
  }),

  // ─── Players ──────────────────────────────────────────────────────────────

    players: router({
    allUsers: protectedProcedure.query(() => getAllUsers()),
    tripPlayers: publicProcedure
      .input(z.object({ tripId: z.number() }))
      .query(({ input }) => getTripPlayers(input.tripId)),
    allForTrip: adminProcedure
      .input(z.object({ tripId: z.number() }))
      .query(({ input }) => getAllTripPlayersAndInvites(input.tripId)),
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

    // Get round-by-round score summaries for the current user in a trip
    getMyRoundSummaries: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ input, ctx }) => {
        const tp = await getTripPlayer(input.tripId, ctx.user.id);
        if (!tp) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this trip" });
        const rounds = await getRoundsByTrip(input.tripId);
        const summaries = await Promise.all(
          rounds.map(async (round) => {
            const playerScores = await import("./db").then(db => db.getScoresByRoundAndUser(round.id, ctx.user.id));
            const totalGross = playerScores.reduce((sum: number, s: { grossScore: number }) => sum + s.grossScore, 0);
            const totalNet = playerScores.reduce((sum: number, s: { netScore: number }) => sum + s.netScore, 0);
            const totalPoints = playerScores.reduce((sum: number, s: { stablefordPoints: number }) => sum + s.stablefordPoints, 0);
            return {
              roundId: round.id,
              roundName: round.name,
              roundDate: round.roundDate,
              status: round.status,
              holesScored: playerScores.length,
              totalGross,
              totalNet,
              totalPoints,
            };
          })
        );
        return summaries;
      }),

    // Trip owner can assign up to 4 co-admins per trip
    setCoAdmin: adminProcedure
      .input(z.object({
        tripId: z.number(),
        userId: z.number(),
        isCoAdmin: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Only the trip owner (createdBy) can assign co-admins
        const trip = await getTrip(input.tripId);
        if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
        if (trip.createdBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the trip owner can assign co-admins" });
        // Verify the target player is on this trip
        const tp = await getTripPlayer(input.tripId, input.userId);
        if (!tp) throw new TRPCError({ code: "NOT_FOUND", message: "Player not found on this trip" });
        // Enforce max 4 co-admins when promoting
        if (input.isCoAdmin) {
          const count = await getCoAdminCount(input.tripId);
          if (count >= 4) throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum 4 co-admins allowed per trip" });
        }
        await setCoAdmin(input.tripId, input.userId, input.isCoAdmin);
        // Notify the trip when someone is promoted to co-admin
        if (input.isCoAdmin) {
          const tp = await getTripPlayer(input.tripId, input.userId);
          const playerName = tp?.nickname ?? `User ${input.userId}`;
          await createNotification({
            tripId: input.tripId,
            message: `${playerName} has been made a co-admin for this trip.`,
            type: "general",
          });
        }
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
        const trip = await getTrip(round.tripId);
        const courseHidden = shouldHideTripCourses(trip?.hideCourses, trip?.coursesRevealed);
        return { round, course: courseHidden && course ? { ...course, name: "Mystery Course" } : course, holes: courseHoles, courseHidden };
      }),

    create: adminProcedure
      .input(
        z.object({
          tripId: z.number(),
          courseId: z.number(),
          name: z.string().min(1),
          roundDate: z.string(),
          // Format overrides — if not provided, will be inherited from trip tournamentType
          strokePlayEnabled: z.boolean().optional(),
          fourBBBEnabled: z.boolean().optional(),
          skinsEnabled: z.boolean().default(false),
          matchPlayEnabled: z.boolean().optional(),
          alternateShotEnabled: z.boolean().optional(),
          ambroseEnabled: z.boolean().optional(),
          ambroseTeamSize: z.number().min(2).max(4).default(4),
          individualScoringMode: z.enum(["stableford", "net_stroke"]).optional(),
          logoUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Inherit format flags from trip's tournamentType unless explicitly overridden
        const trip = await getTrip(input.tripId);
        const inheritedFlags = trip?.tournamentType
          ? roundFlagsFromTournamentType(trip.tournamentType)
          : { strokePlayEnabled: true, fourBBBEnabled: false, matchPlayEnabled: false, ambroseEnabled: false, alternateShotEnabled: false, individualScoringMode: "stableford" as const };
        const roundId = await createRound({
          tripId: input.tripId,
          courseId: input.courseId,
          name: input.name,
          roundDate: new Date(input.roundDate),
          strokePlayEnabled: input.strokePlayEnabled ?? inheritedFlags.strokePlayEnabled,
          fourBBBEnabled: input.fourBBBEnabled ?? inheritedFlags.fourBBBEnabled,
          skinsEnabled: input.skinsEnabled,
          matchPlayEnabled: input.matchPlayEnabled ?? inheritedFlags.matchPlayEnabled,
          alternateShotEnabled: input.alternateShotEnabled ?? inheritedFlags.alternateShotEnabled,
          ambroseEnabled: input.ambroseEnabled ?? inheritedFlags.ambroseEnabled,
          ambroseTeamSize: input.ambroseTeamSize,
          individualScoringMode: input.individualScoringMode ?? inheritedFlags.individualScoringMode,
          ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
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
          mercyRuleEnabled: z.boolean().optional(),
          mercyRuleStrokes: z.number().min(4).max(6).optional(),
          ambroseEnabled: z.boolean().optional(),
          ambroseTeamSize: z.number().min(2).max(4).optional(),
          individualScoringMode: z.enum(["stableford", "net_stroke"]).optional(),
          logoUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, roundDate, ...rest } = input;
        const previousRound = await getRound(id);
        if (!previousRound) throw new TRPCError({ code: "NOT_FOUND", message: "Round not found" });
        await updateRound(id, {
          ...rest,
          ...(roundDate ? { roundDate: new Date(roundDate) } : {}),
        } as any);

        // A FAQ becomes player-visible when its designated round starts.
        if (input.status === "active" && previousRound.status !== "active") {
          try {
            const newlyVisibleFaqs = (await getTripFaqs(previousRound.tripId)).filter((faq) => faq.visibleFromRoundId === id);
            if (newlyVisibleFaqs.length > 0) {
              const plural = newlyVisibleFaqs.length === 1 ? "a new FAQ" : `${newlyVisibleFaqs.length} new FAQs`;
              const body = `${plural} is now available for ${previousRound.name}. Open Golf Trip Assistant to view the latest trip guidance.`;
              await createNotification({ tripId: previousRound.tripId, message: body, type: "round_start" });
              void sendPushToTrip(previousRound.tripId, {
                title: `⛳ ${previousRound.name} guidance`,
                body,
                tag: `round-faqs-${id}`,
                url: `/assistant?tripId=${previousRound.tripId}&roundId=${id}`,
              });
            }
          } catch {
            // Notification delivery must not block an administrator from activating a round.
          }
        }

        // When a round is marked complete, send a Highlights push notification
        if (input.status === "completed") {
          try {
            const round = await getRound(id);
            if (round) {
              const scorecard = await getRoundScorecard(id);
              const top3 = [...scorecard]
                .filter((p) => p.holesPlayed > 0)
                .sort((a, b) => b.totalStableford - a.totalStableford)
                .slice(0, 3);
              const indivLines = top3.map((p, i) =>
                `${["\ud83e\udd47","\ud83e\udd48","\ud83e\udd49"][i]} ${p.userName ?? "Player"} \u2014 ${p.totalStableford} pts`
              );

              // 4BBB top 3 pairs (when enabled)
              let fourBBBLines: string[] = [];
              if (round.fourBBBEnabled) {
                try {
                  const groupList = await getGroupsByRound(id);
                  const courseHoles = await getHolesByCourse(round.courseId);
                  type PairResult = { teamName: string; totalBestBall: number };
                  const pairResults: PairResult[] = [];
                  const seenPairs = new Set<string>();
                  for (const group of groupList) {
                    const gPlayers = await getGroupPlayers(group.id);
                    for (const gp of gPlayers) {
                      if (!gp.partnerId) continue;
                      const key = [gp.userId, gp.partnerId].sort().join("-");
                      if (seenPairs.has(key)) continue;
                      seenPairs.add(key);
                      const p1 = scorecard.find((s) => s.userId === gp.userId);
                      const p2 = scorecard.find((s) => s.userId === gp.partnerId);
                      if (!p1 || !p2) continue;
                      let totalBestBall = 0;
                      for (const hole of courseHoles) {
                        const s1 = p1.scores.find((s) => s.holeId === hole.id);
                        const s2 = p2.scores.find((s) => s.holeId === hole.id);
                        const best = calculate4BBBStablefordPoints(s1?.stablefordPoints ?? null, s2?.stablefordPoints ?? null);
                        if (best !== null) totalBestBall += best;
                      }
                      pairResults.push({ teamName: `${p1.userName ?? "P"} & ${p2.userName ?? "P"}`, totalBestBall });
                    }
                  }
                  pairResults.sort((a, b) => b.totalBestBall - a.totalBestBall);
                  fourBBBLines = pairResults.slice(0, 3).map((r, i) =>
                    `${["\ud83e\udd47","\ud83e\udd48","\ud83e\udd49"][i]} ${r.teamName} \u2014 ${r.totalBestBall} net`
                  );
                } catch { /* ignore 4BBB errors */ }
              }

              const sections: string[] = [];
              if (indivLines.length > 0) sections.push(`Individual:\n${indivLines.join("\n")}`);
              if (fourBBBLines.length > 0) sections.push(`4BBB Pairs:\n${fourBBBLines.join("\n")}`);
              const body = sections.length > 0 ? sections.join("\n\n") : "Scores are in \u2014 check the leaderboard!";

              await createNotification({
                tripId: round.tripId,
                message: `${round.name} is complete! ${body}`,
                type: "round_complete",
              });
              sendPushToTrip(round.tripId, {
                title: `\u26f3 ${round.name} Complete!`,
                body,
                tag: `round-complete-${id}`,
                url: `/trip/${round.tripId}/round/${id}/leaderboard`,
              });
            }
          } catch {
            // Notification failure must not block the round update
          }
        }

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
      .input(z.object({ groupId: z.number(), userId: z.number().nullable().optional(), inviteId: z.number().optional(), partnerId: z.number().optional() }))
      .mutation(async ({ input }) => {
        await addPlayerToGroup(input.groupId, input.userId ?? null, input.partnerId, input.inviteId);
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
        return result;
      }),

    // Player: set team name for their pair (both players share the same teamName)
    setTeamName: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        teamName: z.string().max(64),
        teamEmoji: z.string().max(8).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const { getDb } = await import("./db");
        const { groupPlayers: gpTable } = await import("../drizzle/schema");
        const { eq: eqOp, and: andOp, inArray: inArr } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const myEntry = await db.select().from(gpTable)
          .where(andOp(eqOp(gpTable.groupId, input.groupId), eqOp(gpTable.userId, ctx.user.id)))
          .limit(1);
        if (!myEntry[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Not in this group" });
        const idsToUpdate = [ctx.user.id];
        if (myEntry[0].partnerId) idsToUpdate.push(myEntry[0].partnerId);
        const updatePayload: { teamName: string | null; teamEmoji?: string | null } = {
          teamName: input.teamName.trim() || null,
        };
        if (input.teamEmoji !== undefined) {
          updatePayload.teamEmoji = input.teamEmoji.trim() || null;
        }
        await db.update(gpTable).set(updatePayload)
          .where(andOp(eqOp(gpTable.groupId, input.groupId), inArr(gpTable.userId, idsToUpdate)));
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

    // Admin: copy exact groupings + pairings from one round to another
    copyToRound: adminProcedure
      .input(z.object({
        sourceRoundId: z.number(),
        targetRoundId: z.number(),
        tripId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const count = await copyGroupingsToRound(input.sourceRoundId, input.targetRoundId, input.tripId);
        return { groupsCreated: count };
      }),

    // Admin: re-seed groups for targetRound based on 4BBB pair standings from sourceRound
    reseedBy4BBB: adminProcedure
      .input(z.object({
        sourceRoundId: z.number(),
        targetRoundId: z.number(),
        tripId: z.number(),
        groupSize: z.number().min(2).max(8).optional(),
      }))
      .mutation(async ({ input }) => {
        const count = await reseedGroupsBy4BBB(input.sourceRoundId, input.targetRoundId, input.tripId, input.groupSize);
        return { groupsCreated: count };
      }),

    // Admin: re-seed groups for targetRound based on individual cumulative net trip standings
    reseedByIndividual: adminProcedure
      .input(z.object({
        targetRoundId: z.number(),
        tripId: z.number(),
        groupSize: z.number().min(2).max(8).optional(),
      }))
      .mutation(async ({ input }) => {
        const count = await reseedGroupsByIndividual(input.targetRoundId, input.tripId, input.groupSize);
        return { groupsCreated: count };
      }),

    // Admin: preview copy groupings (dry-run, no writes)
    previewCopy: adminProcedure
      .input(z.object({ sourceRoundId: z.number(), tripId: z.number() }))
      .query(async ({ input }) => {
        const preview = await previewCopyGroupings(input.sourceRoundId, input.tripId);
        return { groups: preview };
      }),

    // Admin: preview re-seed by 4BBB (dry-run, no writes)
    previewBy4BBB: adminProcedure
      .input(z.object({ sourceRoundId: z.number(), tripId: z.number(), groupSize: z.number().min(2).max(8).optional() }))
      .query(async ({ input }) => {
        const preview = await previewReseedBy4BBB(input.sourceRoundId, input.tripId, input.groupSize);
        return { groups: preview };
      }),

    // Admin: preview re-seed by individual trip standings (dry-run, no writes)
        previewByIndividual: adminProcedure
      .input(z.object({ tripId: z.number(), groupSize: z.number().min(2).max(8).optional() }))
      .query(async ({ input }) => {
        const preview = await previewReseedByIndividual(input.tripId, input.groupSize);
        return { groups: preview };
      }),
    // Admin: preview smart seeding (handicap mix, top together, previous round, random)
    previewSmartSeed: adminProcedure
      .input(z.object({
        tripId: z.number(),
        seedMethod: z.enum(["random", "handicap_mix", "top_together", "previous_round"]),
        pairingMethod: z.enum(["random", "keep_last", "seed_4bbb"]),
        teeOrder: z.enum(["top_first", "bottom_first"]),
        groupSize: z.number().min(2).max(8).default(4),
        sourceRoundId: z.number().nullable().optional(),
      }))
      .query(async ({ input }) => {
        const preview = await previewSmartSeed(
          input.tripId,
          input.seedMethod as SeedMethod,
          input.pairingMethod as PairingMethod,
          input.teeOrder as TeeOrder,
          input.groupSize,
          input.sourceRoundId ?? null
        );
        return { groups: preview };
      }),
    // Admin: apply smart seed directly (preview + apply in one step)
    applySmartSeed: adminProcedure
      .input(z.object({
        targetRoundId: z.number(),
        tripId: z.number(),
        seedMethod: z.enum(["random", "handicap_mix", "top_together", "previous_round"]),
        pairingMethod: z.enum(["random", "keep_last", "seed_4bbb"]),
        teeOrder: z.enum(["top_first", "bottom_first"]),
        groupSize: z.number().min(2).max(8).default(4),
        sourceRoundId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const preview = await previewSmartSeed(
          input.tripId,
          input.seedMethod as SeedMethod,
          input.pairingMethod as PairingMethod,
          input.teeOrder as TeeOrder,
          input.groupSize,
          input.sourceRoundId ?? null
        );
        const groupLayout = preview.map((g) => ({
          name: g.name,
          userIds: g.players.map((p) => p.userId),
        }));
        const count = await applyCustomGroupings(input.targetRoundId, input.tripId, groupLayout);
        return { groupsCreated: count };
      }),
    // Admin: apply custom group layout from drag-to-edit preview
    applyCustom: adminProcedure
      .input(z.object({
        targetRoundId: z.number(),
        tripId: z.number(),
        groups: z.array(z.object({
          name: z.string(),
          userIds: z.array(z.number()),
        })),
      }))
      .mutation(async ({ input }) => {
        const count = await applyCustomGroupings(input.targetRoundId, input.tripId, input.groups);
        return { groupsCreated: count };
      }),
    // Admin: set tee time and starting hole for a group
    updateSettings: adminProcedure
      .input(z.object({
        groupId: z.number(),
        teeTime: z.string().max(10).nullable().optional(),
        startingHole: z.number().min(1).max(18).nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateGroupSettings(input.groupId, input.teeTime ?? null, input.startingHole ?? null);
        return { success: true };
      }),
  }),

  // ─── Group Matches (4BBB Matchplay between pairs) ─────────────────────────
  groupMatch: router({
    // Get all group matches for a round with running status
    getByRound: publicProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ input }) => {
        const matches = (await import("./db").then(db => db.getMatchPlayResultsByRound(input.roundId)))
          .filter((match) => match.player1PartnerId !== null && match.player2PartnerId !== null);
        // Enrich with player names and team names
        const enriched = await Promise.all(matches.map(async (m) => {
          const { users: usersTable, tripPlayers: tpTable, groupPlayers: gpTable, groups: grpTable } = await import("../drizzle/schema");
          const { eq: eqOp, inArray: inArr, and: andOp } = await import("drizzle-orm");
          const { getDb } = await import("./db");
          const db = await getDb();
          if (!db) return { ...m, pairANames: [] as string[], pairBNames: [] as string[], pairATeamName: null as string | null, pairBTeamName: null as string | null, pairATeamEmoji: null as string | null, pairBTeamEmoji: null as string | null, holeResultsParsed: JSON.parse(m.holeResults || "[]") };
          const ids = [m.player1Id, m.player1PartnerId, m.player2Id, m.player2PartnerId].filter(Boolean) as number[];
          const userRows = await db.select().from(usersTable).where(inArr(usersTable.id, ids));
          const userMap = new Map(userRows.map(u => [u.id, u.name ?? `Player ${u.id}`]));
          // Fetch group to get tripId for nickname lookup
          const grpRow = await db.select().from(grpTable).where(eqOp(grpTable.id, m.groupId)).limit(1);
          const tripId = grpRow[0]?.tripId;
          let nicknameMap = new Map<number, string>();
          let teamNameMap = new Map<number, string | null>();
          if (tripId) {
            const tpRows = await db.select({ userId: tpTable.userId, nickname: tpTable.nickname })
              .from(tpTable).where(andOp(eqOp(tpTable.tripId, tripId), inArr(tpTable.userId, ids)));
            nicknameMap = new Map(tpRows.filter(r => r.userId !== null).map(r => [r.userId as number, r.nickname ?? userMap.get(r.userId as number) ?? `Player ${r.userId}`]));
          }
          // Fetch teamName + teamEmoji from groupPlayers
          const gpRows = await db.select({ userId: gpTable.userId, teamName: gpTable.teamName, teamEmoji: gpTable.teamEmoji })
            .from(gpTable).where(andOp(eqOp(gpTable.groupId, m.groupId), inArr(gpTable.userId, ids)));
          teamNameMap = new Map(gpRows.filter(r => r.userId !== null).map(r => [r.userId as number, r.teamName ?? null]));
          const teamEmojiMap = new Map(gpRows.filter(r => r.userId !== null).map(r => [r.userId as number, r.teamEmoji ?? null]));
          const displayName = (id: number) => nicknameMap.get(id) ?? userMap.get(id) ?? `Player ${id}`;
          const pairAIds = [m.player1Id, m.player1PartnerId].filter(Boolean) as number[];
          const pairBIds = [m.player2Id, m.player2PartnerId].filter(Boolean) as number[];
          // Team name: use set teamName or fallback to "Team [lowest HCP player's name]"
          const pairATeamName = teamNameMap.get(m.player1Id) ?? null;
          const pairBTeamName = teamNameMap.get(m.player2Id) ?? null;
          const pairATeamEmoji = teamEmojiMap.get(m.player1Id) ?? null;
          const pairBTeamEmoji = teamEmojiMap.get(m.player2Id) ?? null;
          return {
            ...m,
            pairANames: pairAIds.map(id => displayName(id)),
            pairBNames: pairBIds.map(id => displayName(id)),
            pairATeamName,
            pairBTeamName,
            pairATeamEmoji,
            pairBTeamEmoji,
            holeResultsParsed: JSON.parse(m.holeResults || "[]"),
          };
        }));
        return enriched;
      }),

    // Get hole-by-hole 4BBB scores for a match (for the detailed view)
    getHoleByHole: publicProcedure
      .input(z.object({ matchId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { matchPlayResults: mpr, scores: scoresTable, holes: holesTable, rounds: roundsTable, groupPlayers: gpTable, tripPlayers: tpTable, users: usersTable, groups: grpTable } = await import("../drizzle/schema");
        const { eq: eqOp, inArray: inArr, and: andOp } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return null;
        const matchRows = await db.select().from(mpr).where(eqOp(mpr.id, input.matchId)).limit(1);
        if (!matchRows[0]) return null;
        const m = matchRows[0];
        const pairAIds = [m.player1Id, m.player1PartnerId].filter(Boolean) as number[];
        const pairBIds = [m.player2Id, m.player2PartnerId].filter(Boolean) as number[];
        const allIds = [...pairAIds, ...pairBIds];
        // Get round + course holes
        const roundRow = await db.select().from(roundsTable).where(eqOp(roundsTable.id, m.roundId)).limit(1);
        if (!roundRow[0]) return null;
        const courseHoles = await db.select().from(holesTable).where(eqOp(holesTable.courseId, roundRow[0].courseId)).orderBy(holesTable.holeNumber);
        // Get all scores for these players in this round
        const allScores = await db.select().from(scoresTable).where(andOp(eqOp(scoresTable.roundId, m.roundId), inArr(scoresTable.userId, allIds)));
        // Get player display names
        const grpRow = await db.select().from(grpTable).where(eqOp(grpTable.id, m.groupId)).limit(1);
        const tripId = grpRow[0]?.tripId;
        const userRows = await db.select().from(usersTable).where(inArr(usersTable.id, allIds));
        const userMap = new Map(userRows.map(u => [u.id, u.name ?? `Player ${u.id}`]));
        let nicknameMap = new Map<number, string>();
        if (tripId) {
          const tpRows = await db.select({ userId: tpTable.userId, nickname: tpTable.nickname })
            .from(tpTable).where(andOp(eqOp(tpTable.tripId, tripId), inArr(tpTable.userId, allIds)));
          nicknameMap = new Map(tpRows.map(r => [r.userId, r.nickname ?? userMap.get(r.userId) ?? `Player ${r.userId}`]));
        }
        const gpRows = await db.select({ userId: gpTable.userId, teamName: gpTable.teamName, teamEmoji: gpTable.teamEmoji })
          .from(gpTable).where(andOp(eqOp(gpTable.groupId, m.groupId), inArr(gpTable.userId, allIds)));
        const teamNameMap = new Map(gpRows.map(r => [r.userId, r.teamName ?? null]));
        const teamEmojiMapH = new Map(gpRows.map(r => [r.userId, r.teamEmoji ?? null]));
        const displayName = (id: number) => nicknameMap.get(id) ?? userMap.get(id) ?? `Player ${id}`;
        // Build hole-by-hole data
        const holeData = courseHoles.map((hole) => {
          const pairAScores = allScores.filter(s => pairAIds.includes(s.userId) && s.holeId === hole.id);
          const pairBScores = allScores.filter(s => pairBIds.includes(s.userId) && s.holeId === hole.id);
          const bestAPoints = pairAScores.length > 0 ? Math.max(...pairAScores.map(s => s.stablefordPoints)) : null;
          const bestBPoints = pairBScores.length > 0 ? Math.max(...pairBScores.map(s => s.stablefordPoints)) : null;
          const bestAGross = pairAScores.length > 0 ? Math.min(...pairAScores.map(s => s.grossScore)) : null;
          const bestBGross = pairBScores.length > 0 ? Math.min(...pairBScores.map(s => s.grossScore)) : null;
          let holeResult: "A" | "B" | "H" | null = null;
          if (bestAPoints !== null && bestBPoints !== null) {
            holeResult = bestAPoints > bestBPoints ? "A" : bestAPoints < bestBPoints ? "B" : "H";
          }
          return {
            holeNumber: hole.holeNumber,
            par: hole.par,
            strokeIndex: hole.strokeIndex,
            pairABestPoints: bestAPoints,
            pairBBestPoints: bestBPoints,
            pairABestGross: bestAGross,
            pairBBestGross: bestBGross,
            result: holeResult,
          };
        });
        return {
          matchId: m.id,
          matchStatus: m.matchStatus,
          winner: m.winner,
          pairAIds,
          pairBIds,
          pairANames: pairAIds.map(id => displayName(id)),
          pairBNames: pairBIds.map(id => displayName(id)),
          pairATeamName: teamNameMap.get(m.player1Id) ?? null,
          pairBTeamName: teamNameMap.get(m.player2Id) ?? null,
          pairATeamEmoji: teamEmojiMapH.get(m.player1Id) ?? null,
          pairBTeamEmoji: teamEmojiMapH.get(m.player2Id) ?? null,
          holes: holeData,
        };
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
        // Apply mercy rule cap if enabled for this round
        let effectiveGross = input.grossScore;
        const round = await getRound(input.roundId);
        if (round?.mercyRuleEnabled) {
          const maxScore = input.par + (round.mercyRuleStrokes ?? 5);
          if (effectiveGross > maxScore) effectiveGross = maxScore;
        }

        const netScore = calculateNetScore(effectiveGross, input.handicap, input.strokeIndex);
        const stablefordPoints = calculateStablefordPoints(netScore, input.par);

        await upsertScore({
          roundId: input.roundId,
          userId: input.userId,
          holeId: input.holeId,
          grossScore: effectiveGross,
          netScore,
          stablefordPoints,
          mercyCapped: effectiveGross !== input.grossScore,
        });
        await recalcMatchesForPlayerScore(input.roundId, input.userId);

        // Detect achievement (use original gross so eagles/HIO aren't suppressed)
        const achievementType = detectAchievement(input.grossScore, input.par);

        return {
          netScore,
          stablefordPoints,
          achievementType,
          mercyCapped: effectiveGross !== input.grossScore,
          cappedTo: effectiveGross !== input.grossScore ? effectiveGross : undefined,
        };
      }),

    getScorecard: publicProcedure
      .input(z.object({ roundId: z.number() }))
      .query(({ input }) => getRoundScorecard(input.roundId)),

    adminCorrect: adminProcedure
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
        await recalcMatchesForPlayerScore(input.roundId, input.userId);
        // Detect achievement so the frontend can prompt for confirmation
        const achievementType = detectAchievement(input.grossScore, input.par);
        return { netScore, stablefordPoints, achievementType };
      }),

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

        // Send Web Push notification to all trip subscribers
        sendPushToTrip(input.tripId, {
          title: "🏌️ Achievement!",
          body: message,
          tag: `achievement-${achievement.id}`,
        }).catch(() => {}); // fire-and-forget, don't block response

        return { success: true, message };
      }),

    listByTrip: publicProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ input }) => {
        const achievementList = await getAchievementsByTrip(input.tripId);
        return achievementList;
      }),

    listByPlayer: protectedProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        // If no userId provided, return for the current user
        const targetUserId = input.userId ?? ctx.user.id;
        return getAchievementsByPlayer(targetUserId);
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

        // Per-round scoring mode overrides trip-level handicapMode
        const roundScoringMode = (round as any).individualScoringMode ?? trip?.handicapMode ?? "stableford";

        // Effective baseline = trip baseline + round daily adjustment
        const tripBaseline = trip?.handicapBaseline ?? 0;
        const effectiveBaseline = tripBaseline === 0
          ? (roundScoringMode === "stableford" ? 34 : 70)
          : tripBaseline + (round.dailyAdjustment ?? 0);

        const individualRows = scorecard
          .filter((p) => p.holesPlayed > 0)
          .map((player) => {
            const scoresByHole = new Map(player.scores.map((score) => [score.holeId, score]));
            return {
              ...player,
              stablefordCountback: calculateCountback(courseHoles.map((hole) => ({
                holeNumber: hole.holeNumber,
                value: scoresByHole.get(hole.id)?.stablefordPoints ?? null,
              }))),
              netCountback: calculateCountback(courseHoles.map((hole) => ({
                holeNumber: hole.holeNumber,
                value: scoresByHole.get(hole.id)?.netScore ?? null,
              }))),
            };
          });

        // The tournament mode determines both the primary total and standard countback direction.
        const strokePlay = [...individualRows]
          .sort((a, b) => roundScoringMode === "net_stroke"
            ? a.totalNet - b.totalNet || compareCountback(a.netCountback, b.netCountback, "lower")
            : b.totalStableford - a.totalStableford || compareCountback(a.stablefordCountback, b.stablefordCountback, "higher"))
          .map((p, i) => ({ ...p, position: i + 1 }));

        // 4BBB leaderboard — group by partnerships
        const groupList = await getGroupsByRound(input.roundId);
        const fourBBBResults: {
          teamKey: string;
          teamName: string;
          player1: string;
          player2: string;
          totalBestBall: number;
          holesPlayed: number;
          countback: ReturnType<typeof calculateCountback>;
          position: number;
        }[] = [];

        if (round.fourBBBEnabled) {
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

              let totalBestBall = 0;
              let holesPlayed = 0;
              const holePoints: Array<{ holeNumber: number; value: number | null }> = [];

              for (const hole of courseHoles) {
                const s1 = p1.scores.find((s) => s.holeId === hole.id);
                const s2 = p2.scores.find((s) => s.holeId === hole.id);
                const bestBall = calculate4BBBStablefordPoints(s1?.stablefordPoints ?? null, s2?.stablefordPoints ?? null);
                holePoints.push({ holeNumber: hole.holeNumber, value: bestBall });
                if (bestBall !== null) {
                  totalBestBall += bestBall;
                  holesPlayed++;
                }
              }

              fourBBBResults.push({
                teamKey: [gp.userId, gp.partnerId].sort((a, b) => a - b).join("-"),
                teamName: `${p1.userName ?? "Player"} & ${p2.userName ?? "Player"}`,
                player1: p1.userName ?? "Player",
                player2: p2.userName ?? "Player",
                totalBestBall,
                holesPlayed,
                countback: calculateCountback(holePoints),
                position: 0,
              });
            }
          }
          fourBBBResults.sort((a, b) => b.totalBestBall - a.totalBestBall || compareCountback(a.countback, b.countback, "higher"));
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

        // Achievement counts per player for this round
        const roundAchievements = await getAchievementsByRound(input.roundId);
        const achievementCounts: Record<number, { hio: number; eagle: number; birdie: number }> = {};
        for (const a of roundAchievements) {
          if (!achievementCounts[a.userId]) achievementCounts[a.userId] = { hio: 0, eagle: 0, birdie: 0 };
          if (a.type === "hole_in_one") achievementCounts[a.userId].hio++;
          else if (a.type === "eagle") achievementCounts[a.userId].eagle++;
          else if (a.type === "birdie") achievementCounts[a.userId].birdie++;
        }
        const strokePlayWithAch = strokePlay.map((p) => ({
          ...p,
          achievements: achievementCounts[p.userId] ?? { hio: 0, eagle: 0, birdie: 0 },
          hasMercyCappedScore: p.scores.some((s) => s.mercyCapped),
        }));

        return { round, trip, roundScoringMode, strokePlay: strokePlayWithAch, fourBBB: fourBBBResults, skins: skinsResults, effectiveBaseline };
      }),

        trip: publicProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ input }) => {
        const leaderboard = await getTripLeaderboard(input.tripId);
        // Cumulative achievement counts per player across the whole trip
        const tripAchievements = await getAchievementsByTrip(input.tripId);
        const achMap: Record<number, { hio: number; eagle: number; birdie: number }> = {};
        for (const a of tripAchievements) {
          if (!achMap[a.userId]) achMap[a.userId] = { hio: 0, eagle: 0, birdie: 0 };
          if (a.type === "hole_in_one") achMap[a.userId].hio++;
          else if (a.type === "eagle") achMap[a.userId].eagle++;
          else if (a.type === "birdie") achMap[a.userId].birdie++;
        }
        const withAch = leaderboard.map((p) => ({ ...p, achievements: achMap[p.userId] ?? { hio: 0, eagle: 0, birdie: 0 } }));
        const strokePlay = [...withAch]
          .sort((a, b) => a.cumulativeNet - b.cumulativeNet || compareCountback(a.netCountback, b.netCountback, "lower"))
          .map((p, i) => ({ ...p, position: i + 1 }));
        const stableford = [...withAch]
          .sort((a, b) => b.cumulativeStableford - a.cumulativeStableford || compareCountback(a.stablefordCountback, b.stablefordCountback, "higher"))
          .map((p, i) => ({ ...p, position: i + 1 }));
        const fourBBB = await getTripFourBBBLeaderboard(input.tripId);
        const ambrose = await getTripAmbroseLeaderboard(input.tripId);
        const hasAmbroseRound = ambrose.length > 0;
        const hasFourBBBRound = fourBBB.length > 0;

        // Best Day leaderboard — each player's single best round
        const bestDayStableford = [...withAch]
          .filter((p) => p.rounds.length > 0)
          .map((p) => ({
            ...p,
            bestDayStableford: p.rounds.length > 0 ? Math.max(...p.rounds.map((r) => r.totalStableford)) : 0,
            position: 0,
          }))
          .sort((a, b) => b.bestDayStableford - a.bestDayStableford || compareCountback(a.stablefordCountback, b.stablefordCountback, "higher"))
          .map((p, i) => ({ ...p, position: i + 1 }));
        const bestDayStroke = [...withAch]
          .filter((p) => p.rounds.some((r) => r.holesPlayed > 0))
          .map((p) => {
            const played = p.rounds.filter((r) => r.holesPlayed > 0);
            return {
              ...p,
              bestDayNet: played.length > 0 ? Math.min(...played.map((r) => r.totalNet)) : 9999,
              position: 0,
            };
          })
          .sort((a, b) => a.bestDayNet - b.bestDayNet || compareCountback(a.netCountback, b.netCountback, "lower"))
          .map((p, i) => ({ ...p, position: i + 1 }));

        const trip = await getTrip(input.tripId);
        const individualScoringMode = (trip as any)?.handicapMode ?? "stableford";
        const tournamentType = (trip as any)?.tournamentType ?? "stableford";
        const isMatchPlayTrip = tournamentType === "matchplay";
        const pennantLeaderboard = isMatchPlayTrip ? await getTripPennantLeaderboard(input.tripId) : [];
        const hasMatchPlayRound = pennantLeaderboard.length > 0;

        return { strokePlay, stableford, fourBBB, ambrose, hasAmbroseRound, hasFourBBBRound, bestDayStableford, bestDayStroke, individualScoringMode, tournamentType, pennantLeaderboard, hasMatchPlayRound };
      }),

    fourBBBPairScorecard: publicProcedure
      .input(z.object({ roundId: z.number(), player1Id: z.number(), player2Id: z.number() }))
      .query(async ({ input }) => {
        const scorecard = await getFourBBBPairScorecard(input.roundId, input.player1Id, input.player2Id);
        if (!scorecard) throw new TRPCError({ code: "NOT_FOUND", message: "4BBB pair scorecard not found" });
        return scorecard;
      }),
  }),

  // ─── Side Matches ─────────────────────────────────────────────────────────

  sideMatches: router({
    list: publicProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ input }) => {
        const matches = await getSideMatchesByRound(input.roundId);
        // Enrich players with display names
        const round = await getRound(input.roundId);
        const { users: usersTable, tripPlayers: tpTable } = await import("../drizzle/schema");
        const { eq: eqOp, inArray: inArr, and: andOp } = await import("drizzle-orm");
        const { getDb } = await import("./db");
        const db = await getDb();
        return Promise.all(
          matches.map(async (m) => {
            const rawPlayers = await getSideMatchPlayers(m.id);
            if (!db || !round) return { ...m, players: rawPlayers.map(p => ({ ...p, displayName: `Player ${p.userId}` })) };
            const ids = rawPlayers.map(p => p.userId);
            const userRows = ids.length > 0 ? await db.select().from(usersTable).where(inArr(usersTable.id, ids)) : [];
            const userMap = new Map(userRows.map(u => [u.id, u.name ?? `Player ${u.id}`]));
            const tpRows = ids.length > 0 ? await db.select({ userId: tpTable.userId, nickname: tpTable.nickname }).from(tpTable).where(andOp(eqOp(tpTable.tripId, round.tripId), inArr(tpTable.userId, ids))) : [];
            const nickMap = new Map(tpRows.map(r => [r.userId, r.nickname ?? userMap.get(r.userId) ?? `Player ${r.userId}`]));
            return {
              ...m,
              players: rawPlayers.map(p => ({ ...p, displayName: nickMap.get(p.userId) ?? userMap.get(p.userId) ?? `Player ${p.userId}` })),
            };
          })
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

    dailyResults: publicProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ input }) => getDailySideMatchResults(input.roundId)),

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

    getByRound: publicProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ input }) => {
        const results = await getMatchPlayResultsByRound(input.roundId);
        if (results.length === 0) return [];
        // Enrich with player display names
        const { users: usersTable, tripPlayers: tpTable, rounds: roundsTable } = await import("../drizzle/schema");
        const { eq: eqOp, inArray: inArr, and: andOp } = await import("drizzle-orm");
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return results.map(r => ({ ...r, player1Name: `Player ${r.player1Id}`, player2Name: `Player ${r.player2Id}`, player1PartnerName: r.player1PartnerId ? `Player ${r.player1PartnerId}` : null, player2PartnerName: r.player2PartnerId ? `Player ${r.player2PartnerId}` : null }));
        const roundRow = await db.select().from(roundsTable).where(eqOp(roundsTable.id, input.roundId)).limit(1);
        const tripId = roundRow[0]?.tripId;
        const allIdsSet = new Set<number>();
        for (const r of results) { [r.player1Id, r.player2Id, r.player1PartnerId, r.player2PartnerId].forEach(id => { if (id != null) allIdsSet.add(id); }); }
        const allIds = Array.from(allIdsSet);
        const userRows = allIds.length > 0 ? await db.select().from(usersTable).where(inArr(usersTable.id, allIds)) : [];
        const userMap = new Map(userRows.map(u => [u.id, u.name ?? `Player ${u.id}`]));
        let nickMap = new Map<number, string>();
        if (tripId && allIds.length > 0) {
          const tpRows = await db.select({ userId: tpTable.userId, nickname: tpTable.nickname }).from(tpTable).where(andOp(eqOp(tpTable.tripId, tripId), inArr(tpTable.userId, allIds)));
          nickMap = new Map(tpRows.map(r => [r.userId, r.nickname ?? userMap.get(r.userId) ?? `Player ${r.userId}`]));
        }
        const displayName = (id: number | null) => id ? (nickMap.get(id) ?? userMap.get(id) ?? `Player ${id}`) : null;
        return results.map(r => ({
          ...r,
          player1Name: displayName(r.player1Id),
          player2Name: displayName(r.player2Id),
          player1PartnerName: displayName(r.player1PartnerId ?? null),
          player2PartnerName: displayName(r.player2PartnerId ?? null),
        }));
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
      .input(z.object({ tripId: z.number(), limit: z.number().default(50), beforeId: z.number().optional(), search: z.string().trim().max(100).optional() }))
      .query(async ({ input, ctx }) => {
        await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const messages = await getTripMessages(input.tripId, input.limit, input.beforeId, ctx.user.id, input.search);
        return messages.reverse(); // Return oldest-first for display
      }),

    sendMessage: protectedProcedure
      .input(z.object({
        tripId: z.number(),
        parentMessageId: z.number().optional(),
        message: z.string().max(1000),
        isAnnouncement: z.boolean().default(false),
        mentionedUserIds: z.array(z.number()).max(10).optional(),
        attachments: z.array(z.object({ imageUrl: z.string().max(1024), imageKey: z.string().max(1024), imageAlt: z.string().max(180).optional(), caption: z.string().trim().max(240).optional() }).refine((attachment) => isTripChatImageReference(attachment.imageUrl, attachment.imageKey), { message: "Invalid image attachment" })).max(4).optional(),
        imageUrl: z.string().max(1024).optional(),
        imageKey: z.string().max(1024).optional(),
        imageAlt: z.string().max(180).optional(),
      }).refine((value) => value.message.trim().length > 0 || Boolean(value.imageUrl) || Boolean(value.attachments?.length), { message: "Add a comment or image" })
        .refine((value) => !value.imageUrl || isTripChatImageReference(value.imageUrl, value.imageKey), { message: "Invalid image attachment" }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const attachments = input.attachments?.length ? input.attachments : input.imageUrl && input.imageKey ? [{ imageUrl: input.imageUrl, imageKey: input.imageKey, imageAlt: input.imageAlt }] : undefined;
        const roster = await getTripPlayers(input.tripId);
        const rosterUserIds = new Set(roster.map((player) => player.userId));
        const mentionedUserIds = normaliseTripChatMentionedUserIds(input.mentionedUserIds, ctx.user.id).filter((userId) => rosterUserIds.has(userId));
        if (input.isAnnouncement) await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        if (input.parentMessageId) {
          const parent = await getTripChatMessage(input.parentMessageId);
          if (!parent || parent.tripId !== input.tripId || parent.parentMessageId !== null) throw new TRPCError({ code: "BAD_REQUEST", message: "Replies must belong to a top-level Trip Chat message." });
        }
        const id = await sendTripMessage({
          tripId: input.tripId,
          userId: ctx.user.id,
          parentMessageId: input.parentMessageId,
          message: input.message.trim(),
          isAnnouncement: input.isAnnouncement,
          attachments,
          mentionedUserIds,
        });
        if (mentionedUserIds.length) void sendPushToUsers(mentionedUserIds, { title: `${ctx.user.name ?? "A trip player"} mentioned you`, body: input.message.trim() || "You were tagged in a Trip Chat message.", tag: `chat-mention-${id}`, url: `/trip/${input.tripId}/chat` });
        if (input.isAnnouncement) void sendPushToTrip(input.tripId, { title: "Trip announcement", body: input.message.trim(), tag: `trip-announcement-${id}`, url: `/trip/${input.tripId}/chat` });
        return { id };
      }),
    updateOwnMessage: protectedProcedure
      .input(z.object({ tripId: z.number(), messageId: z.number(), message: z.string().trim().min(1).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const existing = await getTripChatMessage(input.messageId);
        if (!existing || existing.tripId !== input.tripId || existing.userId !== ctx.user.id || existing.deletedAt) throw new TRPCError({ code: "FORBIDDEN", message: "Only the message author can edit this message." });
        await updateTripChatMessage(input.messageId, input.message);
        return { success: true };
      }),
    deleteOwnMessage: protectedProcedure
      .input(z.object({ tripId: z.number(), messageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const existing = await getTripChatMessage(input.messageId);
        if (!existing || existing.tripId !== input.tripId || existing.userId !== ctx.user.id || existing.deletedAt) throw new TRPCError({ code: "FORBIDDEN", message: "Only the message author can delete this message." });
        await softDeleteTripChatMessage(input.messageId);
        return { success: true };
      }),
    mentionablePlayers: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ input, ctx }) => {
        await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const players = await getTripPlayers(input.tripId);
        return players.filter((player) => player.userId !== ctx.user.id).map((player) => ({ userId: player.userId, displayName: player.nickname ?? player.user?.name ?? "Player" }));
      }),
    unreadMentions: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        return getUnreadTripChatMentions(input.tripId, ctx.user.id);
      }),
    markMentionsRead: protectedProcedure
      .input(z.object({ tripId: z.number(), mentionIds: z.array(z.number()).max(100) }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        await markTripChatMentionsRead(input.tripId, ctx.user.id, [...new Set(input.mentionIds)]);
        return { success: true };
      }),
    pinnedMessages: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        return getPinnedTripMessages(input.tripId);
      }),
    setPinned: protectedProcedure
      .input(z.object({ tripId: z.number(), messageId: z.number(), pinned: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const message = await getTripChatMessage(input.messageId);
        if (!message || message.tripId !== input.tripId || message.parentMessageId !== null) throw new TRPCError({ code: "NOT_FOUND", message: "Chat message not found" });
        await setTripChatMessagePinned(input.messageId, ctx.user.id, input.pinned);
        return { success: true };
      }),

    toggleReaction: protectedProcedure
      .input(z.object({ tripId: z.number(), messageId: z.number(), emoji: z.enum(["👍", "❤️", "😂", "⛳"]) }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const message = await getTripChatMessage(input.messageId);
        if (!message || message.tripId !== input.tripId) throw new TRPCError({ code: "NOT_FOUND", message: "Chat message not found" });
        return { active: await toggleTripMessageReaction(input.messageId, ctx.user.id, input.emoji) };
      }),

    updateAttachmentCaption: protectedProcedure
      .input(z.object({ tripId: z.number(), attachmentId: z.number(), caption: z.string().trim().max(240).optional() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const result = await getTripChatAttachment(input.attachmentId);
        if (!result || result.tripId !== input.tripId || result.attachment.isRemoved) throw new TRPCError({ code: "NOT_FOUND", message: "Attachment not found" });
        if (!canManageTripChatAttachment(result.messageUserId, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "Only the photo author can edit its caption" });
        await updateTripChatAttachmentCaption(input.attachmentId, input.caption?.trim() || undefined);
        return { success: true };
      }),

    deleteOwnAttachment: protectedProcedure
      .input(z.object({ tripId: z.number(), attachmentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const result = await getTripChatAttachment(input.attachmentId);
        if (!result || result.tripId !== input.tripId || result.attachment.isRemoved) throw new TRPCError({ code: "NOT_FOUND", message: "Attachment not found" });
        if (!canManageTripChatAttachment(result.messageUserId, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "Only the photo author can remove it" });
        await removeTripChatAttachment(input.attachmentId, ctx.user.id, input.tripId);
        return { success: true };
      }),

    reportAttachment: protectedProcedure
      .input(z.object({ tripId: z.number(), attachmentId: z.number(), reason: z.string().trim().max(600).optional() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const result = await getTripChatAttachment(input.attachmentId);
        if (!result || result.tripId !== input.tripId || result.attachment.isRemoved) throw new TRPCError({ code: "NOT_FOUND", message: "Attachment not found" });
        const id = await createTripChatAttachmentReport({ tripId: input.tripId, attachmentId: input.attachmentId, reporterUserId: ctx.user.id, reason: input.reason?.trim() || undefined });
        return { id };
      }),

    moderationStatus: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const trip = await getTrip(input.tripId);
        return { canModerate: ctx.user.role === "admin" || trip?.createdBy === ctx.user.id || await isCoAdminForTrip(ctx.user.id, input.tripId) };
      }),

    listAttachmentReports: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        return getTripChatAttachmentReports(input.tripId);
      }),

    listModerationAudit: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        return getTripChatModerationAudit(input.tripId);
      }),

    removeAttachment: protectedProcedure
      .input(z.object({ tripId: z.number(), attachmentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const result = await getTripChatAttachment(input.attachmentId);
        if (!result || result.tripId !== input.tripId) throw new TRPCError({ code: "NOT_FOUND", message: "Attachment not found" });
        await removeTripChatAttachment(input.attachmentId, ctx.user.id, input.tripId);
        return { success: true };
      }),

    dismissAttachmentReport: protectedProcedure
      .input(z.object({ tripId: z.number(), reportId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const reports = await getTripChatAttachmentReports(input.tripId);
        if (!reports.some((entry) => entry.report.id === input.reportId)) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
        await dismissTripChatAttachmentReport(input.reportId, ctx.user.id, input.tripId);
        return { success: true };
      }),

    recordPhotoAction: protectedProcedure
      .input(z.object({ tripId: z.number(), attachmentId: z.number(), action: z.enum(["download", "share"]) }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const result = await getTripChatAttachment(input.attachmentId);
        if (!result || result.tripId !== input.tripId || result.attachment.isRemoved) throw new TRPCError({ code: "NOT_FOUND", message: "Attachment not found" });
        await recordTripChatPhotoAction(input);
        return { success: true };
      }),

    photoActionSummary: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        return getTripChatPhotoActionSummary(input.tripId);
      }),

    photoActionMonthlyTrend: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        return getTripChatPhotoActionMonthlyTrend(input.tripId);
      }),
  }),

  tripAppearance: router({
    list: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripChatAccess(ctx.user.id, input.tripId, ctx.user.role === "admin");
        return getTripAppearanceSchedules(input.tripId);
      }),

    set: protectedProcedure
      .input(z.object({ tripId: z.number(), appearanceDate: z.string().datetime(), colorScheme: z.enum(APP_COLOR_SCHEME_IDS), replaceExisting: z.boolean().default(false) }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const date = new Date(input.appearanceDate);
        const existing = (await getTripAppearanceSchedules(input.tripId)).find((schedule) => schedule.appearanceDate.getTime() === date.getTime());
        if (existing && !input.replaceExisting) throw new TRPCError({ code: "CONFLICT", message: "A theme is already scheduled for this date. Confirm replacement to continue." });
        return { id: await setTripAppearanceSchedule({ tripId: input.tripId, appearanceDate: date, colorScheme: input.colorScheme }) };
      }),

    listTemplates: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        return getTripAppearanceTemplates(input.tripId);
      }),

    createTemplate: protectedProcedure
      .input(z.object({ tripId: z.number(), name: z.string().trim().min(2).max(64), colorScheme: z.enum(APP_COLOR_SCHEME_IDS) }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        return { id: await createTripAppearanceTemplate({ ...input, createdByUserId: ctx.user.id }) };
      }),

    removeTemplate: protectedProcedure
      .input(z.object({ tripId: z.number(), id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const templates = await getTripAppearanceTemplates(input.tripId);
        if (!templates.some((template) => template.id === input.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Appearance template not found" });
        await deleteTripAppearanceTemplate(input.id);
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ tripId: z.number(), id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripChatModerator(ctx.user.id, input.tripId, ctx.user.role === "admin");
        const schedules = await getTripAppearanceSchedules(input.tripId);
        if (!schedules.some((schedule) => schedule.id === input.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Appearance schedule not found" });
        await deleteTripAppearanceSchedule(input.id);
        return { success: true };
      }),

    copyToTrip: protectedProcedure
      .input(z.object({ sourceTripId: z.number(), targetTripId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (input.sourceTripId === input.targetTripId) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a different target trip" });
        await assertTripChatModerator(ctx.user.id, input.sourceTripId, ctx.user.role === "admin");
        await assertTripChatModerator(ctx.user.id, input.targetTripId, ctx.user.role === "admin");
        const copied = await copyTripAppearanceSchedules(input.sourceTripId, input.targetTripId, copyAppearanceDateToTrip);
        return { copied };
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
          tripRules: (trip as any).rules ?? undefined,
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
        // Promote any pending invite placeholder slots in groups/teams to this userId
        await promoteInviteSlots(invite.id, ctx.user.id, invite.tripId);
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

  // ─── Custom Awards ──────────────────────────────────────────────────────────────
  awards: router({
    // List all awards for a trip (with winner if assigned)
    list: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ input }) => {
        return getAwardsByTrip(input.tripId);
      }),

    // Admin: create a new award
    create: adminProcedure
      .input(z.object({
        tripId: z.number(),
        roundId: z.number().nullable().optional(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        prize: z.string().optional(),
        category: z.enum(["individual", "team"]),
        position: z.enum(["top1", "top2", "top3", "top4", "top5", "last"]),
        scope: z.enum(["daily", "overall"]),
      }))
      .mutation(async ({ input }) => {
        const id = await createAward({
          tripId: input.tripId,
          roundId: input.roundId ?? null,
          name: input.name,
          description: input.description ?? null,
          prize: input.prize ?? null,
          category: input.category,
          position: input.position,
          scope: input.scope,
        });
        return { id };
      }),

    // Admin: update an award
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().nullable().optional(),
        prize: z.string().nullable().optional(),
        category: z.enum(["individual", "team"]).optional(),
        position: z.enum(["top1", "top2", "top3", "top4", "top5", "last"]).optional(),
        scope: z.enum(["daily", "overall"]).optional(),
        roundId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateAward(id, data);
        return { success: true };
      }),

    // Admin: delete an award (also removes winner)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteAward(input.id);
        return { success: true };
      }),

    // Admin: assign or clear the winner for an award
    assignWinner: adminProcedure
      .input(z.object({
        awardId: z.number(),
        tripPlayerId: z.number().nullable(),
        groupPlayerId: z.number().nullable(),
        displayName: z.string(),
      }))
      .mutation(async ({ input }) => {
        await assignAwardWinner(input.awardId, input.tripPlayerId, input.groupPlayerId, input.displayName);
        return { success: true };
      }),
  }),

  // ─── Long Drive ────────────────────────────────────────────────────────────────────
  longDrive: router({
    // Admin: enable/disable long drive and set hole for a round
    configure: adminProcedure
      .input(z.object({
        roundId: z.number(),
        enabled: z.boolean(),
        holeNumber: z.number().min(1).max(18).nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq: eqOp } = await import("drizzle-orm");
        const { rounds: roundsTable } = await import("../drizzle/schema");
        await db.update(roundsTable)
          .set({ longDriveEnabled: input.enabled, longDriveHole: input.holeNumber ?? null })
          .where(eqOp(roundsTable.id, input.roundId));
        return { success: true };
      }),

    // All players: get leaderboard for a round
    getLeaderboard: protectedProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ input }) => {
        return getLongDriveLeaderboard(input.roundId);
      }),

    // Player: submit distance-to-pin entry
    submitEntry: protectedProcedure
      .input(z.object({
        roundId: z.number(),
        distanceToPinM: z.number().int().min(1).max(600),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get the round to find hole distance
        const round = await getRound(input.roundId);
        if (!round) throw new TRPCError({ code: "NOT_FOUND", message: "Round not found" });
        if (!round.longDriveEnabled) throw new TRPCError({ code: "BAD_REQUEST", message: "Long drive is not enabled for this round" });
        if (!round.longDriveHole) throw new TRPCError({ code: "BAD_REQUEST", message: "Long drive hole not configured" });

        // Get hole distance for the long drive hole
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq: eqOp } = await import("drizzle-orm");
        const { holes: holesTable } = await import("../drizzle/schema");
        const [hole] = await db.select()
          .from(holesTable)
          .where(eqOp(holesTable.courseId, round.courseId))
          .then((rows) => rows.filter((h) => h.holeNumber === round.longDriveHole!));

        if (!hole) throw new TRPCError({ code: "NOT_FOUND", message: `Hole ${round.longDriveHole} not found for this course` });

        // Hole distance: use par as proxy if no distance stored, but we need actual distance.
        // We'll use a standard distance based on par (par3=150m, par4=350m, par5=480m) if not stored.
        // If the holes table has a distance field, use it; otherwise use par-based estimate.
        const holeDistanceM = (hole as any).distanceM ?? (hole.par === 3 ? 150 : hole.par === 4 ? 350 : 480);

        // Get tripPlayerId
        const tripPlayer = await getTripPlayer(round.tripId, ctx.user.id);
        if (!tripPlayer) throw new TRPCError({ code: "NOT_FOUND", message: "You are not a player in this trip" });

        let driveDistanceM: number;
        let isNewLeader: boolean;
        let entryId: number;
        try {
          ({ driveDistanceM, isNewLeader, entryId } = await submitLongDriveEntry(
            input.roundId,
            ctx.user.id,
            tripPlayer.id,
            input.distanceToPinM,
            holeDistanceM
          ));
        } catch (err: any) {
          if (typeof err?.message === "string" && err.message.startsWith("DOES_NOT_BEAT_LEADER:")) {
            const leaderDistM = Number(err.message.split(":")[1]);
            const leaderDistYds = Math.round(leaderDistM * 1.09361);
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Drive not recorded — must beat the current leader (${leaderDistM}m / ${leaderDistYds}yds). Only drives that take the lead are recorded.`,
            });
          }
          throw err;
        }

        // Broadcast achievement if new leader
        if (isNewLeader) {
          const playerName = tripPlayer.nickname ?? ctx.user.name ?? "A player";
          const msg = `💨 New Long Drive Leader! ${playerName} — ${driveDistanceM}m on Hole ${round.longDriveHole}`;
          await createNotification({ tripId: round.tripId, message: msg, type: "achievement" });
          await sendPushToTrip(round.tripId, {
            title: "💨 New Long Drive Leader!",
            body: `${playerName} — ${driveDistanceM}m on Hole ${round.longDriveHole}`,
            tag: `long-drive-${round.id}`,
          });
          await markLongDriveBroadcast(entryId);
        }

        return { driveDistanceM, isNewLeader };
      }),
    // Admin: get all long drive entries grouped by hole for a round
    getByRound: protectedProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) return [];
        const { eq: eqOp, desc: descOp } = await import("drizzle-orm");
        const { longDriveEntries: ldTable, tripPlayers: tpTable, users: usersTable } = await import("../drizzle/schema");
        const entries = await db
          .select()
          .from(ldTable)
          .where(eqOp(ldTable.roundId, input.roundId))
          .orderBy(descOp(ldTable.driveDistanceM));
        const enriched = await Promise.all(entries.map(async (e) => {
          const [tp] = await db.select().from(tpTable).where(eqOp(tpTable.id, e.tripPlayerId));
          const user = tp ? (await db.select().from(usersTable).where(eqOp(usersTable.id, tp.userId)))[0] : null;
          const userName = tp?.nickname ?? user?.name ?? `Player ${e.userId}`;
          return {
            ...e,
            userName,
            driveDistanceYards: Math.round(e.driveDistanceM * 1.09361),
            distanceToPin: Math.round(e.distanceToPinM * 1.09361),
          };
        }));
        // Return all entries sorted by drive distance (no per-hole grouping since long drive is per-round)
        return enriched;
      }),
  }),

  // ─── Plans / Billing ────────────────────────────────────────────────────────
  // These procedures expose plan information to the frontend.
  // All gates currently return 'open' (BILLING_ENABLED = false in shared/plans.ts).
  // When billing goes live, update shared/plans.ts and wire Stripe webhooks.
  plans: router({
    // Returns the current user's plan tier and subscription status.
    getMyPlan: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { users: usersTable } = await import("../drizzle/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      const user = await database.select({
        planTier: usersTable.planTier,
        subscriptionStatus: usersTable.subscriptionStatus,
      }).from(usersTable).where(eqOp(usersTable.id, ctx.user.id)).limit(1);
      return user[0] ?? { planTier: "free" as const, subscriptionStatus: "none" as const };
    }),

    // Returns the plan tier for a specific trip.
    getTripPlan: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const database = await getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { trips: tripsTable } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        const trip = await database.select({
          tripPlanTier: tripsTable.tripPlanTier,
          planActivatedAt: tripsTable.planActivatedAt,
        }).from(tripsTable).where(eqOp(tripsTable.id, input.tripId)).limit(1);
        return trip[0] ?? { tripPlanTier: "free" as const, planActivatedAt: null };
      }),

    // Admin-only: manually override a trip's plan tier (for testing / comps).
    adminSetTripPlan: protectedProcedure
      .input(z.object({
        tripId: z.number(),
        tier: z.enum(["free", "tripPass", "clubPlan"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const { getDb } = await import("./db");
        const database = await getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { trips: tripsTable } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        await database.update(tripsTable)
          .set({
            tripPlanTier: input.tier,
            planActivatedAt: input.tier !== "free" ? new Date() : null,
          })
          .where(eqOp(tripsTable.id, input.tripId));
        return { success: true };
      }),

    // Admin-only: manually override a user's plan tier (for testing / gifting).
    adminSetUserPlan: protectedProcedure
      .input(z.object({
        userId: z.number(),
        tier: z.enum(["free", "playerPremium", "clubPlan"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const { getDb } = await import("./db");
        const database = await getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { users: usersTable } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        await database.update(usersTable)
          .set({ planTier: input.tier })
          .where(eqOp(usersTable.id, input.userId));
        return { success: true };
      }),
  }),

  // ─── Ambrose ──────────────────────────────────────────────────────────────
  ambrose: router({
    // Get the leaderboard for an Ambrose round (team standings)
    getLeaderboard: publicProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ input }) => {
        return getAmbroseLeaderboard(input.roundId);
      }),

    // Get Ambrose scores for a specific group in a round
    getGroupScores: publicProcedure
      .input(z.object({ roundId: z.number(), groupId: z.number() }))
      .query(async ({ input }) => {
        return getAmbroseScoresByGroup(input.roundId, input.groupId);
      }),

    // Submit a team hole score for Ambrose
    submitScore: protectedProcedure
      .input(z.object({
        roundId: z.number(),
        groupId: z.number(),
        holeId: z.number(),
        holeNumber: z.number(),
        grossScore: z.number().min(1).max(20),
        selectedDriveUserId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const round = await getRound(input.roundId);
        if (!round) throw new TRPCError({ code: "NOT_FOUND", message: "Round not found" });
        const courseHoles = await getHolesByCourse(round.courseId);
        const hole = courseHoles.find((h) => h.id === input.holeId);
        if (!hole) throw new TRPCError({ code: "NOT_FOUND", message: "Hole not found" });
        const gPlayers = await getGroupPlayers(input.groupId);
        const tripPlayerList = await getTripPlayers(round.tripId);
        const playerHandicaps = gPlayers.map((gp) => {
          const tp = tripPlayerList.find((t) => t.userId === gp.userId);
          return tp?.currentHandicap ?? 0;
        });
        let grossScore = input.grossScore;
        if ((round as any).mercyRuleEnabled) {
          const maxScore = hole.par + ((round as any).mercyRuleStrokes ?? 5);
          grossScore = Math.min(grossScore, maxScore);
        }
        const teamHandicap = calculateAmbroseTeamHandicap(playerHandicaps, gPlayers.length || (round as any).ambroseTeamSize || 4);
        const netScore = calculateAmbroseNetScore(grossScore, teamHandicap, hole.strokeIndex);
        const stablefordPoints = calculateStablefordPoints(netScore, hole.par);
        await upsertAmbroseScore({
          roundId: input.roundId,
          groupId: input.groupId,
          holeId: input.holeId,
          holeNumber: input.holeNumber,
          grossScore,
          netScore,
          stablefordPoints,
          selectedDriveUserId: input.selectedDriveUserId,
        });
        return { grossScore, netScore, stablefordPoints };
      }),

    // Get trip-level Ambrose leaderboard
    getTripLeaderboard: publicProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ input }) => {
        return getTripAmbroseLeaderboard(input.tripId);
      }),
  }),

  // ─── Pennant Match Play ─────────────────────────────────────────────────────
  pennant: router({
    // Get all teams (with players) for a round
    getTeams: publicProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ input }) => getPennantTeams(input.roundId)),

    // Create a team
    createTeam: protectedProcedure
      .input(z.object({ roundId: z.number(), name: z.string().min(1), emoji: z.string().default("🏌️") }))
      .mutation(async ({ input }) => {
        const id = await createPennantTeam(input.roundId, input.name, input.emoji);
        return { id };
      }),

    // Delete a team (also removes all its players)
    deleteTeam: protectedProcedure
      .input(z.object({ teamId: z.number() }))
      .mutation(async ({ input }) => deletePennantTeam(input.teamId)),

    // Assign a player to a team (moves them from any other team)
    assignPlayer: protectedProcedure
      .input(z.object({ teamId: z.number(), roundId: z.number(), userId: z.number().nullable().optional(), tripPlayerId: z.number().nullable().optional(), inviteId: z.number().optional() }))
      .mutation(async ({ input }) => assignPlayerToTeam(input.teamId, input.roundId, input.userId ?? null, input.tripPlayerId ?? null, input.inviteId)),

    // Remove a player from their team
    removePlayer: protectedProcedure
      .input(z.object({ roundId: z.number(), userId: z.number() }))
      .mutation(async ({ input }) => removePlayerFromTeam(input.roundId, input.userId)),

    // Get all fixtures (with hole results) for a round
    getFixtures: publicProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ input }) => getPennantFixtures(input.roundId)),

    // Create a fixture
    createFixture: protectedProcedure
      .input(z.object({
        roundId: z.number(),
        teamAId: z.number(),
        teamBId: z.number(),
        type: z.enum(["singles", "4bbb"]),
        useHandicap: z.boolean().default(true),
        player1AId: z.number(),
        player2AId: z.number().optional(),
        player1BId: z.number(),
        player2BId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createPennantFixture(input);
        return { id };
      }),

    // Delete a fixture
    deleteFixture: protectedProcedure
      .input(z.object({ fixtureId: z.number() }))
      .mutation(async ({ input }) => deletePennantFixture(input.fixtureId)),

    // Submit hole scores for a fixture hole
    submitHole: protectedProcedure
      .input(z.object({
        fixtureId: z.number(),
        holeNumber: z.number(),
        gross1A: z.number(),
        gross2A: z.number().optional(),
        gross1B: z.number(),
        gross2B: z.number().optional(),
        holeStrokeIndex: z.number(),
        holePar: z.number(),
      }))
      .mutation(async ({ input }) => {
        await submitPennantHoleScores(
          input.fixtureId, input.holeNumber,
          input.gross1A, input.gross2A ?? null,
          input.gross1B, input.gross2B ?? null,
          input.holeStrokeIndex, input.holePar
        );
      }),

    // Get team score summary (actual + estimated)
    getTeamScore: publicProcedure
      .input(z.object({ roundId: z.number() }))
      .query(async ({ input }) => getPennantTeamScore(input.roundId)),
  }),
});
export type AppRouter = typeof appRouter;
