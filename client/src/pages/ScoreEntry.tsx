import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useParams } from "wouter";
import { ArrowLeft, Flag, CheckCircle, AlertTriangle, Target, Users, Swords } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { detectAchievement, formatAchievementType } from "../../../shared/scoring";
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

export default function ScoreEntry() {
  const { roundId } = useParams<{ roundId: string }>();
  const id = Number(roundId);
  const { user } = useAuth();

  const { data: roundData, isLoading } = trpc.rounds.get.useQuery({ id });
  const { data: players } = trpc.players.tripPlayers.useQuery(
    { tripId: roundData?.round.tripId ?? 0 },
    { enabled: !!roundData }
  );

  // Fetch the current user's group/pair info for this round
  const { data: myGroup } = trpc.groups.getMyGroup.useQuery(
    { roundId: id },
    { enabled: !!user }
  );

  // Fetch the group match (4BBB matchplay) for this round
  const { data: groupMatches } = trpc.groupMatch.getByRound.useQuery(
    { roundId: id },
    { enabled: !!myGroup }
  );

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [holeScores, setHoleScores] = useState<Record<number, string>>({});
  const [pendingAchievement, setPendingAchievement] = useState<PendingAchievement | null>(null);
  const [pendingAchievementId, setPendingAchievementId] = useState<number | null>(null);
  const [ntpInputs, setNtpInputs] = useState<Record<number, string>>({}); // ntpId → cm value

  const submitScore = trpc.scores.submit.useMutation();
  const createAchievement = trpc.achievements.create.useMutation();
  const confirmAchievement = trpc.achievements.confirm.useMutation();
  const recalcMatch = trpc.groupMatch.recalc.useMutation();
  const submitNtp = trpc.ntp.submitEntry.useMutation({
    onSuccess: () => { toast.success("NTP distance saved!"); utils.ntp.getByRound.invalidate({ roundId: id }); },
    onError: (e) => toast.error(e.message),
  });
  const utils = trpc.useUtils();

  // Auto-select partner when group info loads (scorer enters partner's scores)
  useEffect(() => {
    if (myGroup?.partner && selectedUserId === null) {
      setSelectedUserId(myGroup.partner.userId);
    }
  }, [myGroup, selectedUserId]);

  const selectedPlayer = players?.find((p) => p.userId === selectedUserId);

  // Find the group match for this user's group
  const myGroupMatch = myGroup
    ? groupMatches?.find((m) => m.groupId === myGroup.groupId)
    : null;

  const handleScoreChange = (holeId: number, value: string) => {
    setHoleScores((prev) => ({ ...prev, [holeId]: value }));
  };

  const handleSubmitHole = async (hole: { id: number; holeNumber: number; par: number; strokeIndex: number }) => {
    if (!selectedUserId || !selectedPlayer || !roundData) return;
    const grossStr = holeScores[hole.id];
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
        handicap: selectedPlayer.currentHandicap,
      });

      // Recalculate group match after each score
      if (myGroupMatch) {
        recalcMatch.mutate({ matchId: myGroupMatch.id });
      }

      // Check for achievement
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
          playerName: selectedPlayer.nickname ?? selectedPlayer.user?.name ?? "Player",
        });
      } else {
        toast.success(`Hole ${hole.holeNumber} saved — Net: ${result.netScore}, Pts: ${result.stablefordPoints}`);
        utils.scores.getScorecard.invalidate({ roundId: id });
        utils.groupMatch.getByRound.invalidate({ roundId: id });
      }
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

  const { data: scorecard } = trpc.scores.getScorecard.useQuery({ roundId: id });
  const { data: ntpList } = trpc.ntp.getByRound.useQuery({ roundId: id });
  const ntpByHole = new Map((ntpList ?? []).map((n) => [n.holeId, n]));

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
  const isPaired = !!myGroup?.partner;
  const isLocked = myGroup?.pairsLocked ?? false;

  return (
    <div className="min-h-screen bg-background">
      <AchievementAlert tripId={round.tripId} />
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Link href={`/trip/${round.tripId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <Flag className="w-5 h-5 text-primary" />
        <div>
          <h1 className="font-bold text-foreground">Score Entry</h1>
          <p className="text-xs text-muted-foreground">{round.name}</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Group match status banner */}
        {myGroupMatch && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2 text-primary">
                <Swords className="w-4 h-4" />
                Group Match — 4BBB Stableford Matchplay
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">
                  {myGroupMatch.pairANames.join(" & ")}
                </span>
                <Badge
                  variant={myGroupMatch.winner === "pending" ? "secondary" : "default"}
                  className="text-xs"
                >
                  {myGroupMatch.winner !== "pending"
                    ? myGroupMatch.winner === "halved" ? "Halved" : `${myGroupMatch.winner === "player1" ? myGroupMatch.pairANames[0] : myGroupMatch.pairBNames[0]} wins`
                    : matchStatusLabel(myGroupMatch.matchStatus, myGroupMatch.holeResultsParsed.length)}
                </Badge>
                <span className="text-foreground font-medium">
                  {myGroupMatch.pairBNames.join(" & ")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {myGroupMatch.holeResultsParsed.length} holes played
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pairing info banner */}
        {isPaired && (
          <div className="flex items-center gap-2 px-4 py-3 bg-primary/10 rounded-xl border border-primary/20 text-sm">
            <Users className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-foreground">
              You are scoring for your partner:{" "}
              <strong className="text-primary">
                {myGroup.partner?.user?.name ?? `Player ${myGroup.partner?.userId}`}
              </strong>
              {isLocked && <span className="ml-2 text-xs text-muted-foreground">(pairs locked)</span>}
            </span>
          </div>
        )}

        {/* Player selector — shown when not paired or pairs not locked */}
        {(!isPaired || !isLocked) && (
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {isPaired ? "Scoring for (override)" : "Select Player to Score"}
            </label>
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

        {/* Scorecard */}
        {selectedUserId && selectedPlayer && (
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
                    const inputVal = holeScores[hole.id] ?? "";

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
                            <Input
                              type="number"
                              min={1}
                              max={15}
                              value={inputVal}
                              onChange={(e) => handleScoreChange(hole.id, e.target.value)}
                              className="w-16 text-center h-8 text-sm mx-auto"
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
                              onClick={() => handleSubmitHole(hole)}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                          )}
                          {existing && (
                            <CheckCircle className="w-4 h-4 text-primary mx-auto" />
                          )}
                        </td>
                        {/* NTP column — only shown for NTP-enabled holes */}
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
                                    <Input
                                      type="number"
                                      min="0.1"
                                      step="0.1"
                                      value={ntpVal}
                                      onChange={(e) => setNtpInputs((prev) => ({ ...prev, [ntp.id]: e.target.value }))}
                                      className="w-16 h-7 text-xs text-center"
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
        )}

        {/* Not paired yet — prompt to pair */}
        {!isPaired && myGroup && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="px-4 py-4 flex items-center gap-3">
              <Users className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">You haven't paired with a partner yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Go to the{" "}
                  <Link href={`/trip/${round.tripId}/my-group/${id}`} className="text-primary underline">
                    Group Pairing
                  </Link>{" "}
                  page to choose your partner before scoring.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Achievement Verification Dialog */}
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
              <p className="text-foreground font-semibold text-lg">
                {pendingAchievement.playerName}
              </p>
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
            <Button variant="outline" onClick={handleDismissAchievement}>
              Score is Wrong
            </Button>
            <Button
              onClick={handleConfirmAchievement}
              disabled={confirmAchievement.isPending}
              className="gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm & Broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
