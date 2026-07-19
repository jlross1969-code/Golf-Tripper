import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link, useParams } from "wouter";
import { ArrowLeft, Plus, Users, Swords, Trophy, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";

const SIDE_MATCH_TYPES = [
  { value: "match_play", label: "Match Play" },
  { value: "nassau", label: "Nassau" },
  { value: "skins", label: "Skins" },
  { value: "stableford", label: "Stableford" },
  { value: "stroke", label: "Stroke Play" },
];

function holeResultIcon(result: "A" | "B" | "H") {
  if (result === "A") return <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">A</span>;
  if (result === "B") return <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-xs flex items-center justify-center font-bold">B</span>;
  return <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center"><Minus className="w-3 h-3" /></span>;
}

function matchStatusLabel(status: number, holesPlayed: number) {
  if (holesPlayed === 0) return { label: "Not started", color: "secondary" as const };
  if (status === 0) return { label: "All Square", color: "secondary" as const };
  const n = Math.abs(status);
  const side = status > 0 ? "Pair A" : "Pair B";
  return { label: `${side} ${n} UP`, color: "default" as const };
}

export default function SideMatches() {
  const { roundId } = useParams<{ roundId: string }>();
  const id = Number(roundId);
  const { user } = useAuth();

  const { data: roundData, isLoading } = trpc.rounds.get.useQuery({ id });
  const { data: groups } = trpc.groups.list.useQuery({ roundId: id });
  const { data: sideMatches, refetch } = trpc.sideMatches.list.useQuery({ roundId: id });
  const { data: groupMatches, isLoading: gmLoading } = trpc.groupMatch.getByRound.useQuery({ roundId: id });

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");

  const createMatch = trpc.sideMatches.create.useMutation({
    onSuccess: () => {
      toast.success("Side match created");
      setCreateOpen(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = async () => {
    if (!selectedGroupId || !selectedType) return;
    const group = groups?.find((g) => g.id === selectedGroupId);
    if (!group) return;
    await createMatch.mutateAsync({
      groupId: selectedGroupId,
      roundId: id,
      type: selectedType as any,
      players: group.players.map((p) => ({ userId: p.userId, partnerId: p.partnerId ?? undefined })),
    });
  };

  if (isLoading) return <div className="p-8"><Skeleton className="h-8 w-64" /></div>;
  if (!roundData) return <div className="p-8 text-muted-foreground">Round not found.</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/trip/${roundData.round.tripId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <Swords className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">Side Matches</h1>
            <p className="text-xs text-muted-foreground">{roundData.round.name}</p>
          </div>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> New Side Match
        </Button>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {/* ── Group 4BBB Matchplay section ── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" />
            Group 4BBB Matchplay
          </h2>

          {gmLoading && <Skeleton className="h-40 rounded-xl" />}

          {!gmLoading && (!groupMatches || groupMatches.length === 0) && (
            <div className="text-center py-10 bg-card border border-border rounded-xl">
              <Swords className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-1">No group matches yet.</p>
              <p className="text-xs text-muted-foreground">Matches are created when the admin locks pairs for a group.</p>
            </div>
          )}

          {groupMatches && groupMatches.map((match) => {
            const holeResults: ("A" | "B" | "H")[] = match.holeResultsParsed ?? [];
            const { label: statusLabel, color: statusColor } = matchStatusLabel(match.matchStatus, holeResults.length);
            const isComplete = match.winner !== "pending";
            const winnerLabel =
              match.winner === "halved" ? "Match Halved" :
              match.winner === "player1" ? `${match.pairANames.join(" & ")} Win` :
              match.winner === "player2" ? `${match.pairBNames.join(" & ")} Win` : null;

            return (
              <Card key={match.id} className="border-border mb-3">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="text-muted-foreground">Group Match</span>
                    {isComplete ? (
                      <Badge className="gap-1 bg-primary text-primary-foreground">
                        <Trophy className="w-3 h-3" /> {winnerLabel}
                      </Badge>
                    ) : (
                      <Badge variant={statusColor}>{statusLabel}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-4">
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-center">
                    <div className="space-y-1">
                      <Badge className="bg-blue-600 text-white text-xs">Pair A</Badge>
                      {match.pairANames.map((name: string, i: number) => (
                        <p key={i} className="text-sm font-medium text-foreground">{name}</p>
                      ))}
                    </div>
                    <span className="text-muted-foreground font-bold text-lg">vs</span>
                    <div className="space-y-1">
                      <Badge className="bg-orange-600 text-white text-xs">Pair B</Badge>
                      {match.pairBNames.map((name: string, i: number) => (
                        <p key={i} className="text-sm font-medium text-foreground">{name}</p>
                      ))}
                    </div>
                  </div>

                  {holeResults.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Hole results ({holeResults.length} played)</p>
                      <div className="flex flex-wrap gap-1">
                        {holeResults.map((r, i) => (
                          <div key={i} className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                            {holeResultIcon(r)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {holeResults.length > 0 && !isComplete && (
                    <div className="grid grid-cols-3 text-center text-sm border-t border-border pt-3">
                      <div>
                        <p className="font-bold text-blue-400">{holeResults.filter((r) => r === "A").length}</p>
                        <p className="text-xs text-muted-foreground">Pair A</p>
                      </div>
                      <div>
                        <p className="font-bold text-muted-foreground">{holeResults.filter((r) => r === "H").length}</p>
                        <p className="text-xs text-muted-foreground">Halved</p>
                      </div>
                      <div>
                        <p className="font-bold text-orange-400">{holeResults.filter((r) => r === "B").length}</p>
                        <p className="text-xs text-muted-foreground">Pair B</p>
                      </div>
                    </div>
                  )}

                  {holeResults.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Waiting for scores to be entered...</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* ── Other Side Matches section ── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Other Side Matches
          </h2>

          {!sideMatches || sideMatches.length === 0 ? (
            <div className="text-center py-10 bg-card border border-border rounded-xl">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-4">No other side matches yet.</p>
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Create Side Match
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sideMatches.map((match) => {
                const group = groups?.find((g) => g.id === match.groupId);
                const typeLabel = SIDE_MATCH_TYPES.find((t) => t.value === match.type)?.label ?? match.type;
                return (
                  <div key={match.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{typeLabel}</Badge>
                        <Badge variant={match.status === "active" ? "default" : match.status === "completed" ? "secondary" : "outline"}>
                          {match.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{group?.name ?? `Group ${match.groupId}`}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {match.players.map((p) => (
                        <span key={p.id} className="text-xs bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                          Player {p.userId}
                          {p.partnerId ? ` + ${p.partnerId}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Rules info */}
        <div className="px-4 py-3 bg-muted/50 rounded-xl text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground flex items-center gap-1">
            <Swords className="w-3.5 h-3.5 text-primary" />
            4BBB Stableford Matchplay Rules
          </p>
          <p>• Each hole: the best Stableford score from each pair is compared.</p>
          <p>• Higher score wins the hole. Equal scores halve the hole.</p>
          <p>• The pair that wins the most holes wins the match.</p>
          <p>• This is a group side match — separate from the main round leaderboard.</p>
        </div>
      </div>

      {/* Create Side Match Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Side Match</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Group</label>
              <Select value={selectedGroupId?.toString() ?? ""} onValueChange={(v) => setSelectedGroupId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group..." />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((g) => (
                    <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Match Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {SIDE_MATCH_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedGroupId || !selectedType || createMatch.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
