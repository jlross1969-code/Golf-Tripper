import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, Users, UserPlus, Lock, Swords, X, Shuffle, Clock, Flag } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

type GroupPlayer = {
  id: number;
  userId: number;
  groupId: number;
  partnerId: number | null;
  pairId: number | null;
  scorerId: number | null;
  user?: { id: number; name: string | null } | undefined;
  nickname?: string | null;
  currentHandicap?: number | null;
};

export default function AdminGroups() {
  const { tripId, roundId } = useParams<{ tripId: string; roundId: string }>();
  const tId = Number(tripId);
  const rId = Number(roundId);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: tripList } = trpc.trips.list.useQuery();

  // Scope guard: must be global admin, trip owner, or co-admin for this trip
  const isGlobalAdmin = user?.role === "admin";
  const tripEntry = tripList?.find((t) => t.id === tId);
  const isAuthorized = isGlobalAdmin || (tripEntry && (tripEntry.createdBy === user?.id || (tripEntry as any).isCoAdmin));

  useEffect(() => {
    if (tripList && user && !isAuthorized) navigate("/");
  }, [tripList, user, isAuthorized, navigate]);

  const { data: roundData } = trpc.rounds.get.useQuery({ id: rId });
  const { data: groups, refetch } = trpc.groups.list.useQuery({ roundId: rId, tripId: tId });
  const { data: players } = trpc.players.tripPlayers.useQuery({ tripId: tId });

  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [playerOpen, setPlayerOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [addUserId, setAddUserId] = useState("");

  // Pair assignment state
  const [pairOpen, setPairOpen] = useState(false);
  const [pairGroupId, setPairGroupId] = useState<number | null>(null);
  const [pairPlayer1, setPairPlayer1] = useState("");
  const [pairPlayer2, setPairPlayer2] = useState("");
  const [pairId, setPairId] = useState<"1" | "2">("1");

  // Auto-group state
  const [autoGroupOpen, setAutoGroupOpen] = useState(false);
  const [autoGroupCount, setAutoGroupCount] = useState("");

  // Compute set of userIds already assigned to any group in this round
  const assignedUserIds = new Set<number>(
    (groups ?? []).flatMap((g) => g.players.map((p) => p.userId))
  );

  const createGroup = trpc.groups.create.useMutation({
    onSuccess: () => { toast.success("Group created"); setGroupOpen(false); refetch(); setGroupName(""); },
    onError: (e) => toast.error(e.message),
  });

  const addPlayer = trpc.groups.addPlayer.useMutation({
    onSuccess: () => { toast.success("Player added to group"); setPlayerOpen(false); refetch(); setAddUserId(""); },
    onError: (e) => toast.error(e.message),
  });

  const removePlayer = trpc.groups.removePlayer.useMutation({
    onSuccess: () => { toast.success("Player removed from group"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteGroup = trpc.groups.delete.useMutation({
    onSuccess: () => { toast.success("Group deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const setPair = trpc.groups.setPair.useMutation({
    onSuccess: () => {
      toast.success("Pair assigned");
      setPairOpen(false);
      refetch();
      setPairPlayer1(""); setPairPlayer2(""); setPairId("1");
    },
    onError: (e) => toast.error(e.message),
  });

  const lockPairs = trpc.groups.lockPairs.useMutation({
    onSuccess: (data) => {
      toast.success(data.matchId ? "Pairs locked — group match created!" : "Pairs locked");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const unlockPairs = trpc.groups.unlockPairs.useMutation({
    onSuccess: () => { toast.success("Pairs unlocked — you can now reassign players"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Tee time / starting hole inline edit state per group
  const [teeTimeEdits, setTeeTimeEdits] = useState<Record<number, string>>({});
  const [startingHoleEdits, setStartingHoleEdits] = useState<Record<number, string>>({});

  const updateSettings = trpc.groups.updateSettings.useMutation({
    onSuccess: () => { toast.success("Group settings saved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const autoGroup = trpc.groups.autoGroup.useMutation({
    onSuccess: (data) => {
      toast.success(`Auto-grouped ${data.totalPlayers} players into ${data.groupIds.length} groups with pairs assigned`);
      setAutoGroupOpen(false);
      setAutoGroupCount("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  function playerName(p: GroupPlayer) {
    return p.nickname ?? p.user?.name ?? `User ${p.userId}`;
  }

  // Players not yet assigned to any group (available for selection)
  const availablePlayers = (players ?? []).filter((p) => !assignedUserIds.has(p.userId));

  function renderGroupPlayers(group: { id: number; name: string; pairsLocked: boolean; players: GroupPlayer[] }) {
    const pairA = group.players.filter((p) => p.pairId === 1);
    const pairB = group.players.filter((p) => p.pairId === 2);
    const unpaired = group.players.filter((p) => !p.pairId);

    function PlayerChip({ p, color }: { p: GroupPlayer; color: string }) {
      return (
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs ${color}`}>
          {playerName(p)}
          {p.currentHandicap != null && (
            <span className="opacity-60 font-normal">{p.currentHandicap}</span>
          )}
          {!group.pairsLocked && (
            <button
              className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
              title="Remove from group"
              onClick={() => removePlayer.mutate({ groupId: group.id, userId: p.userId })}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      );
    }

    return (
      <div className="space-y-3">
        {pairA.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge className="text-xs bg-blue-600 text-white shrink-0">Pair A</Badge>
            <div className="flex flex-wrap gap-1">
              {pairA.map((p) => (
                <PlayerChip key={p.userId} p={p} color="bg-blue-600/20 text-blue-300 border border-blue-600/30" />
              ))}
            </div>
          </div>
        )}
        {pairB.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge className="text-xs bg-orange-600 text-white shrink-0">Pair B</Badge>
            <div className="flex flex-wrap gap-1">
              {pairB.map((p) => (
                <PlayerChip key={p.userId} p={p} color="bg-orange-600/20 text-orange-300 border border-orange-600/30" />
              ))}
            </div>
          </div>
        )}
        {unpaired.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs shrink-0">Unpaired</Badge>
            <div className="flex flex-wrap gap-1">
              {unpaired.map((p) => (
                <PlayerChip key={p.userId} p={p} color="bg-muted text-muted-foreground" />
              ))}
            </div>
          </div>
        )}
        {group.players.length === 0 && (
          <p className="text-xs text-muted-foreground">No players in this group.</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/trips/${tId}/rounds`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <Users className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">Groups</h1>
            <p className="text-xs text-muted-foreground">{roundData?.round.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/trip/${tId}/round/${rId}/teesheet`}>
            <Button size="sm" variant="outline" className="gap-2">
              <Flag className="w-4 h-4" /> Tee Sheet
            </Button>
          </Link>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setAutoGroupOpen(true)}>
            <Shuffle className="w-4 h-4" /> Auto-Group
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setGroupOpen(true)}>
            <Plus className="w-4 h-4" /> New Group
          </Button>
        </div>
      </header>

      {/* Unassigned players banner */}
      {availablePlayers.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-amber-400 font-medium shrink-0">{availablePlayers.length} unassigned:</span>
          {availablePlayers.map((p) => (
            <span key={p.userId} className="text-xs text-amber-300 bg-amber-500/10 rounded-full px-2 py-0.5">
              {p.nickname ?? p.user?.name ?? `Player ${p.userId}`} (HCP {p.currentHandicap})
            </span>
          ))}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        {!groups || groups.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No groups yet.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setAutoGroupOpen(true)} className="gap-2">
                <Shuffle className="w-4 h-4" /> Auto-Group All
              </Button>
              <Button onClick={() => setGroupOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Create Group
              </Button>
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{group.name}</h3>
                  {group.pairsLocked && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Lock className="w-3 h-3" /> Pairs Locked
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{group.players.length} players</span>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {!group.pairsLocked && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => { setSelectedGroup(group.id); setAddUserId(""); setPlayerOpen(true); }}>
                      <UserPlus className="w-3 h-3" /> Add
                    </Button>
                  )}
                  {group.players.length >= 2 && !group.pairsLocked && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => { setPairGroupId(group.id); setPairOpen(true); }}>
                      <Swords className="w-3 h-3" /> Set Pair
                    </Button>
                  )}
                  {group.players.length >= 2 && !group.pairsLocked && (
                    <Button size="sm" variant="default" className="gap-1 text-xs bg-primary"
                      disabled={lockPairs.isPending}
                      onClick={() => lockPairs.mutate({ groupId: group.id, roundId: rId })}>
                      <Lock className="w-3 h-3" /> Lock
                    </Button>
                  )}
                  {group.pairsLocked && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
                      disabled={unlockPairs.isPending}
                      onClick={() => unlockPairs.mutate({ groupId: group.id })}>
                      <Lock className="w-3 h-3" /> Unlock
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    onClick={() => deleteGroup.mutate({ groupId: group.id })}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {renderGroupPlayers(group as any)}

              {/* Tee time & starting hole */}
              <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Tee Time
                  </label>
                  <input
                    type="time"
                    className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground w-28 focus:outline-none focus:ring-1 focus:ring-primary"
                    value={teeTimeEdits[group.id] ?? (group as any).teeTime ?? ""}
                    onChange={(e) => setTeeTimeEdits((prev) => ({ ...prev, [group.id]: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Flag className="w-3 h-3" /> Starting Hole
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={18}
                    className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground w-20 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="1–18"
                    value={startingHoleEdits[group.id] ?? ((group as any).startingHole != null ? String((group as any).startingHole) : "")}
                    onChange={(e) => setStartingHoleEdits((prev) => ({ ...prev, [group.id]: e.target.value }))}
                  />
                </div>
                <button
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                  disabled={updateSettings.isPending}
                  onClick={() => {
                    const tt = teeTimeEdits[group.id] ?? (group as any).teeTime ?? null;
                    const sh = startingHoleEdits[group.id] !== undefined
                      ? (startingHoleEdits[group.id] === "" ? null : Number(startingHoleEdits[group.id]))
                      : ((group as any).startingHole ?? null);
                    updateSettings.mutate({ groupId: group.id, teeTime: tt || null, startingHole: sh });
                  }}
                >
                  Save
                </button>
                {((group as any).teeTime || (group as any).startingHole) && (
                  <span className="text-xs text-muted-foreground">
                    {(group as any).teeTime && <span className="mr-2">⏰ {(group as any).teeTime}</span>}
                    {(group as any).startingHole && <span>Hole {(group as any).startingHole}</span>}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Group</DialogTitle></DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-1 block">Group Name</label>
            <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Group A" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupOpen(false)}>Cancel</Button>
            <Button
              disabled={!groupName || createGroup.isPending}
              onClick={() => createGroup.mutate({ roundId: rId, tripId: tId, name: groupName })}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Player to Group Dialog — only shows unassigned players */}
      <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Player to Group</DialogTitle>
            <DialogDescription>
              Only players not yet assigned to a group are shown.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-1 block">Player</label>
            <Select value={addUserId} onValueChange={setAddUserId}>
              <SelectTrigger><SelectValue placeholder="Select player..." /></SelectTrigger>
              <SelectContent>
                {availablePlayers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">All players are already assigned.</div>
                ) : (
                  availablePlayers.map((p) => (
                    <SelectItem key={p.userId} value={p.userId.toString()}>
                      {p.nickname ?? p.user?.name ?? `User ${p.userId}`} (HCP {p.currentHandicap})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlayerOpen(false)}>Cancel</Button>
            <Button
              disabled={!addUserId || !selectedGroup || addPlayer.isPending || availablePlayers.length === 0}
              onClick={() => addPlayer.mutate({ groupId: selectedGroup!, userId: Number(addUserId) })}
            >
              Add Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Pair Dialog */}
      <Dialog open={pairOpen} onOpenChange={setPairOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-primary" />
              Assign Pair
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Select two players and assign them as Pair A or Pair B. Pair A will play a 4BBB Stableford Matchplay against Pair B.
            </p>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Pair</label>
              <Select value={pairId} onValueChange={(v) => setPairId(v as "1" | "2")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Pair A (blue)</SelectItem>
                  <SelectItem value="2">Pair B (orange)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Player 1</label>
              <Select value={pairPlayer1} onValueChange={setPairPlayer1}>
                <SelectTrigger><SelectValue placeholder="Select player..." /></SelectTrigger>
                <SelectContent>
                  {groups?.find((g) => g.id === pairGroupId)?.players
                    .filter((p) => p.userId.toString() !== pairPlayer2)
                    .map((p) => (
                      <SelectItem key={p.userId} value={p.userId.toString()}>
                        {p.nickname ?? p.user?.name ?? `User ${p.userId}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Player 2 (partner)</label>
              <Select value={pairPlayer2} onValueChange={setPairPlayer2}>
                <SelectTrigger><SelectValue placeholder="Select partner..." /></SelectTrigger>
                <SelectContent>
                  {groups?.find((g) => g.id === pairGroupId)?.players
                    .filter((p) => p.userId.toString() !== pairPlayer1)
                    .map((p) => (
                      <SelectItem key={p.userId} value={p.userId.toString()}>
                        {p.nickname ?? p.user?.name ?? `User ${p.userId}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPairOpen(false)}>Cancel</Button>
            <Button
              disabled={!pairPlayer1 || !pairPlayer2 || !pairGroupId || setPair.isPending}
              onClick={() => setPair.mutate({
                groupId: pairGroupId!,
                player1UserId: Number(pairPlayer1),
                player2UserId: Number(pairPlayer2),
                pairId: Number(pairId) as 1 | 2,
              })}
            >
              Assign Pair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Group Dialog */}
      <Dialog open={autoGroupOpen} onOpenChange={setAutoGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-primary" />
              Auto-Group Players
            </DialogTitle>
            <DialogDescription>
              Automatically creates groups and pairs all {players?.length ?? 0} trip players. Pairs are formed by matching lowest handicaps with highest (snake draft), so each group has a balanced match.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
              ⚠️ This will delete all existing groups for this round and recreate them.
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Number of Groups <span className="text-muted-foreground font-normal">(optional — default: auto)</span>
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={autoGroupCount}
                onChange={(e) => setAutoGroupCount(e.target.value)}
                placeholder={`Auto (${Math.ceil((players?.length ?? 0) / 4)} groups)`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to auto-calculate based on {players?.length ?? 0} players (4 per group).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoGroupOpen(false)}>Cancel</Button>
            <Button
              disabled={autoGroup.isPending}
              onClick={() => autoGroup.mutate({
                roundId: rId,
                tripId: tId,
                groupCount: autoGroupCount ? Number(autoGroupCount) : undefined,
              })}
            >
              {autoGroup.isPending ? "Grouping..." : "Auto-Group Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
