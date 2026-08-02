import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle2, Swords } from "lucide-react";
import { toast } from "sonner";

// Helper: match status text
function matchStatusText(
  status: number,
  holesPlayed: number,
  fixtureStatus: string,
  result: string | null,
  endedOnHole: number | null,
  teamAName: string,
  teamBName: string
): string {
  if (fixtureStatus === "pending") return "Not started";
  if (fixtureStatus === "complete" && result) {
    if (result === "halved") return "Match Halved";
    const winner = result === "teamA" ? teamAName : teamBName;
    const margin = Math.abs(status);
    const remaining = 18 - (endedOnHole ?? 18);
    return `${winner} wins ${margin}&${remaining}`;
  }
  if (status === 0) return `All Square after ${holesPlayed}`;
  const leading = status > 0 ? teamAName : teamBName;
  return `${leading} ${Math.abs(status)} UP (${holesPlayed}H played)`;
}

// Score colour
function scoreColor(gross: number, par: number): string {
  const diff = gross - par;
  if (diff <= -2) return "text-yellow-400 font-bold";
  if (diff === -1) return "text-green-400 font-bold";
  if (diff === 0) return "text-foreground";
  if (diff === 1) return "text-rose-400";
  return "text-red-500 font-bold";
}

export default function PennantFixtureScoring() {
  const { roundId, fixtureId } = useParams<{ roundId: string; fixtureId: string }>();
  const roundIdNum = parseInt(roundId);
  const fixtureIdNum = parseInt(fixtureId);

  const [currentHole, setCurrentHole] = useState(1);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Fetch fixture data
  const { data: fixtures, refetch: refetchFixtures } = trpc.pennant.getFixtures.useQuery({ roundId: roundIdNum });
  const { data: roundData } = trpc.rounds.get.useQuery({ id: roundIdNum });

  const fixture = fixtures?.find(f => f.id === fixtureIdNum);
  const holes = roundData?.holes ?? [];
  const currentHoleData = holes.find(h => h.holeNumber === currentHole);

  const submitHole = trpc.pennant.submitHole.useMutation({
    onSuccess: () => {
      refetchFixtures();
      toast.success(`Hole ${currentHole} saved`);
      setSaving(false);
      // Auto-advance to next unscored hole
      const nextHole = currentHole < 18 ? currentHole + 1 : currentHole;
      setCurrentHole(nextHole);
      setScores({});
    },
    onError: (e) => { toast.error(e.message); setSaving(false); },
  });

  if (!fixture) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Loading fixture…</p>
          <Link href={`/admin/trips/0/rounds/${roundId}/pennant`}>
            <Button variant="ghost"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  const is4BBB = fixture.type === "4bbb";
  const par = currentHoleData?.par ?? 4;
  const si = currentHoleData?.strokeIndex ?? currentHole;

  // Check if this hole is already scored
  const existingHole = fixture.holes.find(h => h.holeNumber === currentHole);

  function getScore(key: string): string {
    return scores[key] ?? (existingHole ? String(existingHole[key as keyof typeof existingHole] ?? "") : "");
  }

  function setScore(key: string, val: string) {
    setScores(prev => ({ ...prev, [key]: val }));
  }

  function canSave(): boolean {
    const g1A = parseInt(getScore("gross1A"));
    const g1B = parseInt(getScore("gross1B"));
    if (!g1A || !g1B || g1A < 1 || g1B < 1) return false;
    if (is4BBB) {
      const g2A = parseInt(getScore("gross2A"));
      const g2B = parseInt(getScore("gross2B"));
      if (!g2A || !g2B || g2A < 1 || g2B < 1) return false;
    }
    return true;
  }

  function handleSave() {
    if (!canSave() || !currentHoleData) return;
    setSaving(true);
    submitHole.mutate({
      fixtureId: fixtureIdNum,
      holeNumber: currentHole,
      gross1A: parseInt(getScore("gross1A")),
      gross2A: is4BBB ? parseInt(getScore("gross2A")) : undefined,
      gross1B: parseInt(getScore("gross1B")),
      gross2B: is4BBB ? parseInt(getScore("gross2B")) : undefined,
      holeStrokeIndex: si,
      holePar: par,
    });
  }

  const statusText = matchStatusText(
    fixture.matchStatus,
    fixture.holesPlayed,
    fixture.status,
    fixture.result,
    fixture.endedOnHole,
    fixture.teamAName,
    fixture.teamBName
  );

  const isComplete = fixture.status === "complete";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/admin/trips/0/rounds/${roundId}/pennant`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Swords className="w-4 h-4 text-blue-400" />
              {fixture.type === "4bbb" ? "4BBB" : "Singles"} Match
            </h1>
            <p className="text-xs text-muted-foreground">
              {fixture.teamAEmoji} {fixture.teamAName} vs {fixture.teamBEmoji} {fixture.teamBName}
            </p>
          </div>
        </div>

        {/* Match Status Banner */}
        <Card className={`border-2 ${isComplete ? "border-green-700 bg-green-950/30" : "border-blue-800 bg-blue-950/20"}`}>
          <CardContent className="py-3 text-center">
            <div className="text-sm font-semibold">
              {isComplete && <CheckCircle2 className="w-4 h-4 inline mr-1 text-green-400" />}
              {statusText}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {fixture.holesPlayed} of 18 holes played
              {fixture.useHandicap ? " · Handicap applied" : " · Scratch"}
            </div>
          </CardContent>
        </Card>

        {/* Players */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-blue-800 bg-blue-950/20 p-3">
            <p className="text-xs font-semibold text-blue-300 mb-1">{fixture.teamAEmoji} {fixture.teamAName}</p>
            <p className="text-sm font-medium">{fixture.player1AName}</p>
            <p className="text-xs text-muted-foreground">HC: {fixture.player1AHcp}</p>
            {is4BBB && fixture.player2AName && (
              <>
                <p className="text-sm font-medium mt-1">{fixture.player2AName}</p>
                <p className="text-xs text-muted-foreground">HC: {fixture.player2AHcp}</p>
              </>
            )}
          </div>
          <div className="rounded-lg border border-orange-800 bg-orange-950/20 p-3">
            <p className="text-xs font-semibold text-orange-300 mb-1">{fixture.teamBEmoji} {fixture.teamBName}</p>
            <p className="text-sm font-medium">{fixture.player1BName}</p>
            <p className="text-xs text-muted-foreground">HC: {fixture.player1BHcp}</p>
            {is4BBB && fixture.player2BName && (
              <>
                <p className="text-sm font-medium mt-1">{fixture.player2BName}</p>
                <p className="text-xs text-muted-foreground">HC: {fixture.player2BHcp}</p>
              </>
            )}
          </div>
        </div>

        {/* Hole Navigator */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="icon" disabled={currentHole <= 1}
            onClick={() => { setCurrentHole(h => h - 1); setScores({}); }}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 flex gap-1 overflow-x-auto py-1">
            {Array.from({ length: 18 }, (_, i) => i + 1).map(h => {
              const scored = fixture.holes.some(fh => fh.holeNumber === h);
              return (
                <button key={h}
                  onClick={() => { setCurrentHole(h); setScores({}); }}
                  className={`w-7 h-7 rounded text-xs font-medium shrink-0 transition-colors
                    ${h === currentHole ? "bg-primary text-primary-foreground" :
                      scored ? "bg-green-800/60 text-green-200" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  {h}
                </button>
              );
            })}
          </div>
          <Button variant="outline" size="icon" disabled={currentHole >= 18}
            onClick={() => { setCurrentHole(h => h + 1); setScores({}); }}>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Score Entry Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Hole {currentHole}</CardTitle>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline">Par {par}</Badge>
                <Badge variant="secondary">SI {si}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isComplete && (
              <div className="text-sm text-green-400 text-center py-2">
                <CheckCircle2 className="w-4 h-4 inline mr-1" /> Match complete — scores can still be edited
              </div>
            )}

            {/* Team A scores */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-blue-300">{fixture.teamAEmoji} {fixture.teamAName}</p>
              <div className={`grid ${is4BBB ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
                <div>
                  <Label className="text-xs">{fixture.player1AName}</Label>
                  <Input
                    type="number" min={1} max={15}
                    value={getScore("gross1A")}
                    onChange={e => setScore("gross1A", e.target.value)}
                    className={`h-10 text-center text-lg font-bold ${getScore("gross1A") ? scoreColor(parseInt(getScore("gross1A")), par) : ""}`}
                    placeholder="—"
                  />
                </div>
                {is4BBB && fixture.player2AName && (
                  <div>
                    <Label className="text-xs">{fixture.player2AName}</Label>
                    <Input
                      type="number" min={1} max={15}
                      value={getScore("gross2A")}
                      onChange={e => setScore("gross2A", e.target.value)}
                      className={`h-10 text-center text-lg font-bold ${getScore("gross2A") ? scoreColor(parseInt(getScore("gross2A")), par) : ""}`}
                      placeholder="—"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Team B scores */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-orange-300">{fixture.teamBEmoji} {fixture.teamBName}</p>
              <div className={`grid ${is4BBB ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
                <div>
                  <Label className="text-xs">{fixture.player1BName}</Label>
                  <Input
                    type="number" min={1} max={15}
                    value={getScore("gross1B")}
                    onChange={e => setScore("gross1B", e.target.value)}
                    className={`h-10 text-center text-lg font-bold ${getScore("gross1B") ? scoreColor(parseInt(getScore("gross1B")), par) : ""}`}
                    placeholder="—"
                  />
                </div>
                {is4BBB && fixture.player2BName && (
                  <div>
                    <Label className="text-xs">{fixture.player2BName}</Label>
                    <Input
                      type="number" min={1} max={15}
                      value={getScore("gross2B")}
                      onChange={e => setScore("gross2B", e.target.value)}
                      className={`h-10 text-center text-lg font-bold ${getScore("gross2B") ? scoreColor(parseInt(getScore("gross2B")), par) : ""}`}
                      placeholder="—"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Hole result if already scored */}
            {existingHole && (
              <div className="text-xs text-center text-muted-foreground">
                {existingHole.holeWinner === "teamA" ? (
                  <span className="text-blue-300">✓ {fixture.teamAName} won this hole</span>
                ) : existingHole.holeWinner === "teamB" ? (
                  <span className="text-orange-300">✓ {fixture.teamBName} won this hole</span>
                ) : (
                  <span>Halved</span>
                )}
              </div>
            )}

            <Button
              className="w-full"
              disabled={!canSave() || saving || !currentHoleData}
              onClick={handleSave}>
              {saving ? "Saving…" : existingHole ? "Update Hole" : "Save Hole"}
            </Button>
          </CardContent>
        </Card>

        {/* Scorecard Summary */}
        {fixture.holes.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Hole Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1">Hole</th>
                      <th className="text-center py-1">{fixture.teamAEmoji} A</th>
                      <th className="text-center py-1">{fixture.teamBEmoji} B</th>
                      <th className="text-center py-1">Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fixture.holes
                      .slice()
                      .sort((a, b) => a.holeNumber - b.holeNumber)
                      .map(h => (
                        <tr key={h.holeNumber}
                          className={`border-b border-border/50 cursor-pointer hover:bg-muted/30 ${h.holeNumber === currentHole ? "bg-primary/10" : ""}`}
                          onClick={() => { setCurrentHole(h.holeNumber); setScores({}); }}>
                          <td className="py-1 font-medium">{h.holeNumber}</td>
                          <td className="text-center py-1">
                            {is4BBB
                              ? `${h.gross1A ?? "—"}/${h.gross2A ?? "—"}`
                              : (h.gross1A ?? "—")}
                          </td>
                          <td className="text-center py-1">
                            {is4BBB
                              ? `${h.gross1B ?? "—"}/${h.gross2B ?? "—"}`
                              : (h.gross1B ?? "—")}
                          </td>
                          <td className="text-center py-1">
                            {h.holeWinner === "teamA" ? (
                              <span className="text-blue-300">A</span>
                            ) : h.holeWinner === "teamB" ? (
                              <span className="text-orange-300">B</span>
                            ) : (
                              <span className="text-muted-foreground">½</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
