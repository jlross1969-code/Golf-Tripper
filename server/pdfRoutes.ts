import { Express, Request, Response } from "express";
import { generateScorecardPDF, generateTripResultsPDF, generateTeeSheetPDF, ScorecardData, TripResultsData, TeeSheetData, TeeSheetPlayer } from "./pdfExport";
import {
  getAchievementsByTrip,
  getGroupPlayers,
  getGroupsByRound,
  getHolesByCourse,
  getRound,
  getRoundsByTrip,
  getRoundScorecard,
  getTrip,
  getTripPlayers,
} from "./db";

export function registerPdfRoutes(app: Express) {
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
