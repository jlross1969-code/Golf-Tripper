import { Express, Request, Response } from "express";
import { generateScorecardPDF, generateTripResultsPDF, generateTeeSheetPDF, generateRoundSummaryPDF, generateSideMatchResultsPDF, ScorecardData, TripResultsData, TeeSheetData, TeeSheetPlayer, RoundSummaryData } from "./pdfExport";
import { calculate4BBBStablefordPoints, calculateSkins } from "../shared/scoring";
import { sdk } from "./_core/sdk";
import {
  getAchievementsByTrip,
  getAchievementsByRound,
  getGroupPlayers,
  getGroupsByRound,
  getHolesByCourse,
  getRound,
  getRoundsByTrip,
  getRoundScorecard,
  getScoresByRoundAndUser,
  getTrip,
  getTripPaymentSummary,
  getTripPlayers,
  getDailySideMatchResults,
} from "./db";

export function registerPdfRoutes(app: Express) {
  app.get("/api/export/payment-ledger/:tripId", async (req: Request, res: Response) => {
    try {
      const tripId = Number(req.params.tripId);
      if (!Number.isInteger(tripId)) return res.status(400).json({ error: "Invalid tripId" });
      const user = await sdk.authenticateRequest(req);
      const trip = await getTrip(tripId);
      if (!trip) return res.status(404).json({ error: "Trip not found" });
      if (user.role !== "admin" && trip.createdBy !== user.id && trip.financialManagerUserId !== user.id) return res.status(403).json({ error: "Financial manager access required" });
      const summary = await getTripPaymentSummary(tripId);
      const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
      const rows = [
        ["Player", "Trip price", "Confirmed", "Outstanding", "Payment status", "Payment amount", "Submitted", "Reviewed", "Note"],
        ...summary.flatMap((entry) => entry.payments.length ? entry.payments.map((payment) => [entry.displayName, (entry.priceCents / 100).toFixed(2), (entry.confirmedCents / 100).toFixed(2), (entry.outstandingCents / 100).toFixed(2), payment.status, (payment.amountCents / 100).toFixed(2), new Date(payment.createdAt).toISOString(), payment.reviewedAt ? new Date(payment.reviewedAt).toISOString() : "", payment.note ?? ""]) : [[entry.displayName, (entry.priceCents / 100).toFixed(2), (entry.confirmedCents / 100).toFixed(2), (entry.outstandingCents / 100).toFixed(2), "", "", "", "", ""]]),
      ];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${trip.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-payment-ledger.csv"`);
      res.send(rows.map((row) => row.map(escape).join(",")).join("\n"));
    } catch (error) {
      console.error("[Export] payment ledger error", error);
      res.status(500).json({ error: "Failed to export payment ledger" });
    }
  });

  app.get("/api/pdf/side-matches/:roundId", async (req: Request, res: Response) => {
    try {
      const roundId = Number(req.params.roundId);
      if (!Number.isInteger(roundId)) return res.status(400).json({ error: "Invalid roundId" });
      const round = await getRound(roundId);
      if (!round) return res.status(404).json({ error: "Round not found" });
      const trip = await getTrip(round.tripId);
      if (!trip) return res.status(404).json({ error: "Trip not found" });
      const results = await getDailySideMatchResults(roundId);
      const pdfBuffer = await generateSideMatchResultsPDF({
        tripName: trip.name,
        roundName: round.name,
        roundDate: new Date(round.roundDate).toLocaleDateString("en-AU"),
        matches: results.map((match) => ({ type: match.type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()), groupName: `Group ${match.groupId}`, status: match.status, leader: match.leader ? `${match.leader.name} (${match.leader.value} ${match.leader.label})` : null, rows: match.players.map((player) => ({ name: player.name, result: match.type === "stroke" ? `${player.gross} gross` : `${player.stableford} pts` })) })),
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="side-match-results-${round.name.replace(/\s+/g, "-")}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("[PDF] Side match results error:", error);
      res.status(500).json({ error: "Failed to generate side-match results PDF" });
    }
  });

  // ── Round Scorecard PDF ──────────────────────────────────────────────────────
  // GET /api/pdf/scorecard/:roundId
  app.get("/api/pdf/scorecard/:roundId", async (req: Request, res: Response) => {
    try {
      const roundId = parseInt(req.params.roundId);
      if (isNaN(roundId)) {
        res.status(400).json({ error: "Invalid roundId" });
        return;
      }

      const round = await getRound(roundId);
      if (!round) {
        res.status(404).json({ error: "Round not found" });
        return;
      }

      const trip = await getTrip(round.tripId);
      if (!trip) {
        res.status(404).json({ error: "Trip not found" });
        return;
      }

      const holes = await getHolesByCourse(round.courseId);
      const scorecard = await getRoundScorecard(roundId);

      // Build scorecard data for each player
      const players = scorecard.map((tp) => {
        const holeData = holes.map((hole) => {
          const score = tp.scores.find((s) => s.holeId === hole.id);
          return {
            holeNumber: hole.holeNumber,
            par: hole.par,
            strokeIndex: hole.strokeIndex,
            grossScore: score?.grossScore ?? 0,
            netScore: score?.netScore ?? 0,
            stablefordPoints: score?.stablefordPoints ?? 0,
          };
        });
        return {
          name: tp.userName ?? `Player ${tp.userId}`,
          handicap: tp.handicap,
          holes: holeData,
        };
      });

      const data: ScorecardData = {
        tripName: trip.name,
        roundName: round.name,
        courseName: `Course #${round.courseId}`,
        roundDate: new Date(round.roundDate).toLocaleDateString("en-AU"),
        players,
      };

      const pdfBuffer = await generateScorecardPDF(data);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="scorecard-${round.name.replace(/\s+/g, "-")}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err) {
      console.error("[PDF] Scorecard error:", err);
      res.status(500).json({ error: "Failed to generate scorecard PDF" });
    }
  });

  // ── Tee Sheet PDF ─────────────────────────────────────────────────────────────
  // GET /api/pdf/teesheet/:tripId/:roundId
  app.get("/api/pdf/teesheet/:tripId/:roundId", async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const roundId = parseInt(req.params.roundId);
      if (isNaN(tripId) || isNaN(roundId)) {
        res.status(400).json({ error: "Invalid tripId or roundId" });
        return;
      }

      const trip = await getTrip(tripId);
      if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }

      const round = await getRound(roundId);
      if (!round) { res.status(404).json({ error: "Round not found" }); return; }

      const groupList = await getGroupsByRound(roundId);
      const groups = await Promise.all(
        groupList.map(async (g) => {
          const players = await getGroupPlayers(g.id, tripId);
          return {
            name: g.name,
            teeTime: g.teeTime ?? null,
            startingHole: g.startingHole ?? null,
            players: players.map((p): TeeSheetPlayer => ({
              name: (p.nickname ?? p.user?.name ?? `Player ${p.userId}`),
              handicap: (p as any).currentHandicap ?? 0,
              pairId: p.pairId ?? null,
            })),
          };
        })
      );

      // Sort by teeTime (nulls last)
      groups.sort((a, b) => {
        if (!a.teeTime && !b.teeTime) return 0;
        if (!a.teeTime) return 1;
        if (!b.teeTime) return -1;
        return a.teeTime.localeCompare(b.teeTime);
      });

      const data: TeeSheetData = {
        tripName: trip.name,
        roundName: round.name,
        roundDate: new Date(round.roundDate).toLocaleDateString("en-AU"),
        groups,
      };

      const pdfBuffer = await generateTeeSheetPDF(data);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="teesheet-${round.name.replace(/\s+/g, "-")}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err) {
      console.error("[PDF] Tee sheet error:", err);
      res.status(500).json({ error: "Failed to generate tee sheet PDF" });
    }
  });

  // ── Round Summary PDF ─────────────────────────────────────────────────────────
  // GET /api/pdf/round-summary/:roundId
  app.get("/api/pdf/round-summary/:roundId", async (req: Request, res: Response) => {
    try {
      const roundId = parseInt(req.params.roundId);
      if (isNaN(roundId)) {
        res.status(400).json({ error: "Invalid roundId" });
        return;
      }

      const round = await getRound(roundId);
      if (!round) {
        res.status(404).json({ error: "Round not found" });
        return;
      }

      const trip = await getTrip(round.tripId);
      if (!trip) {
        res.status(404).json({ error: "Trip not found" });
        return;
      }

      const holes = await getHolesByCourse(round.courseId);
      const scorecard = await getRoundScorecard(roundId);
      const roundAchievements = await getAchievementsByRound(roundId);

      // Build achievement map: userId -> [{type, holeNumber}]
      const achMap = new Map<number, { type: string; holeNumber: number }[]>();
      for (const a of roundAchievements) {
        if (!achMap.has(a.userId)) achMap.set(a.userId, []);
        achMap.get(a.userId)!.push({ type: a.type, holeNumber: (a as any).holeNumber ?? 0 });
      }

      // Sort by net score ascending (Stableford: totalStableford desc)
      const sorted = [...scorecard]
        .filter((p) => p.holesPlayed > 0)
        .sort((a, b) => a.totalNet - b.totalNet);

      // Build 4BBB pairs leaderboard
      const fourBBBPairs: import("./pdfExport").RoundSummaryFourBBBPair[] = [];
      if (round.fourBBBEnabled) {
        const groupList = await getGroupsByRound(roundId);
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
            for (const hole of holes) {
              const s1 = p1.scores.find((s) => s.holeId === hole.id);
              const s2 = p2.scores.find((s) => s.holeId === hole.id);
              const bestBall = calculate4BBBStablefordPoints(s1?.stablefordPoints ?? null, s2?.stablefordPoints ?? null);
              if (bestBall !== null) { totalBestBall += bestBall; holesPlayed++; }
            }
            fourBBBPairs.push({
              position: 0,
              teamName: `${p1.userName ?? "Player"} & ${p2.userName ?? "Player"}`,
              totalBestBall,
              holesPlayed,
            });
          }
        }
        fourBBBPairs.sort((a, b) => b.totalBestBall - a.totalBestBall);
        fourBBBPairs.forEach((r, i) => (r.position = i + 1));
      }

      // Build skins results
      const skinsResults: import("./pdfExport").RoundSummarySkinWinner[] = [];
      if (round.skinsEnabled) {
        const holeScores = holes.map((h) => ({
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
          skinsResults.push({ userName: player?.userName ?? `Player ${userId}`, skinsWon });
        }
        skinsResults.sort((a, b) => b.skinsWon - a.skinsWon);
      }

      // Build achievements list for PDF
      const achievementsList: import("./pdfExport").RoundSummaryAchievement[] = roundAchievements
        .filter((a) => (a as any).confirmed !== false)
        .map((a) => ({
          playerName: scorecard.find((p) => p.userId === a.userId)?.userName ?? `Player ${a.userId}`,
          type: a.type,
          holeNumber: (a as any).holeNumber ?? 0,
        }));

      const players = await Promise.all(
        sorted.map(async (tp, idx) => {
          const playerScores = await getScoresByRoundAndUser(roundId, tp.userId);
          const scoreMap = new Map(playerScores.map((s) => [s.holeId, s]));
          const holeData: import("./pdfExport").RoundSummaryHole[] = holes.map((h) => {
            const s = scoreMap.get(h.id);
            return {
              holeNumber: h.holeNumber,
              par: h.par,
              strokeIndex: h.strokeIndex,
              grossScore: s?.grossScore ?? null,
              netScore: s?.netScore ?? null,
              stablefordPoints: s?.stablefordPoints ?? null,
              mercyCapped: s?.mercyCapped ?? false,
            };
          });
          return {
            name: tp.userName ?? `Player ${tp.userId}`,
            handicap: tp.handicap,
            position: idx + 1,
            totalGross: tp.totalGross,
            totalNet: tp.totalNet,
            totalStableford: tp.totalStableford,
            holesPlayed: tp.holesPlayed,
            holes: holeData,
            achievements: achMap.get(tp.userId) ?? [],
          };
        })
      );

      const formats: string[] = [];
      if (round.strokePlayEnabled) formats.push("Stroke Play");
      if (round.fourBBBEnabled) formats.push("4BBB");
      if (round.skinsEnabled) formats.push("Skins");

      const data: RoundSummaryData = {
        tripName: trip.name,
        roundName: round.name,
        courseName: `Course #${round.courseId}`,
        roundDate: new Date(round.roundDate).toLocaleDateString("en-AU"),
        scoringMode: formats.join(" / ") || "Stroke Play",
        mercyRuleEnabled: round.mercyRuleEnabled,
        mercyRuleStrokes: round.mercyRuleStrokes,
        players,
        fourBBB: fourBBBPairs.length > 0 ? fourBBBPairs : undefined,
        skins: skinsResults.length > 0 ? skinsResults : undefined,
        achievements: achievementsList.length > 0 ? achievementsList : undefined,
      };

      const pdfBuffer = await generateRoundSummaryPDF(data);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="round-summary-${round.name.replace(/\s+/g, "-")}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err) {
      console.error("[PDF] Round summary error:", err);
      res.status(500).json({ error: "Failed to generate round summary PDF" });
    }
  });

  // ── Trip Results PDF ─────────────────────────────────────────────────────────
  // GET /api/pdf/trip/:tripId
  app.get("/api/pdf/trip/:tripId", async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.tripId);
      if (isNaN(tripId)) {
        res.status(400).json({ error: "Invalid tripId" });
        return;
      }

      const trip = await getTrip(tripId);
      if (!trip) {
        res.status(404).json({ error: "Trip not found" });
        return;
      }

      const rounds = await getRoundsByTrip(tripId);
      const completedRounds = rounds.filter((r) => r.status === "completed");
      const tripPlayers = await getTripPlayers(tripId);
      const achievements = await getAchievementsByTrip(tripId);

      const players = await Promise.all(
        tripPlayers.map(async (tp) => {
          const roundBreakdown = await Promise.all(
            completedRounds.map(async (r) => {
              const roundScorecard = await getRoundScorecard(r.id);
              const playerEntry = roundScorecard.find((p) => p.userId === tp.userId);
              return {
                roundName: r.name,
                grossTotal: playerEntry?.totalGross ?? 0,
                netTotal: playerEntry?.totalNet ?? 0,
                stablefordTotal: playerEntry?.totalStableford ?? 0,
              };
            })
          );
          return {
            name: tp.user?.name ?? `Player ${tp.userId}`,
            startingHandicap: tp.startingHandicap,
            currentHandicap: tp.currentHandicap,
            rounds: roundBreakdown,
            cumulativeGross: roundBreakdown.reduce((s, r) => s + r.grossTotal, 0),
            cumulativeNet: roundBreakdown.reduce((s, r) => s + r.netTotal, 0),
            cumulativeStableford: roundBreakdown.reduce((s, r) => s + r.stablefordTotal, 0),
          };
        })
      );

      const achievementList = achievements
        .filter((a) => a.confirmed)
        .map((a) => {
          const player = tripPlayers.find((tp) => tp.userId === a.userId);
          const round = rounds.find((r) => r.id === a.roundId);
          return {
            playerName: player?.user?.name ?? `Player ${a.userId}`,
            type: a.type,
            holeNumber: a.holeNumber,
            roundName: round?.name ?? `Round ${a.roundId}`,
          };
        });

      const data: TripResultsData = {
        tripName: trip.name,
        startDate: new Date(trip.startDate).toLocaleDateString("en-AU"),
        endDate: new Date(trip.endDate).toLocaleDateString("en-AU"),
        players,
        achievements: achievementList,
      };

      const pdfBuffer = await generateTripResultsPDF(data);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="trip-results-${trip.name.replace(/\s+/g, "-")}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err) {
      console.error("[PDF] Trip results error:", err);
      res.status(500).json({ error: "Failed to generate trip results PDF" });
    }
  });
}
