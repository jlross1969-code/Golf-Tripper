import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "wouter";
import { ArrowLeft, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function AmbroseScoreEntry() {
  const { roundId } = useParams<{ roundId: string }>();
  const rid = Number(roundId);

  const { data: roundData, isLoading: roundLoading } = trpc.rounds.get.useQuery({ id: rid });
  const { data: myGroup, isLoading: groupLoading } = trpc.groups.getMyGroup.useQuery({ roundId: rid });
  const { data: existingScores, refetch: refetchScores } = trpc.ambrose.getGroupScores.useQuery(
    { roundId: rid, groupId: myGroup?.groupId ?? 0 },
    { enabled: !!myGroup?.groupId }
  );

  const [currentHoleIdx, setCurrentHoleIdx] = useState(0);
  const [scores, setScores] = useState<Record<number, number>>({});

  const submitScore = trpc.ambrose.submitScore.useMutation({
    onSuccess: () => {
      toast.success("Score saved!");
      refetchScores();
    },
    onError: (e) => toast.error(e.message),
  });

  const round = roundData?.round;
  const holes = useMemo(() => roundData?.holes ?? [], [roundData]);
  const currentHole = holes[currentHoleIdx];

  useMemo(() => {
    if (existingScores && existingScores.length > 0) {
      const map: Record<number, number> = {};
      for (const s of existingScores) {
        map[s.holeId] = s.grossScore;
      }
      setScores((prev) => ({ ...map, ...prev }));
    }
  }, [existingScores]);

  if (roundLoading || groupLoading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  if (!round || !(round as any).ambroseEnabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">This round does not have Ambrose enabled.</p>
          <Link href="/"><Button variant="outline">Go Home</Button></Link>
        </div>
      </div>
    );
  }

  if (!myGroup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">You are not assigned to a group for this round.</p>
          <Link href="/"><Button variant="outline">Go Home</Button></Link>
        </div>
      </div>
    );
  }

  const teamPlayers: any[] = (myGroup as any).players ?? [];
  const teamName: string = (myGroup as any).teamName ?? (myGroup as any).name ?? "Team";
  const teamEmoji: string | null = (myGroup as any).teamEmoji ?? null;

  const holesCompleted = holes.filter((h) => scores[h.id] !== undefined).length;

  function handleScore(holeId: number, gross: number) {
    setScores((prev) => ({ ...prev, [holeId]: gross }));
  }

  function saveCurrentHole() {
    if (!currentHole || scores[currentHole.id] === undefined) return;
    submitScore.mutate({
      roundId: rid,
      groupId: (myGroup as any).groupId,
      holeId: currentHole.id,
      holeNumber: currentHole.holeNumber,
      grossScore: scores[currentHole.id],
    });
  }

  const currentScore = currentHole ? scores[currentHole.id] : undefined;
  const currentPar = currentHole?.par ?? 4;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/round/${rid}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="font-bold text-foreground text-sm">🏌️ Ambrose Score Entry</h1>
            <p className="text-xs text-muted-foreground">{round.name}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs border-purple-700 text-purple-300">
          {holesCompleted}/{holes.length} holes
        </Badge>
      </header>

      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        {teamEmoji && <span className="text-2xl">{teamEmoji}</span>}
        <div>
          <p className="font-semibold text-foreground">{teamName}</p>
          <p className="text-xs text-muted-foreground">
            {teamPlayers.map((p) => p.userName ?? p.name ?? "Player").join(" · ")}
          </p>
        </div>
      </div>

      {holes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No holes found for this course.</div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" disabled={currentHoleIdx === 0} onClick={() => setCurrentHoleIdx((i) => i - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">Hole {currentHole?.holeNumber}</p>
              <p className="text-sm text-muted-foreground">
                Par {currentPar} · SI {currentHole?.strokeIndex}
                {(currentHole as any)?.distanceMetres ? ` · ${(currentHole as any).distanceMetres}m` : ""}
              </p>
            </div>
            <Button variant="outline" size="icon" disabled={currentHoleIdx === holes.length - 1} onClick={() => setCurrentHoleIdx((i) => i + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {currentHole && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <p className="text-sm font-medium text-muted-foreground text-center">Team Gross Score</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {Array.from({ length: 9 }, (_, i) => currentPar - 2 + i).map((score) => {
                  const diff = score - currentPar;
                  let idle = "";
                  if (diff <= -2) idle = "bg-yellow-400/20 border-yellow-500/50 text-yellow-300 hover:border-yellow-400";
                  else if (diff === -1) idle = "bg-green-500/20 border-green-500/50 text-green-300 hover:border-green-400";
                  else if (diff === 0) idle = "bg-blue-500/20 border-blue-500/50 text-blue-300 hover:border-blue-400";
                  else if (diff === 1) idle = "bg-orange-500/20 border-orange-500/50 text-orange-300 hover:border-orange-400";
                  else idle = "bg-red-500/20 border-red-500/50 text-red-300 hover:border-red-400";
                  const active = "bg-primary border-primary text-primary-foreground scale-110";
                  return (
                    <div
                      key={score}
                      onClick={() => handleScore(currentHole.id, score)}
                      className={`w-12 h-12 rounded-xl border-2 font-bold text-lg flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
                        currentScore === score ? active : idle
                      }`}
                    >
                      {score}
                    </div>
                  );
                })}
              </div>

              {currentScore !== undefined && (
                <div className="text-center text-sm">
                  {currentScore - currentPar <= -2 && <span className="text-yellow-400 font-semibold">Eagle or better 🦅</span>}
                  {currentScore - currentPar === -1 && <span className="text-green-400 font-semibold">Birdie 🐦</span>}
                  {currentScore - currentPar === 0 && <span className="text-blue-400 font-semibold">Par ✓</span>}
                  {currentScore - currentPar === 1 && <span className="text-orange-400 font-semibold">Bogey</span>}
                  {currentScore - currentPar === 2 && <span className="text-red-400 font-semibold">Double Bogey</span>}
                  {currentScore - currentPar > 2 && <span className="text-red-500 font-semibold">+{currentScore - currentPar}</span>}
                </div>
              )}

              <Button
                className="w-full gap-2"
                disabled={currentScore === undefined || submitScore.isPending}
                onClick={saveCurrentHole}
              >
                <CheckCircle className="w-4 h-4" />
                {submitScore.isPending ? "Saving..." : "Save Score"}
              </Button>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scorecard</p>
            </div>
            <div className="divide-y divide-border">
              {holes.map((hole, idx) => {
                const gross = scores[hole.id];
                const diff = gross !== undefined ? gross - (hole.par ?? 4) : null;
                return (
                  <button
                    key={hole.id}
                    type="button"
                    className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                      idx === currentHoleIdx ? "bg-primary/10" : "hover:bg-accent/50"
                    }`}
                    onClick={() => setCurrentHoleIdx(idx)}
                  >
                    <span className="w-6 text-xs font-semibold text-muted-foreground text-center">{hole.holeNumber}</span>
                    <span className="text-xs text-muted-foreground flex-1">Par {hole.par} · SI {hole.strokeIndex}</span>
                    {gross !== undefined ? (
                      <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${
                        diff! <= -2 ? "bg-yellow-400/20 text-yellow-300"
                        : diff === -1 ? "bg-green-500/20 text-green-300"
                        : diff === 0 ? "bg-blue-500/20 text-blue-300"
                        : diff === 1 ? "bg-orange-500/20 text-orange-300"
                        : "bg-red-500/20 text-red-300"
                      }`}>{gross}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
