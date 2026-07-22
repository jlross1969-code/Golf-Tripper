import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Link, useParams } from "wouter";
import {
  ArrowLeft, ArrowRight, Flag, CheckCircle, AlertTriangle, AlertCircle,
  Target, Users, Swords, LayoutGrid, ChevronLeft, ChevronRight, Pencil,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";
import { calculateNetScore, calculateStablefordPoints, detectAchievement, formatAchievementType } from "../../../shared/scoring";
import AchievementAlert from "@/components/AchievementAlert";
import { useAuth } from "@/_core/hooks/useAuth";

type PendingAchievement = {
  type: "hole_in_one" | "eagle" | "birdie";
  holeId: number;
  holeNumber: number;
  par: number;
  grossScore: number;
  userId: number;
  playerName: string;
};

type ScoreMode = "hole-by-hole" | "grid";

function scoreClass(gross: number, par: number) {
  if (gross === 1) return "score-hio";
  if (gross <= par - 2) return "score-eagle";
  if (gross === par - 1) return "score-birdie";
  if (gross === par) return "score-par";
  if (gross === par + 1) return "score-bogey";
  return "score-double";
}

function matchStatusLabel(status: number, holesPlayed: number) {
  if (holesPlayed === 0) return "All Square";
  const n = Math.abs(status);
  const side = status > 0 ? "Pair A" : "Pair B";
  return status === 0 ? "All Square" : `${side} ${n} UP`;
}

/** Inline ± stepper for hole-by-hole mode */
function ScoreStepper({
  value,
  onChange,
  par,
  onPickUp,
  isPickUp,
}: {
  value: number;
  onChange: (v: number) => void;
  par: number;
  onPickUp: () => void;
  isPickUp: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-6">
        <button
          className="w-16 h-16 rounded-full border-2 border-border flex items-center justify-center text-2xl text-muted-foreground hover:border-primary hover:text-primary transition-colors active:scale-95"
          onClick={() => onChange(Math.max(1, value - 1))}
        >
          −
        </button>
        <span className={`text-5xl font-bold w-14 text-center ${isPickUp ? "text-muted-foreground line-through" : "text-foreground"}`}>
          {isPickUp ? "—" : value}
        </span>
        <button
          className="w-16 h-16 rounded-full border-2 border-border flex items-center justify-center text-2xl text-muted-foreground hover:border-primary hover:text-primary transition-colors active:scale-95"
          onClick={() => onChange(Math.min(15, value + 1))}
        >
          +
        </button>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => { if (isPickUp) onChange(par); else onChange(par); }}
          className={`px-5 py-1.5 rounded-full border text-sm font-medium transition-colors ${!isPickUp ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
        >
          Par {par}
        </button>
        <button
          onClick={onPickUp}
          className={`px-5 py-1.5 rounded-full border text-sm font-medium transition-colors ${isPickUp ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border text-muted-foreground hover:border-amber-500 hover:text-amber-400"}`}
        >
          Pick up
        </button>
      </div>
    </div>
  );
}

export default function ScoreEntry() {
  const { roundId } = useParams<{ roundId: string }>();
  const id = Number(roundId);
  const { user } = useAuth();

  const { data: roundData, isLoading } = trpc.rounds.get.useQuery({ id });
  const { data: players } = trpc.players.tripPlayers.useQuery(
    { tripId: roundData?.round.tripId ?? 0 },
    { enabled: !!roundData }
  );
  const { data: myGroup } = trpc.groups.getMyGroup.useQuery(
    { roundId: id },
    { enabled: !!user }
  );
  const { data: groupMatches } = trpc.groupMatch.getByRound.useQuery(
    { roundId: id },
    { enabled: !!myGroup }
  );
  const { data: scorecard, refetch: refetchScorecard } = trpc.scores.getScorecard.useQuery({ roundId: id });
  type MismatchPlayer = { name: string; context: string };
  type MismatchHole = { holeNumber: number; missingPlayers: MismatchPlayer[] };
  const { data: ntpList } = trpc.ntp.getByRound.useQuery({ roundId: id });

  // ── Mode ──────────────────────────────────────────────────────────────────
  const [scoreMode, setScoreMode] = useState<ScoreMode>("hole-by-hole");

  // ── Hole-by-hole state ────────────────────────────────────────────────────
  const [currentHoleIdx, setCurrentHoleIdx] = useState<number | null>(null);

  // Per-player per-hole scores: { [userId]: { [holeId]: number } }
  const [holeScores, setHoleScores] = useState<Record<number, Record<number, number>>>({});
  // Pick-up flags: { [userId]: { [holeId]: boolean } }
  const [pickUps, setPickUps] = useState<Record<number, Record<number, boolean>>>({});

  // Grid mode: single player selector (legacy)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  // Grid mode: per-hole string inputs
  const [gridInputs, setGridInputs] = useState<Record<number, string>>({});

  const [pendingAchievement, setPendingAchievement] = useState<PendingAchievement | null>(null);
  const [pendingAchievementId, setPendingAchievementId] = useState<number | null>(null);
  const [ntpInputs, setNtpInputs] = useState<Record<number, string>>({});

  // Mismatch dialog — grouped by hole with missing player context
  const [mismatchHoles, setMismatchHoles] = useState<MismatchHole[]>([]);
  const [mismatchOpen, setMismatchOpen] = useState(false);
  const mismatchFlowActiveRef = useRef(false);

  // Scorecard comparison drawer
  const [compareOpen, setCompareOpen] = useState(false);
  // Track which hole indices just got a new result (for flash animation)
  const [flashedHoles, setFlashedHoles] = useState<Record<number, "A" | "B">>({});
  const prevHoleResultsRef = useRef<string>("[]");
  // Track when the overall match score header should flash
  const [flashHeader, setFlashHeader] = useState<"A" | "B" | null>(null);
  const prevMatchStatusRef = useRef<number>(0);

  // Admin score correction dialog
  const [correctOpen, setCorrectOpen] = useState(false);
  const [correctUserId, setCorrectUserId] = useState<number | null>(null);
  const [correctHoleId, setCorrectHoleId] = useState<number | null>(null);
  const [correctGross, setCorrectGross] = useState("");

  const adminCorrect = trpc.scores.adminCorrect.useMutation({
    onSuccess: async (d, variables) => {
      toast.success(`Score corrected — Net: ${d.netScore}, Pts: ${d.stablefordPoints}`);
      setCorrectOpen(false);
      setCorrectUserId(null);
      setCorrectHoleId(null);
      setCorrectGross("");
      utils.scores.getScorecard.invalidate({ roundId: id });
      // Trigger achievement verification if the corrected score qualifies
      if (d.achievementType) {
        const player = players?.find((p) => p.userId === variables.userId);
        try {
          const achResult = await createAchievement.mutateAsync({
            roundId: variables.roundId,
            userId: variables.userId,
            holeId: variables.holeId,
            holeNumber: variables.holeNumber,
            par: variables.par,
            grossScore: variables.grossScore,
            type: d.achievementType,
          });
          setPendingAchievementId(achResult.achievementId);
          setPendingAchievement({
            type: d.achievementType,
            holeId: variables.holeId,
            holeNumber: variables.holeNumber,
            par: variables.par,
            grossScore: variables.grossScore,
            userId: variables.userId,
            playerName: player?.nickname ?? player?.user?.name ?? "Player",
          });
        } catch {
          // Achievement creation failed silently — score is still saved
        }
      }
    },
    onError: (e) => toast.error(e.message),
  });

  function openCorrection(userId: number, holeId: number) {
    setCorrectUserId(userId);
    setCorrectHoleId(holeId);
    setCorrectGross("");
    setCorrectOpen(true);
  }

  // Edit mode: set of "userId-holeId" keys where saved score is being edited
  const [editingKeys, setEditingKeys] = useState<Set<string>>(new Set());
  const isEditing = (userId: number, holeId: number) => editingKeys.has(`${userId}-${holeId}`);
  const startEdit = (userId: number, holeId: number, savedScore: number) => {
    setScore(userId, holeId, savedScore);
    setEditingKeys((prev) => { const s = new Set(prev); s.add(`${userId}-${holeId}`); return s; });
  };
  const cancelEdit = (userId: number, holeId: number) => {
    setEditingKeys((prev) => { const s = new Set(prev); s.delete(`${userId}-${holeId}`); return s; });
  };

  // Swipe gesture state
  const swipeTouchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    swipeTouchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeTouchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeTouchStartX.current;
    swipeTouchStartX.current = null;
    if (Math.abs(dx) < 50) return; // ignore tiny movements
    if (dx < 0) {
      // swipe left → next hole
      setCurrentHoleIdx((i) => Math.min(holes.length - 1, (i ?? 0) + 1));
    } else {
      // swipe right → prev hole
      setCurrentHoleIdx((i) => Math.max(0, (i ?? 0) - 1));
    }
  };

  const submitScore = trpc.scores.submit.useMutation();
  const createAchievement = trpc.achievements.create.useMutation();
  const confirmAchievement = trpc.achievements.confirm.useMutation();
  const recalcMatch = trpc.groupMatch.recalc.useMutation();

  function buildMismatchHoles(scorecardData = scorecard): MismatchHole[] {
    if (!roundData || scoringPlayers.length < 2) return [];
    const rows: MismatchHole[] = [];

    for (const hole of roundData.holes) {
      const playerStates = scoringPlayers.map((player) => ({
        player,
        saved: scorecardData?.find((sc) => sc.userId === player.userId)?.scores.find((s) => s.holeId === hole.id),
      }));
      const missingStates = playerStates.filter((state) => !state.saved);
      const savedStates = playerStates.filter((state) => !!state.saved);

      if (missingStates.length > 0 && savedStates.length > 0) {
        rows.push({
          holeNumber: hole.holeNumber,
          missingPlayers: missingStates.map(({ player }) => {
            const name = player.nickname ?? player.user?.name ?? `Player ${player.userId}`;
            const context =
              savedStates.length === 1
                ? `${savedStates[0].player.nickname ?? savedStates[0].player.user?.name ?? `Player ${savedStates[0].player.userId}`} scored ${savedStates[0].saved!.grossScore}`
                : `Others scored ${savedStates.map((state) => state.saved!.grossScore).join(", ")}`;
            return { name, context };
          }),
        });
      }
    }

    return rows;
  }

  const reopenMismatchDialogIfNeeded = useCallback(async () => {
    if (!mismatchFlowActiveRef.current) return;
    const refreshed = await refetchScorecard();
    const remaining = buildMismatchHoles(refreshed.data ?? scorecard);
    if (remaining.length > 0) {
      setMismatchHoles(remaining);
      setMismatchOpen(true);
      mismatchFlowActiveRef.current = true;
    } else {
      setMismatchHoles([]);
      setMismatchOpen(false);
      mismatchFlowActiveRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchScorecard]);
  const submitNtp = trpc.ntp.submitEntry.useMutation({
    onSuccess: () => { toast.success("NTP distance saved!"); utils.ntp.getByRound.invalidate({ roundId: id }); },
    onError: (e) => toast.error(e.message),
  });
  const utils = trpc.useUtils();

  // ── Auto-select partner & set starting hole ───────────────────────────────
  useEffect(() => {
    if (myGroup?.partner && selectedUserId === null) {
      setSelectedUserId(myGroup.partner.userId);
    }
  }, [myGroup, selectedUserId]);

  // Set starting hole index once holes load
  useEffect(() => {
    if (currentHoleIdx !== null) return;
    if (!roundData?.holes?.length) return;
    const startHole = myGroup?.startingHole ?? 1;
    const idx = roundData.holes.findIndex((h) => h.holeNumber === startHole);
    setCurrentHoleIdx(idx >= 0 ? idx : 0);
  }, [roundData, myGroup, currentHoleIdx]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isPaired = !!myGroup?.partner;
  const isLocked = myGroup?.pairsLocked ?? false;

  // Players to score in hole-by-hole mode: self + paired partner only
  const scoringPlayers = (() => {
    if (!players || !user) return [];
    const me = players.find((p) => p.userId === user.id);
    if (!me) return [];
    if (isPaired && myGroup?.partner) {
      const partner = players.find((p) => p.userId === myGroup.partner!.userId);
      return partner ? [me, partner] : [me];
    }
    return [me];
  })();

  const myGroupMatch = myGroup
    ? groupMatches?.find((m) => m.groupId === myGroup.groupId)
    : null;

  // Detect new hole results and trigger flash animation in the comparison drawer
  const holeResultsStr = JSON.stringify(myGroupMatch?.holeResultsParsed ?? []);
  useEffect(() => {
    const currentResults: ("A" | "B" | "H")[] = JSON.parse(holeResultsStr);
    const prev: ("A" | "B" | "H")[] = JSON.parse(prevHoleResultsRef.current);
    const newFlashes: Record<number, "A" | "B"> = {};
    currentResults.forEach((r, idx) => {
      if ((r === "A" || r === "B") && prev[idx] !== r) {
        newFlashes[idx] = r;
      }
    });
    if (Object.keys(newFlashes).length > 0) {
      setFlashedHoles(newFlashes);
      // Also flash the header based on the new match status direction
      const newStatus = myGroupMatch?.matchStatus ?? 0;
      const prevStatus = prevMatchStatusRef.current;
      if (newStatus !== prevStatus) {
        const headerSide = newStatus > 0 ? "A" : newStatus < 0 ? "B" : null;
        if (headerSide) {
          setFlashHeader(headerSide);
          setTimeout(() => setFlashHeader(null), 1600);
        }
      }
      prevMatchStatusRef.current = myGroupMatch?.matchStatus ?? 0;
      const t = setTimeout(() => setFlashedHoles({}), 1600);
      prevHoleResultsRef.current = holeResultsStr;
      return () => clearTimeout(t);
    }
    prevHoleResultsRef.current = holeResultsStr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeResultsStr]);

  const getScore = (userId: number, holeId: number) =>
    holeScores[userId]?.[holeId] ?? 0;

  const setScore = (userId: number, holeId: number, value: number) => {
    setHoleScores((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] ?? {}), [holeId]: value },
    }));
    // Clear pick-up if they set a real score
    setPickUps((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] ?? {}), [holeId]: false },
    }));
  };

  const togglePickUp = (userId: number, holeId: number) => {
    setPickUps((prev) => {
      const current = prev[userId]?.[holeId] ?? false;
      return { ...prev, [userId]: { ...(prev[userId] ?? {}), [holeId]: !current } };
    });
  };

  const isPickUp = (userId: number, holeId: number) =>
    pickUps[userId]?.[holeId] ?? false;

  // Running totals for a player
  const getRunningTotals = useCallback((userId: number, upToHoleIdx: number) => {
    if (!roundData) return { shots: 0, points: 0 };
    const player = players?.find((p) => p.userId === userId);
    if (!player) return { shots: 0, points: 0 };
    let shots = 0;
    let points = 0;
    for (let i = 0; i <= upToHoleIdx; i++) {
      const hole = roundData.holes[i];
      if (!hole) continue;
      // Check saved scorecard first
      const saved = scorecard?.find((p) => p.userId === userId)?.scores.find((s) => s.holeId === hole.id);
      if (saved) {
        shots += saved.grossScore;
        points += saved.stablefordPoints;
        continue;
      }
      if (isPickUp(userId, hole.id)) continue;
      const g = getScore(userId, hole.id);
      if (g > 0) {
        shots += g;
        const net = calculateNetScore(g, player.currentHandicap, hole.strokeIndex);
        points += calculateStablefordPoints(net, hole.par);
      }
    }
    return { shots, points };
  }, [roundData, players, scorecard, holeScores, pickUps]);

  // ── Submit a single hole for a player ────────────────────────────────────
  const handleSubmitHole = async (
    userId: number,
    hole: { id: number; holeNumber: number; par: number; strokeIndex: number }
  ) => {
    const player = players?.find((p) => p.userId === userId);
    if (!player || !roundData) return;
    const grossScore = getScore(userId, hole.id);
    if (isPickUp(userId, hole.id)) {
      // Pick-up: submit par+3 as a max score (no stableford points)
      const pickUpScore = hole.par + 3;
      await submitScore.mutateAsync({
        roundId: id,
        userId,
        holeId: hole.id,
        holeNumber: hole.holeNumber,
        par: hole.par,
        strokeIndex: hole.strokeIndex,
        grossScore: pickUpScore,
        handicap: player.currentHandicap,
      });
      return;
    }
    if (!grossScore || grossScore < 1) {
      toast.error(`Enter a score for ${player.nickname ?? player.user?.name ?? "Player"}`);
      return;
    }
    const result = await submitScore.mutateAsync({
      roundId: id,
      userId,
      holeId: hole.id,
      holeNumber: hole.holeNumber,
      par: hole.par,
      strokeIndex: hole.strokeIndex,
      grossScore,
      handicap: player.currentHandicap,
    });
    if (myGroupMatch) recalcMatch.mutate({ matchId: myGroupMatch.id });
    if (result.achievementType) {
      const achResult = await createAchievement.mutateAsync({
        roundId: id,
        userId,
        holeId: hole.id,
        holeNumber: hole.holeNumber,
        par: hole.par,
        grossScore,
        type: result.achievementType,
      });
      setPendingAchievementId(achResult.achievementId);
      setPendingAchievement({
        type: result.achievementType,
        holeId: hole.id,
        holeNumber: hole.holeNumber,
        par: hole.par,
        grossScore,
        userId,
        playerName: player.nickname ?? player.user?.name ?? "Player",
      });
    }
  };

  // ── Submit all scores for current hole (hole-by-hole mode) ────────────────
  const handleSaveHole = async () => {
    if (currentHoleIdx === null || !roundData) return;
    const hole = roundData.holes[currentHoleIdx];
    if (!hole) return;

    // Check if already saved for all scoring players
    const allSaved = scoringPlayers.every((p) => {
      const saved = scorecard?.find((sc) => sc.userId === p.userId)?.scores.find((s) => s.holeId === hole.id);
      return !!saved;
    });
    if (allSaved) {
      // Just advance
      if (currentHoleIdx < roundData.holes.length - 1) setCurrentHoleIdx(currentHoleIdx + 1);
      return;
    }

    try {
      for (const player of scoringPlayers) {
        const saved = scorecard?.find((sc) => sc.userId === player.userId)?.scores.find((s) => s.holeId === hole.id);
        if (saved) continue; // already saved
        await handleSubmitHole(player.userId, hole);
      }
      toast.success(`Hole ${hole.holeNumber} saved`);
      await refetchScorecard();
      utils.groupMatch.getByRound.invalidate({ roundId: id });
      await reopenMismatchDialogIfNeeded();
      // Auto-advance
      if (currentHoleIdx < roundData.holes.length - 1) {
        setCurrentHoleIdx(currentHoleIdx + 1);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save score");
    }
  };

  // ── Mismatch check on final submit ────────────────────────────────────────
  const handleFinalSubmit = () => {
    if (!roundData || scoringPlayers.length < 2) return;
    const mismatches = buildMismatchHoles();
    if (mismatches.length > 0) {
      mismatchFlowActiveRef.current = true;
      setMismatchHoles(mismatches);
      setMismatchOpen(true);
    } else {
      mismatchFlowActiveRef.current = false;
      toast.success("All scores submitted!");
    }
  };

  // ── Grid mode: submit single hole ─────────────────────────────────────────
  const handleGridSubmitHole = async (hole: { id: number; holeNumber: number; par: number; strokeIndex: number }) => {
    if (!selectedUserId) return;
    const player = players?.find((p) => p.userId === selectedUserId);
    if (!player || !roundData) return;
    const grossStr = gridInputs[hole.id];
    const grossScore = parseInt(grossStr);
    if (isNaN(grossScore) || grossScore < 1) {
      toast.error("Please enter a valid score (1 or more)");
      return;
    }
    try {
      const result = await submitScore.mutateAsync({
        roundId: id,
        userId: selectedUserId,
        holeId: hole.id,
        holeNumber: hole.holeNumber,
        par: hole.par,
        strokeIndex: hole.strokeIndex,
        grossScore,
        handicap: player.currentHandicap,
      });
      if (myGroupMatch) recalcMatch.mutate({ matchId: myGroupMatch.id });
      if (result.achievementType) {
        const achResult = await createAchievement.mutateAsync({
          roundId: id,
          userId: selectedUserId,
          holeId: hole.id,
          holeNumber: hole.holeNumber,
          par: hole.par,
          grossScore,
          type: result.achievementType,
        });
        setPendingAchievementId(achResult.achievementId);
        setPendingAchievement({
          type: result.achievementType,
          holeId: hole.id,
          holeNumber: hole.holeNumber,
          par: hole.par,
          grossScore,
          userId: selectedUserId,
          playerName: player.nickname ?? player.user?.name ?? "Player",
        });
      } else {
        toast.success(`Hole ${hole.holeNumber} saved — Net: ${result.netScore}, Pts: ${result.stablefordPoints}`);
      }
      await refetchScorecard();
      utils.groupMatch.getByRound.invalidate({ roundId: id });
      await reopenMismatchDialogIfNeeded();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save score");
    }
  };

  const handleConfirmAchievement = async () => {
    if (!pendingAchievement || !pendingAchievementId || !roundData) return;
    try {
      const result = await confirmAchievement.mutateAsync({
        achievementId: pendingAchievementId,
        tripId: roundData.round.tripId,
        playerName: pendingAchievement.playerName,
      });
      toast.success(result.message, { duration: 6000 });
      setPendingAchievement(null);
      setPendingAchievementId(null);
      utils.scores.getScorecard.invalidate({ roundId: id });
      utils.notifications.list.invalidate({ tripId: roundData.round.tripId });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to confirm achievement");
    }
  };

  const handleDismissAchievement = () => {
    setPendingAchievement(null);
    setPendingAchievementId(null);
    utils.scores.getScorecard.invalidate({ roundId: id });
  };

  // ── Loading / error states ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!roundData) return <div className="p-8 text-muted-foreground">Round not found.</div>;

  const { round, holes } = roundData;
  const ntpByHole = new Map((ntpList ?? []).map((n) => [n.holeId, n]));
  const currentHole = currentHoleIdx !== null ? holes[currentHoleIdx] : null;

  // Count how many holes have been saved for all scoring players
  const savedCount = holes.filter((h) =>
    scoringPlayers.every((p) =>
      scorecard?.find((sc) => sc.userId === p.userId)?.scores.find((s) => s.holeId === h.id)
    )
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <AchievementAlert tripId={round.tripId} />

      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/trip/${round.tripId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <Flag className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground text-sm">{round.name}</h1>
            {myGroup?.teeTime && (
              <p className="text-xs text-muted-foreground">
                Tee {myGroup.teeTime}{myGroup.startingHole ? ` · Hole ${myGroup.startingHole}` : ""}
              </p>
            )}
          </div>
        </div>
        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setScoreMode("hole-by-hole")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${scoreMode === "hole-by-hole" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ChevronRight className="w-3 h-3" /> Hole
          </button>
          <button
            onClick={() => setScoreMode("grid")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${scoreMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="w-3 h-3" /> Grid
          </button>
        </div>
      </header>

      {/* Group match banner */}
      {myGroupMatch && (
        <div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center justify-between text-xs">
          <span className="text-primary font-medium flex items-center gap-1">
            <Swords className="w-3 h-3" />
            {myGroupMatch.pairATeamName ?? myGroupMatch.pairANames.join(" & ")}
          </span>
          <button
            className="flex flex-col items-center gap-0.5 px-2 hover:opacity-80 transition-opacity"
            onClick={() => setCompareOpen(true)}
          >
            <Badge variant="secondary" className="text-xs">
              {myGroupMatch.winner !== "pending"
                ? myGroupMatch.winner === "halved" ? "Halved" : `${myGroupMatch.winner === "player1" ? (myGroupMatch.pairATeamName ?? myGroupMatch.pairANames[0]) : (myGroupMatch.pairBTeamName ?? myGroupMatch.pairBNames[0])} wins`
                : matchStatusLabel(myGroupMatch.matchStatus, myGroupMatch.holeResultsParsed.length)}
            </Badge>
            <span className="text-[10px] text-muted-foreground">tap for scorecard</span>
          </button>
          <span className="text-primary font-medium">
            {myGroupMatch.pairBTeamName ?? myGroupMatch.pairBNames.join(" & ")}
          </span>
        </div>
      )}

      {/* ── HOLE-BY-HOLE MODE ─────────────────────────────────────────────── */}
      {scoreMode === "hole-by-hole" && currentHole && (
        <div
          className="max-w-lg mx-auto"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Hole navigation header */}
          <div className="flex items-center justify-between px-6 py-4">
            <button
              className="p-2 rounded-full hover:bg-accent transition-colors disabled:opacity-30"
              disabled={currentHoleIdx === 0}
              onClick={() => setCurrentHoleIdx((i) => Math.max(0, (i ?? 0) - 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center text-2xl font-bold mx-auto">
                {currentHole.holeNumber}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Par {currentHole.par} · SI {currentHole.strokeIndex}
              </p>
            </div>
            <button
              className="p-2 rounded-full hover:bg-accent transition-colors disabled:opacity-30"
              disabled={currentHoleIdx === holes.length - 1}
              onClick={() => setCurrentHoleIdx((i) => Math.min(holes.length - 1, (i ?? 0) + 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-6 mb-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{savedCount} / {holes.length} holes saved</span>
              <span>{Math.round((savedCount / holes.length) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(savedCount / holes.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Player scoring cards */}
          <div className="px-4 space-y-4 pb-6">
            {scoringPlayers.map((player) => {
              const saved = scorecard?.find((sc) => sc.userId === player.userId)?.scores.find((s) => s.holeId === currentHole.id);
              const totals = getRunningTotals(player.userId, currentHoleIdx ?? 0);
              const currentScore = getScore(player.userId, currentHole.id) || currentHole.par;
              const pu = isPickUp(player.userId, currentHole.id);

              // Preview net/points for current unsaved score
              const previewNet = pu ? null : calculateNetScore(currentScore, player.currentHandicap, currentHole.strokeIndex);
              const previewPts = previewNet !== null ? calculateStablefordPoints(previewNet, currentHole.par) : 0;
              // Handicap strokes received on this hole
              const fullStrokes = Math.floor(player.currentHandicap / 18);
              const extraStroke = player.currentHandicap % 18 >= currentHole.strokeIndex ? 1 : 0;
              const strokesReceived = fullStrokes + extraStroke;

              return (
                <div key={player.userId} className="bg-card border border-border rounded-2xl overflow-hidden">
                  {/* Player header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {(player.nickname ?? player.user?.name ?? "P").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-foreground text-sm">
                        {player.nickname ?? player.user?.name ?? `Player ${player.userId}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium text-muted-foreground">
                        HC: {player.currentHandicap}
                      </span>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium text-muted-foreground">
                        SI {currentHole.strokeIndex}
                      </span>
                      {strokesReceived > 0 && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-semibold">
                          +{strokesReceived} shot{strokesReceived > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score input or saved score */}
                  <div className="px-4 py-5">
                    {saved && !isEditing(player.userId, currentHole.id) ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className={`text-5xl font-bold ${scoreClass(saved.grossScore, currentHole.par)}`}>
                          {saved.grossScore}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Net {saved.netScore} · {saved.stablefordPoints} pts
                        </p>
                        <div className="flex gap-2">
                          <button
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors border border-border rounded-full px-3 py-1 hover:border-primary"
                            onClick={() => startEdit(player.userId, currentHole.id, saved.grossScore)}
                          >
                            <CheckCircle className="w-3 h-3 text-primary" /> Saved · tap to edit
                          </button>
                          {user?.role === "admin" && (
                            <button
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-400 transition-colors border border-border rounded-full px-3 py-1 hover:border-amber-400"
                              onClick={() => openCorrection(player.userId, currentHole.id)}
                            >
                              <Pencil className="w-3 h-3" /> Admin fix
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <ScoreStepper
                          value={currentScore}
                          onChange={(v) => setScore(player.userId, currentHole.id, v)}
                          par={currentHole.par}
                          onPickUp={() => togglePickUp(player.userId, currentHole.id)}
                          isPickUp={pu}
                        />
                        {saved && isEditing(player.userId, currentHole.id) && (
                          <div className="flex justify-center mt-2">
                            <button
                              className="text-xs text-muted-foreground hover:text-foreground underline"
                              onClick={() => cancelEdit(player.userId, currentHole.id)}
                            >
                              Cancel edit
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Shots / Points / Total footer */}
                  <div className="grid grid-cols-3 border-t border-border">
                    <div className="px-3 py-2 text-center border-r border-border">
                      <p className="text-xs text-muted-foreground">Shots</p>
                      <p className="font-bold text-foreground text-sm">{strokesReceived}</p>
                    </div>
                    <div className="px-3 py-2 text-center border-r border-border">
                      <p className="text-xs text-muted-foreground">Pts (hole)</p>
                      <p className="font-bold text-primary text-sm">{pu ? 0 : (saved ? (scorecard?.find((sc) => sc.userId === player.userId)?.scores.find((s) => s.holeId === currentHole.id)?.stablefordPoints ?? 0) : previewPts)}</p>
                    </div>
                    <div className="px-3 py-2 text-center bg-muted/30">
                      <p className="text-xs text-muted-foreground">Total pts</p>
                      <p className="font-bold text-foreground text-sm">
                        {saved ? totals.points : totals.points + (pu ? 0 : previewPts)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* NTP for this hole */}
            {ntpByHole.has(currentHole.id) && (() => {
              const ntp = ntpByHole.get(currentHole.id)!;
              const myEntry = ntp.entries.find((e) => e.userId === user?.id);
              const ntpVal = ntpInputs[ntp.id] ?? "";
              return (
                <div className="bg-card border border-primary/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <Target className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Nearest the Pin</p>
                    {myEntry ? (
                      <p className="text-xs text-primary font-semibold">{myEntry.distanceCm} cm</p>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={ntpVal}
                          onChange={(e) => setNtpInputs((prev) => ({ ...prev, [ntp.id]: e.target.value }))}
                          className="bg-background border border-border rounded-md px-2 py-1 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="cm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={!ntpVal || submitNtp.isPending}
                          onClick={() => submitNtp.mutate({ ntpId: ntp.id, distanceCm: Number(ntpVal) })}
                        >
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Save & Next button */}
            <div className="flex gap-3">
              <Button
                className="flex-1 h-12 text-base font-semibold gap-2"
                disabled={submitScore.isPending}
                onClick={handleSaveHole}
              >
                {currentHoleIdx === holes.length - 1 ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Save & Finish
                  </>
                ) : (
                  <>
                    Save & Next
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
              {currentHoleIdx === holes.length - 1 && scoringPlayers.length >= 2 && (
                <Button
                  variant="outline"
                  className="h-12 px-4"
                  onClick={handleFinalSubmit}
                >
                  Check
                </Button>
              )}
            </div>

            {/* Hole dots progress */}
            <div className="flex flex-wrap gap-1 justify-center pt-2">
              {holes.map((h, idx) => {
                const allSaved = scoringPlayers.every((p) =>
                  scorecard?.find((sc) => sc.userId === p.userId)?.scores.find((s) => s.holeId === h.id)
                );
                const isCurrent = idx === currentHoleIdx;
                return (
                  <button
                    key={h.id}
                    onClick={() => setCurrentHoleIdx(idx)}
                    className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                      isCurrent ? "bg-primary text-primary-foreground" :
                      allSaved ? "bg-primary/30 text-primary" :
                      "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {h.holeNumber}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── GRID MODE ─────────────────────────────────────────────────────── */}
      {scoreMode === "grid" && (
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

          {/* Grid mode: tab switcher between self and partner (when paired) */}
          {isPaired && myGroup?.partner && players && user && (() => {
            const me = players.find((p) => p.userId === user.id);
            const partner = players.find((p) => p.userId === myGroup.partner!.userId);
            const gridPlayers = [me, partner].filter(Boolean) as typeof players;
            const activeId = selectedUserId && gridPlayers.some((p) => p.userId === selectedUserId)
              ? selectedUserId
              : gridPlayers[0]?.userId ?? null;
            return (
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {gridPlayers.map((p) => (
                  <button
                    key={p.userId}
                    onClick={() => setSelectedUserId(p.userId)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeId === p.userId ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {(p.nickname ?? p.user?.name ?? "P").charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{p.nickname ?? p.user?.name ?? `Player ${p.userId}`}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">HC {p.currentHandicap}</span>
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Player selector (only when not paired) */}
          {!isPaired && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Select Player to Score</label>
              <Select
                value={selectedUserId?.toString() ?? ""}
                onValueChange={(v) => setSelectedUserId(Number(v))}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Choose a player..." />
                </SelectTrigger>
                <SelectContent>
                  {players?.map((p) => (
                    <SelectItem key={p.userId} value={p.userId.toString()}>
                      {p.nickname ?? p.user?.name ?? `Player ${p.userId}`} (HCP {p.currentHandicap})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Scorecard grid */}
          {selectedUserId && (() => {
            const selectedPlayer = players?.find((p) => p.userId === selectedUserId);
            if (!selectedPlayer) return null;
            return (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground">
                    {selectedPlayer.nickname ?? selectedPlayer.user?.name} — HCP {selectedPlayer.currentHandicap}
                  </h2>
                  <div className="flex gap-2">
                    {round.strokePlayEnabled && <Badge variant="secondary">Stroke Play</Badge>}
                    {round.fourBBBEnabled && <Badge variant="secondary">4BBB</Badge>}
                    {round.skinsEnabled && <Badge variant="secondary">Skins</Badge>}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Hole</th>
                        <th className="text-center py-2 px-3 text-muted-foreground font-medium">Par</th>
                        <th className="text-center py-2 px-3 text-muted-foreground font-medium">SI</th>
                        <th className="text-center py-2 px-3 text-muted-foreground font-medium">Score</th>
                        <th className="text-center py-2 px-3 text-muted-foreground font-medium">Net</th>
                        <th className="text-center py-2 px-3 text-muted-foreground font-medium">Pts</th>
                        <th className="py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {holes.map((hole) => {
                        const existing = scorecard
                          ?.find((p) => p.userId === selectedUserId)
                          ?.scores.find((s) => s.holeId === hole.id);
                        const inputVal = gridInputs[hole.id] ?? "";
                        return (
                          <tr key={hole.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                            <td className="py-2 px-3 font-semibold text-foreground">{hole.holeNumber}</td>
                            <td className="py-2 px-3 text-center text-muted-foreground">{hole.par}</td>
                            <td className="py-2 px-3 text-center text-muted-foreground">{hole.strokeIndex}</td>
                            <td className="py-2 px-3 text-center">
                              {existing ? (
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${scoreClass(existing.grossScore, hole.par)}`}>
                                  {existing.grossScore}
                                </span>
                              ) : (
                                <input
                                  type="number"
                                  min={1}
                                  max={15}
                                  value={inputVal}
                                  onChange={(e) => setGridInputs((prev) => ({ ...prev, [hole.id]: e.target.value }))}
                                  className="w-16 text-center h-8 text-sm mx-auto bg-background border border-border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                                  placeholder="—"
                                />
                              )}
                            </td>
                            <td className="py-2 px-3 text-center text-muted-foreground text-xs">
                              {existing ? existing.netScore : "—"}
                            </td>
                            <td className="py-2 px-3 text-center text-primary font-semibold text-xs">
                              {existing ? existing.stablefordPoints : "—"}
                            </td>
                            <td className="py-2 px-3">
                              {!existing && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  disabled={!inputVal || submitScore.isPending}
                                  onClick={() => handleGridSubmitHole(hole)}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Save
                                </Button>
                              )}
                              {existing && (
                                <div className="flex items-center gap-1 justify-center">
                                  <CheckCircle className="w-4 h-4 text-primary" />
                                  {user?.role === "admin" && (
                                    <button
                                      className="text-muted-foreground hover:text-amber-400 transition-colors"
                                      title="Admin: correct this score"
                                      onClick={() => openCorrection(selectedUserId!, hole.id)}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            {ntpByHole.has(hole.id) && (() => {
                              const ntp = ntpByHole.get(hole.id)!;
                              const myEntry = ntp.entries.find((e) => e.userId === user?.id);
                              const ntpVal = ntpInputs[ntp.id] ?? "";
                              return (
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1">
                                    <Target className="w-3 h-3 text-primary flex-shrink-0" />
                                    {myEntry ? (
                                      <span className="text-xs text-primary font-semibold">{myEntry.distanceCm} cm</span>
                                    ) : (
                                      <>
                                        <input
                                          type="number"
                                          min="0.1"
                                          step="0.1"
                                          value={ntpVal}
                                          onChange={(e) => setNtpInputs((prev) => ({ ...prev, [ntp.id]: e.target.value }))}
                                          className="w-16 h-7 text-xs text-center bg-background border border-border rounded-md px-2"
                                          placeholder="cm"
                                        />
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs px-2"
                                          disabled={!ntpVal || submitNtp.isPending}
                                          onClick={() => submitNtp.mutate({ ntpId: ntp.id, distanceCm: Number(ntpVal) })}
                                        >Go</Button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              );
                            })()}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Pairing reminder (soft, non-blocking) */}
          {!isPaired && myGroup && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>
                Pairs not set yet —{" "}
                <Link href={`/trip/${round.tripId}/my-group/${id}`} className="text-primary underline">
                  set up pairing
                </Link>{" "}
                for 4BBB matchplay scoring.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Achievement Verification Dialog ──────────────────────────────── */}
      <Dialog open={!!pendingAchievement} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Confirm Achievement
            </DialogTitle>
          </DialogHeader>
          {pendingAchievement && (
            <div className="py-4 text-center space-y-3">
              <div className={`inline-block px-4 py-2 rounded-lg text-lg font-bold achievement-pop ${
                pendingAchievement.type === "hole_in_one" ? "bg-yellow-400 text-yellow-900" :
                pendingAchievement.type === "eagle" ? "bg-purple-600 text-white" :
                "bg-red-600 text-white"
              }`}>
                {formatAchievementType(pendingAchievement.type)}!
              </div>
              <p className="text-foreground font-semibold text-lg">{pendingAchievement.playerName}</p>
              <p className="text-muted-foreground">
                Scored <strong className="text-foreground">{pendingAchievement.grossScore}</strong> on Hole{" "}
                <strong className="text-foreground">{pendingAchievement.holeNumber}</strong> (Par {pendingAchievement.par})
              </p>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
                Please verify this score is correct before broadcasting to all players.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleDismissAchievement}>Score is Wrong</Button>
            <Button onClick={handleConfirmAchievement} disabled={confirmAchievement.isPending} className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Confirm & Broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Admin Score Correction Dialog ──────────────────────────────── */}
      {(() => {
        const corrHole = correctHoleId ? holes.find((h) => h.id === correctHoleId) : null;
        const corrPlayer = correctUserId ? players?.find((p) => p.userId === correctUserId) : null;
        return (
          <Dialog open={correctOpen} onOpenChange={(o) => { if (!o) { setCorrectOpen(false); setCorrectUserId(null); setCorrectHoleId(null); setCorrectGross(""); } }}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-amber-400" />
                  Admin: Correct Score
                </DialogTitle>
                <DialogDescription>
                  Override the saved score for{" "}
                  <strong>{corrPlayer?.nickname ?? corrPlayer?.user?.name ?? "Player"}</strong>{" "}
                  on Hole {corrHole?.holeNumber} (Par {corrHole?.par} · SI {corrHole?.strokeIndex}).
                  Net and Stableford points will be recalculated automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <label className="text-sm font-medium text-foreground mb-1 block">New Gross Score</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={correctGross}
                  onChange={(e) => setCorrectGross(e.target.value)}
                  placeholder="e.g. 5"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setCorrectOpen(false); setCorrectUserId(null); setCorrectHoleId(null); setCorrectGross(""); }}>Cancel</Button>
                <Button
                  disabled={!correctGross || !corrHole || !corrPlayer || adminCorrect.isPending}
                  onClick={() => {
                    if (!corrHole || !corrPlayer) return;
                    adminCorrect.mutate({
                      roundId: id,
                      userId: corrPlayer.userId,
                      holeId: corrHole.id,
                      holeNumber: corrHole.holeNumber,
                      par: corrHole.par,
                      strokeIndex: corrHole.strokeIndex,
                      grossScore: Number(correctGross),
                      handicap: corrPlayer.currentHandicap,
                    });
                  }}
                >
                  {adminCorrect.isPending ? "Saving..." : "Save Correction"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ── Scorecard Comparison Sheet ──────────────────────────────────── */}
      {myGroupMatch && (
        <Sheet open={compareOpen} onOpenChange={setCompareOpen}>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-primary" />
                4BBB Scorecard Comparison
              </SheetTitle>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-400 font-medium">{myGroupMatch.pairATeamName ?? myGroupMatch.pairANames.join(" & ")}</span>
                <span className="text-xs text-muted-foreground">vs</span>
                <span className="text-orange-400 font-medium">{myGroupMatch.pairBTeamName ?? myGroupMatch.pairBNames.join(" & ")}</span>
              </div>
              {/* Match score summary — flashes when match status changes */}
              {(() => {
                const results = myGroupMatch.holeResultsParsed as ("A" | "B" | "H")[];
                const aWins = results.filter(r => r === "A").length;
                const bWins = results.filter(r => r === "B").length;
                const halves = results.filter(r => r === "H").length;
                const status = myGroupMatch.matchStatus;
                const statusLabel = status === 0 ? "All Square" : status > 0 ? `${status} Up (A)` : `${Math.abs(status)} Up (B)`;
                const headerFlashClass = flashHeader === "A" ? "winner-flash-a" : flashHeader === "B" ? "winner-flash-b" : "";
                return (
                  <div className={`mt-2 flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-muted/40 ${headerFlashClass}`}>
                    <div className="text-center">
                      <span className="text-lg font-bold text-blue-400">{aWins}</span>
                      <span className="block text-[10px] text-muted-foreground">A wins</span>
                    </div>
                    <div className="text-center">
                      <span className="text-sm text-muted-foreground">{halves}H</span>
                    </div>
                    <div className="text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        status === 0 ? "bg-muted text-muted-foreground" :
                        status > 0 ? "bg-blue-600/20 text-blue-300" : "bg-orange-600/20 text-orange-300"
                      }`}>{statusLabel}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-lg font-bold text-orange-400">{bWins}</span>
                      <span className="block text-[10px] text-muted-foreground">B wins</span>
                    </div>
                  </div>
                );
              })()}
            </SheetHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Hole</th>
                    <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Par</th>
                    {scoringPlayers.map((p) => (
                      <th key={p.userId} className="text-center py-2 px-2 text-xs font-medium text-foreground">
                        {p.nickname ?? p.user?.name ?? `P${p.userId}`}
                        <span className="block text-[10px] text-muted-foreground font-normal">HC {p.currentHandicap}</span>
                      </th>
                    ))}
                    <th className="text-center py-2 px-2 text-xs text-blue-400 font-medium">Best A</th>
                    <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Hole</th>
                    <th className="text-center py-2 px-2 text-xs text-orange-400 font-medium">Best B</th>
                  </tr>
                </thead>
                <tbody>
                  {holes.map((hole, hIdx) => {
                    const pairAIds = [myGroupMatch.player1Id, myGroupMatch.player1PartnerId].filter(Boolean) as number[];
                    const pairBIds = [myGroupMatch.player2Id, myGroupMatch.player2PartnerId].filter(Boolean) as number[];
                    const holeResult = (myGroupMatch.holeResultsParsed as ("A" | "B" | "H")[])[hIdx];
                    const pairAScores = scorecard?.filter(sc => pairAIds.includes(sc.userId)).map(sc => sc.scores.find(s => s.holeId === hole.id)).filter(Boolean);
                    const pairBScores = scorecard?.filter(sc => pairBIds.includes(sc.userId)).map(sc => sc.scores.find(s => s.holeId === hole.id)).filter(Boolean);
                    const bestAPoints = pairAScores && pairAScores.length > 0 ? Math.max(...pairAScores.map(s => s!.stablefordPoints)) : null;
                    const bestBPoints = pairBScores && pairBScores.length > 0 ? Math.max(...pairBScores.map(s => s!.stablefordPoints)) : null;
                    const flashClass = flashedHoles[hIdx] === "A" ? "winner-flash-a" : flashedHoles[hIdx] === "B" ? "winner-flash-b" : "";
                    return (
                      <tr key={hole.id} className={`border-b border-border/50 hover:bg-muted/30 ${hIdx === currentHoleIdx ? "bg-primary/5" : ""} ${flashClass}`}>
                        <td className="py-2 px-2 font-medium text-foreground">{hole.holeNumber}</td>
                        <td className="py-2 px-2 text-center text-muted-foreground">{hole.par}</td>
                        {scoringPlayers.map((p) => {
                          const saved = scorecard?.find(sc => sc.userId === p.userId)?.scores.find(s => s.holeId === hole.id);
                          return (
                            <td key={p.userId} className="py-2 px-2 text-center">
                              {saved ? (
                                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${scoreClass(saved.grossScore, hole.par)}`}>
                                  {saved.grossScore}
                                  <span className="text-[10px] ml-1 opacity-70">{saved.stablefordPoints}pt</span>
                                </span>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                          );
                        })}
                        <td className={`py-2 px-2 text-center font-bold text-sm transition-colors ${holeResult === "A" ? "text-blue-400" : "text-foreground"}`}>
                          {bestAPoints ?? "—"}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {holeResult === "A" && <span className={`w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold mx-auto ${flashedHoles[hIdx] === "A" ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-background" : ""}`}>A</span>}
                          {holeResult === "B" && <span className={`w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center font-bold mx-auto ${flashedHoles[hIdx] === "B" ? "ring-2 ring-orange-400 ring-offset-1 ring-offset-background" : ""}`}>B</span>}
                          {holeResult === "H" && <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] flex items-center justify-center mx-auto">H</span>}
                          {!holeResult && <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className={`py-2 px-2 text-center font-bold text-sm transition-colors ${holeResult === "B" ? "text-orange-400" : "text-foreground"}`}>
                          {bestBPoints ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td colSpan={2} className="py-2 px-2 text-xs font-semibold text-muted-foreground">Total</td>
                    {scoringPlayers.map((p) => {
                      const totals = scorecard?.find(sc => sc.userId === p.userId);
                      return (
                        <td key={p.userId} className="py-2 px-2 text-center">
                          <span className="text-xs font-bold text-primary">{totals?.totalStableford ?? 0}pts</span>
                          <span className="block text-[10px] text-muted-foreground">{totals?.totalGross ?? 0} gross</span>
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center">
                      <span className="text-xs font-bold text-blue-400">{(myGroupMatch.holeResultsParsed as string[]).filter(r => r === "A").length}W</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="text-xs text-muted-foreground">{(myGroupMatch.holeResultsParsed as string[]).filter(r => r === "H").length}H</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="text-xs font-bold text-orange-400">{(myGroupMatch.holeResultsParsed as string[]).filter(r => r === "B").length}W</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-4 px-2 py-3 bg-muted/50 rounded-xl text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">4BBB Rule: Best Stableford score from each pair wins the hole.</p>
              <p>Higher Stableford points wins. Equal points = Halved.</p>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* ── Mismatch Warning Dialog ───────────────────────────────────────── */}
      <Dialog open={mismatchOpen} onOpenChange={setMismatchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              Score Mismatch Detected
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              The following holes are missing scores for one or more players. Enter the missing scores before finishing:
            </p>
            <div className="flex flex-col gap-2">
              {mismatchHoles.map(({ holeNumber, missingPlayers }) => (
                <div
                  key={holeNumber}
                  className="flex items-center gap-3 px-3 py-2.5 bg-rose-500/10 border border-rose-500/40 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-foreground text-sm">Hole {holeNumber}</span>
                    <div className="space-y-1 mt-1">
                      {missingPlayers.map(({ name, context }) => (
                        <div key={`${holeNumber}-${name}`} className="text-xs leading-relaxed">
                          <span className="text-rose-400 font-medium">{name} missing</span>
                          <span className="text-muted-foreground"> — {context}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0 text-xs border-rose-500/50 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                    onClick={() => {
                      mismatchFlowActiveRef.current = true;
                      const idx = holes.findIndex((hole) => hole.holeNumber === holeNumber);
                      if (idx >= 0) { setCurrentHoleIdx(idx); setScoreMode("hole-by-hole"); }
                      setMismatchOpen(false);
                    }}
                  >
                    Enter Score
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMismatchOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
