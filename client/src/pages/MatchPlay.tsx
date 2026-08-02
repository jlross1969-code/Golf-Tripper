import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { formatMatchStatus } from "@shared/scoring";
import { CheckCircle2, Flag, Swords, Trophy } from "lucide-react";
import { useState } from "react";
import { useParams } from "wouter";

export default function MatchPlay() {
  const { roundId } = useParams<{ roundId: string }>();
  const parsedRoundId = parseInt(roundId ?? "0");
  const { user } = useAuth();

  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [holeNumber, setHoleNumber] = useState(1);
  const [p1Net, setP1Net] = useState("");
  const [p2Net, setP2Net] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: matches = [], isLoading } = trpc.matchPlay.getByRound.useQuery(
    { roundId: parsedRoundId },
    { enabled: !!parsedRoundId }
  );

  const submitHole = trpc.matchPlay.submitHoleResult.useMutation({
    onSuccess: (data) => {
      utils.matchPlay.getByRound.invalidate({ roundId: parsedRoundId });
      const statusStr = formatMatchStatus(data.matchStatus, holeNumber, 18);
      if (data.winner !== null) {
        const winnerLabel =
          data.winner === "halved"
            ? "Match Halved"
            : data.winner === "player1"
            ? "Player 1 wins the match!"
            : "Player 2 wins the match!";
        setLastResult(`Hole ${holeNumber}: ${data.holeResult.toUpperCase()} — ${winnerLabel}`);
      } else {
        setLastResult(`Hole ${holeNumber}: ${data.holeResult.toUpperCase()} — ${statusStr}`);
      }
      setHoleNumber((h) => Math.min(h + 1, 18));
      setP1Net("");
      setP2Net("");
      setSubmitting(false);
    },
    onError: () => setSubmitting(false),
  });

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);
  const holeResults: { holeNumber: number; result: string }[] = selectedMatch
    ? JSON.parse(selectedMatch.holeResults || "[]")
    : [];

  const handleSubmit = () => {
    if (!selectedMatchId || !p1Net || !p2Net) return;
    setSubmitting(true);
    submitHole.mutate({
      matchId: selectedMatchId,
      holeNumber,
      player1NetScore: parseInt(p1Net),
      player2NetScore: parseInt(p2Net),
      totalHoles: 18,
    });
  };

  const statusColor = (status: number) => {
    if (status === 0) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (status > 0) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const holeResultBadge = (result: string) => {
    if (result === "player1") return <Badge className="bg-emerald-600 text-white text-xs">P1</Badge>;
    if (result === "player2") return <Badge className="bg-red-600 text-white text-xs">P2</Badge>;
    return <Badge variant="outline" className="text-xs">½</Badge>;
  };

  if (!parsedRoundId) {
    return <div className="p-8 text-muted-foreground">No round selected.</div>;
  }

  return (
    <div className="container py-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Swords className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Match Play</h1>
          <p className="text-sm text-muted-foreground">Round #{parsedRoundId}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading matches…</div>
      ) : matches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Swords className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No match play fixtures set up for this round.</p>
            <p className="text-xs mt-1">Ask your admin to create match play fixtures in the Admin panel.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Match selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Match</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedMatchId?.toString() ?? ""}
                onValueChange={(v) => {
                  setSelectedMatchId(parseInt(v));
                  setLastResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a match…" />
                </SelectTrigger>
                <SelectContent>
                  {matches.map((m) => {
                    const p1Label = (m as any).player1PartnerName
                      ? `${(m as any).player1Name} & ${(m as any).player1PartnerName}`
                      : ((m as any).player1Name ?? `Player ${m.player1Id}`);
                    const p2Label = (m as any).player2PartnerName
                      ? `${(m as any).player2Name} & ${(m as any).player2PartnerName}`
                      : ((m as any).player2Name ?? `Player ${m.player2Id}`);
                    return (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {p1Label} vs {p2Label} —{" "}
                        {m.winner !== "pending" ? `FINISHED (${m.winner})` : formatMatchStatus(m.matchStatus, JSON.parse(m.holeResults || "[]").length, 18)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedMatch && (
            <>
              {/* Match status */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Flag className="h-4 w-4 text-primary" />
                      Match Status
                    </CardTitle>
                    {selectedMatch.winner !== "pending" && (
                      <Badge className="bg-yellow-500 text-black font-bold">
                        <Trophy className="h-3 w-3 mr-1" />
                        MATCH OVER
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`inline-flex items-center px-4 py-2 rounded-full border font-semibold text-lg ${statusColor(selectedMatch.matchStatus)}`}>
                    {selectedMatch.winner !== "pending"
                      ? selectedMatch.winner === "halved"
                        ? "Match Halved"
                        : selectedMatch.winner === "player1"
                        ? `${(selectedMatch as any).player1Name ?? `Player ${selectedMatch.player1Id}`} Wins`
                        : `${(selectedMatch as any).player2Name ?? `Player ${selectedMatch.player2Id}`} Wins`
                      : formatMatchStatus(
                          selectedMatch.matchStatus,
                          holeResults.length,
                          18
                        )}
                  </div>

                  {/* Hole-by-hole summary */}
                  {holeResults.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Hole Results</p>
                      <div className="flex flex-wrap gap-1.5">
                        {holeResults.map((hr) => (
                          <div key={hr.holeNumber} className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-muted-foreground">{hr.holeNumber}</span>
                            {holeResultBadge(hr.result)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Score entry */}
              {selectedMatch.winner === "pending" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Enter Hole Result</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {lastResult && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        {lastResult}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4 items-end">
                      <div className="space-y-1.5">
                        <Label>Hole Number</Label>
                        <Input
                          type="number"
                          min={1}
                          max={18}
                          value={holeNumber}
                          onChange={(e) => setHoleNumber(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{(selectedMatch as any).player1Name ?? `Player ${selectedMatch.player1Id}`} Net Score</Label>
                        <Input
                          type="number"
                          min={1}
                          placeholder="e.g. 4"
                          value={p1Net}
                          onChange={(e) => setP1Net(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{(selectedMatch as any).player2Name ?? `Player ${selectedMatch.player2Id}`} Net Score</Label>
                        <Input
                          type="number"
                          min={1}
                          placeholder="e.g. 5"
                          value={p2Net}
                          onChange={(e) => setP2Net(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={!p1Net || !p2Net || submitting}
                      className="w-full"
                    >
                      {submitting ? "Saving…" : `Submit Hole ${holeNumber} Result`}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
