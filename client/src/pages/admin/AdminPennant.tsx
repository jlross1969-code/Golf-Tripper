import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, Users, Swords, Shield } from "lucide-react";
import { toast } from "sonner";

export default function AdminPennant() {
  const { tripId, roundId } = useParams<{ tripId: string; roundId: string }>();
  const roundIdNum = parseInt(roundId);
  const tripIdNum = parseInt(tripId);
  const { user } = useAuth();

  // Data
  const { data: teams, refetch: refetchTeams } = trpc.pennant.getTeams.useQuery({ roundId: roundIdNum });
  const { data: fixtures, refetch: refetchFixtures } = trpc.pennant.getFixtures.useQuery({ roundId: roundIdNum });
  const { data: tripPlayers } = trpc.players.tripPlayers.useQuery({ tripId: tripIdNum });
  const { data: roundData } = trpc.rounds.get.useQuery({ id: roundIdNum });

  // Team mutations
  const createTeam = trpc.pennant.createTeam.useMutation({
    onSuccess: () => { refetchTeams(); setShowCreateTeam(false); setNewTeamName(""); setNewTeamEmoji("🏌️"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteTeam = trpc.pennant.deleteTeam.useMutation({
    onSuccess: () => refetchTeams(),
    onError: (e) => toast.error(e.message),
  });
  const assignPlayer = trpc.pennant.assignPlayer.useMutation({
    onSuccess: () => refetchTeams(),
    onError: (e) => toast.error(e.message),
  });
  const removePlayer = trpc.pennant.removePlayer.useMutation({
    onSuccess: () => refetchTeams(),
    onError: (e) => toast.error(e.message),
  });

  // Fixture mutations
  const createFixture = trpc.pennant.createFixture.useMutation({
    onSuccess: () => { refetchFixtures(); setShowCreateFixture(false); resetFixtureForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteFixture = trpc.pennant.deleteFixture.useMutation({
    onSuccess: () => refetchFixtures(),
    onError: (e) => toast.error(e.message),
  });

  // Create team dialog state
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamEmoji, setNewTeamEmoji] = useState("🏌️");

  // Assign player state
  const [assigningTeamId, setAssigningTeamId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Create fixture dialog state
  const [showCreateFixture, setShowCreateFixture] = useState(false);
  const [fixtureType, setFixtureType] = useState<"singles" | "4bbb">("singles");
  const [useHandicap, setUseHandicap] = useState(true);
  const [teamAId, setTeamAId] = useState<string>("");
  const [teamBId, setTeamBId] = useState<string>("");
  const [player1A, setPlayer1A] = useState<string>("");
  const [player2A, setPlayer2A] = useState<string>("");
  const [player1B, setPlayer1B] = useState<string>("");
  const [player2B, setPlayer2B] = useState<string>("");

  function resetFixtureForm() {
    setFixtureType("singles");
    setUseHandicap(true);
    setTeamAId("");
    setTeamBId("");
    setPlayer1A("");
    setPlayer2A("");
    setPlayer1B("");
    setPlayer2B("");
  }

  // Compute unassigned players
  const assignedUserIds = new Set((teams ?? []).flatMap((t) => t.players.map((p) => p.userId)));
  const unassignedPlayers = (tripPlayers ?? []).filter((p) => !assignedUserIds.has(p.userId));

  function getTeamPlayers(teamId: number) {
    return (teams ?? []).find(t => t.id === teamId)?.players ?? [];
  }

  function formatMatchStatus(f: { matchStatus: number; holesPlayed: number; status: string; result: string | null; endedOnHole: number | null; teamAName: string; teamBName: string }) {
    if (f.status === "pending") return "Not started";
    if (f.status === "complete" && f.result) {
      const winner = f.result === "teamA" ? f.teamAName : f.result === "teamB" ? f.teamBName : null;
      if (winner) {
        const margin = Math.abs(f.matchStatus);
        const remaining = 18 - (f.endedOnHole ?? 18);
        return `${winner} wins ${margin}&${remaining}`;
      }
      return "Halved";
    }
    if (f.matchStatus === 0) return `All Square (${f.holesPlayed}H)`;
    const leading = f.matchStatus > 0 ? f.teamAName : f.teamBName;
    return `${leading} ${Math.abs(f.matchStatus)} UP (${f.holesPlayed}H)`;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/admin/trips/${tripId}/rounds`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" /> Match Play Setup
            </h1>
            <p className="text-sm text-muted-foreground">{roundData?.round?.name ?? `Round ${roundId}`}</p>
          </div>
        </div>

        {/* ── Teams Section ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Teams</CardTitle>
              <Button size="sm" onClick={() => setShowCreateTeam(true)} className="gap-1">
                <Plus className="w-3 h-3" /> New Team
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(!teams || teams.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No teams yet. Create two teams to get started.</p>
            )}
            {(teams ?? []).map(team => (
              <div key={team.id} className="border border-border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{team.emoji} {team.name}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => { setAssigningTeamId(team.id); setSelectedUserId(""); }}>
                      <Plus className="w-3 h-3" /> Add Player
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300"
                      onClick={() => { if (confirm(`Delete team "${team.name}"?`)) deleteTeam.mutate({ teamId: team.id }); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {/* Player assignment inline */}
                {assigningTeamId === team.id && (
                  <div className="flex gap-2 items-center">
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Select player…" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedPlayers.map((p) => (
                          <SelectItem key={p.userId} value={String(p.userId)}>
                            {p.nickname ?? p.user?.name ?? `Player ${p.userId}`} (HC: {p.currentHandicap ?? 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" disabled={!selectedUserId}
                      onClick={() => {
                        const tp = (tripPlayers ?? []).find((p) => p.userId === parseInt(selectedUserId));
                        if (!tp) return;
                        assignPlayer.mutate({ teamId: team.id, roundId: roundIdNum, userId: tp.userId, tripPlayerId: tp.id });
                        setAssigningTeamId(null);
                        setSelectedUserId("");
                      }}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAssigningTeamId(null)}>Cancel</Button>
                  </div>
                )}
                {/* Player list */}
                {team.players.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No players assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {team.players.map((p) => (
                      <Badge key={p.userId} variant="secondary" className="gap-1 pr-1">
                        {p.displayName} <span className="text-muted-foreground">HC:{p.currentHandicap}</span>
                        <button className="ml-1 text-red-400 hover:text-red-300"
                          onClick={() => removePlayer.mutate({ roundId: roundIdNum, userId: p.userId })}>×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Fixtures Section ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Swords className="w-4 h-4" /> Fixtures</CardTitle>
              {(teams ?? []).length >= 2 && (
                <Button size="sm" onClick={() => setShowCreateFixture(true)} className="gap-1">
                  <Plus className="w-3 h-3" /> New Fixture
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(!fixtures || fixtures.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No fixtures yet. Create teams first, then add fixtures.</p>
            )}
            {(fixtures ?? []).map(f => (
              <div key={f.id} className="border border-border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={f.type === "4bbb" ? "default" : "secondary"} className="text-xs">
                        {f.type === "4bbb" ? "4BBB" : "Singles"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {f.useHandicap ? "With Handicap" : "Scratch"}
                      </Badge>
                      {f.status === "complete" && (
                        <Badge className="text-xs bg-green-700">Complete</Badge>
                      )}
                      {f.status === "in_progress" && (
                        <Badge className="text-xs bg-yellow-700">In Progress</Badge>
                      )}
                    </div>
                    {/* Match display */}
                    <div className="text-sm font-medium mt-1">
                      <span className="text-blue-300">{f.teamAEmoji} {f.teamAName}</span>
                      <span className="mx-2 text-muted-foreground">vs</span>
                      <span className="text-orange-300">{f.teamBEmoji} {f.teamBName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {f.type === "4bbb" ? (
                        <>
                          <span className="text-blue-200">{f.player1AName} & {f.player2AName ?? "?"}</span>
                          <span className="mx-1">vs</span>
                          <span className="text-orange-200">{f.player1BName} & {f.player2BName ?? "?"}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-blue-200">{f.player1AName}</span>
                          <span className="mx-1">vs</span>
                          <span className="text-orange-200">{f.player1BName}</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs font-medium mt-1">
                      {formatMatchStatus(f as any)}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Link href={`/round/${roundId}/pennant/fixture/${f.id}`}>
                      <Button size="sm" variant="outline" className="text-xs gap-1">
                        <Swords className="w-3 h-3" /> Score
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300"
                      onClick={() => { if (confirm("Delete this fixture?")) deleteFixture.mutate({ fixtureId: f.id }); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* View Match Play Results link */}
        <div className="text-center">
          <Link href={`/round/${roundId}/match-play`}>
            <Button variant="outline" className="gap-2">
              <Shield className="w-4 h-4" /> View Match Play Results
            </Button>
          </Link>
        </div>
      </div>

      {/* Create Team Dialog */}
      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Team</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Team Name</Label>
              <Input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="e.g. Team Eagles" />
            </div>
            <div>
              <Label>Emoji</Label>
              <Input value={newTeamEmoji} onChange={e => setNewTeamEmoji(e.target.value)} placeholder="🏌️" maxLength={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateTeam(false)}>Cancel</Button>
            <Button disabled={!newTeamName.trim() || createTeam.isPending}
              onClick={() => createTeam.mutate({ roundId: roundIdNum, name: newTeamName.trim(), emoji: newTeamEmoji })}>
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Fixture Dialog */}
      <Dialog open={showCreateFixture} onOpenChange={setShowCreateFixture}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Fixture</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Match type */}
            <div>
              <Label>Match Type</Label>
              <div className="flex gap-2 mt-1">
                {(["singles", "4bbb"] as const).map(t => (
                  <Button key={t} size="sm"
                    variant={fixtureType === t ? "default" : "outline"}
                    onClick={() => setFixtureType(t)}>
                    {t === "singles" ? "Singles" : "4BBB"}
                  </Button>
                ))}
              </div>
            </div>
            {/* Handicap toggle */}
            <div className="flex items-center gap-3">
              <Switch checked={useHandicap} onCheckedChange={setUseHandicap} />
              <Label>{useHandicap ? "With Handicap" : "Scratch (no handicap)"}</Label>
            </div>
            <Separator />
            {/* Team A */}
            <div className="space-y-2">
              <div>
                <Label>Team A</Label>
                <Select value={teamAId} onValueChange={v => { setTeamAId(v); setPlayer1A(""); setPlayer2A(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select Team A…" /></SelectTrigger>
                  <SelectContent>
                    {(teams ?? []).map(t => <SelectItem key={t.id} value={String(t.id)}>{t.emoji} {t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {teamAId && (
                <div className="pl-3 space-y-2 border-l-2 border-blue-700">
                  <div>
                    <Label className="text-xs">{fixtureType === "4bbb" ? "Player 1 (Team A)" : "Player (Team A)"}</Label>
                    <Select value={player1A} onValueChange={setPlayer1A}>
                      <SelectTrigger><SelectValue placeholder="Select player…" /></SelectTrigger>
                      <SelectContent>
                        {getTeamPlayers(parseInt(teamAId)).map(p => (
                          <SelectItem key={p.userId} value={String(p.userId)}>{p.displayName} (HC:{p.currentHandicap})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {fixtureType === "4bbb" && (
                    <div>
                      <Label className="text-xs">Player 2 (Team A)</Label>
                      <Select value={player2A} onValueChange={setPlayer2A}>
                        <SelectTrigger><SelectValue placeholder="Select partner…" /></SelectTrigger>
                        <SelectContent>
                          {getTeamPlayers(parseInt(teamAId)).filter(p => String(p.userId) !== player1A).map(p => (
                            <SelectItem key={p.userId} value={String(p.userId)}>{p.displayName} (HC:{p.currentHandicap})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Team B */}
            <div className="space-y-2">
              <div>
                <Label>Team B</Label>
                <Select value={teamBId} onValueChange={v => { setTeamBId(v); setPlayer1B(""); setPlayer2B(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select Team B…" /></SelectTrigger>
                  <SelectContent>
                    {(teams ?? []).filter((t) => String(t.id) !== teamAId).map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.emoji} {t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {teamBId && (
                <div className="pl-3 space-y-2 border-l-2 border-orange-700">
                  <div>
                    <Label className="text-xs">{fixtureType === "4bbb" ? "Player 1 (Team B)" : "Player (Team B)"}</Label>
                    <Select value={player1B} onValueChange={setPlayer1B}>
                      <SelectTrigger><SelectValue placeholder="Select player…" /></SelectTrigger>
                      <SelectContent>
                        {getTeamPlayers(parseInt(teamBId)).map((p) => (
                          <SelectItem key={p.userId} value={String(p.userId)}>{p.displayName} (HC:{p.currentHandicap})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {fixtureType === "4bbb" && (
                    <div>
                      <Label className="text-xs">Player 2 (Team B)</Label>
                      <Select value={player2B} onValueChange={setPlayer2B}>
                        <SelectTrigger><SelectValue placeholder="Select partner…" /></SelectTrigger>
                        <SelectContent>
                          {getTeamPlayers(parseInt(teamBId)).filter((p) => String(p.userId) !== player1B).map((p) => (
                            <SelectItem key={p.userId} value={String(p.userId)}>{p.displayName} (HC:{p.currentHandicap})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowCreateFixture(false); resetFixtureForm(); }}>Cancel</Button>
            <Button
              disabled={
                createFixture.isPending ||
                !teamAId || !teamBId || !player1A || !player1B ||
                (fixtureType === "4bbb" && (!player2A || !player2B))
              }
              onClick={() => {
                createFixture.mutate({
                  roundId: roundIdNum,
                  teamAId: parseInt(teamAId),
                  teamBId: parseInt(teamBId),
                  type: fixtureType,
                  useHandicap,
                  player1AId: parseInt(player1A),
                  player2AId: fixtureType === "4bbb" ? parseInt(player2A) : undefined,
                  player1BId: parseInt(player1B),
                  player2BId: fixtureType === "4bbb" ? parseInt(player2B) : undefined,
                });
              }}>
              Create Fixture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
