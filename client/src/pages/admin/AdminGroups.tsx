import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useParams } from "wouter";
import { ArrowLeft, Plus, Trash2, Users, UserPlus, Lock, Swords } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type GroupPlayer = {
  id: number;
  userId: number;
  groupId: number;
  partnerId: number | null;
  pairId: number | null;
  scorerId: number | null;
  user?: { id: number; name: string | null } | undefined;
  nickname?: string | null;
};

export default function AdminGroups() {
  const { tripId, roundId } = useParams<{ tripId: string; roundId: string }>();
  const tId = Number(tripId);
  const rId = Number(roundId);

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

  const createGroup = trpc.groups.create.useMutation({
    onSuccess: () => { toast.success("Group created"); setGroupOpen(false); refetch(); setGroupName(""); },
    onError: (e) => toast.error(e.message),
  });

  const addPlayer = trpc.groups.addPlayer.useMutation({
    onSuccess: () => { toast.success("Player added to group"); setPlayerOpen(false); refetch(); setAddUserId(""); },
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

  function playerName(p: GroupPlayer) {
    return p.nickname ?? p.user?.name ?? `User ${p.userId}`;
  }

  function renderGroupPlayers(group: { id: number; name: string; pairsLocked: boolean; players: GroupPlayer[] }) {
    const pairA = group.players.filter((p) => p.pairId === 1);
    const pairB = group.players.filter((p) => p.pairId === 2);
    const unpaired = group.players.filter((p) => !p.pairId);

    return (
      <div className="space-y-3">
        {/* Pair A */}
        {pairA.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge className="text-xs bg-blue-600 text-white shrink-0">Pair A</Badge>
            <div className="flex flex-wrap gap-1">
              {pairA.map((p) => (
                <span key={p.userId} className="bg-blue-600/20 text-blue-300 border border-blue-600/30 rounded-full px-3 py-0.5 text-xs">
                  {playerName(p)}
                </span>
              ))}
            </div>
          </div>
        )}
        {/* Pair B */}
        {pairB.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge className="text-xs bg-orange-600 text-white shrink-0">Pair B</Badge>
            <div className="flex flex-wrap gap-1">
              {pairB.map((p) => (
                <span key={p.userId} className="bg-orange-600/20 text-orange-300 border border-orange-600/30 rounded-full px-3 py-0.5 text-xs">
                  {playerName(p)}
                </span>
              ))}
            </div>
          </div>
        )}
        {/* Unpaired */}
        {unpaired.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs shrink-0">Unpaired</Badge>
            <div className="flex flex-wrap gap-1">
              {unpaired.map((p) => (
                <span key={p.userId} className="bg-muted rounded-full px-3 py-0.5 text-xs text-muted-foreground">
                  {playerName(p)}
                </span>
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
        <Button size="sm" className="gap-2" onClick={() => setGroupOpen(true)}>
          <Plus className="w-4 h-4" /> New Group
        </Button>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        {!groups || groups.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No groups yet.</p>
            <Button onClick={() => setGroupOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Create Group</Button>
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
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-xs"
                    onClick={() => { setSelectedGroup(group.id); setPlayerOpen(true); }}>
                    <UserPlus className="w-3 h-3" /> Add Player
                  </Button>
                  {group.players.length >= 2 && !group.pairsLocked && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => { setPairGroupId(group.id); setPairOpen(true); }}>
                      <Swords className="w-3 h-3" /> Set Pair
                    </Button>
                  )}
                  {group.players.length === 4 && !group.pairsLocked && (
                    <Button size="sm" variant="default" className="gap-1 text-xs bg-primary"
                      disabled={lockPairs.isPending}
                      onClick={() => lockPairs.mutate({ groupId: group.id, roundId: rId })}>
                      <Lock className="w-3 h-3" /> Lock Pairs
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    onClick={() => deleteGroup.mutate({ groupId: group.id })}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {renderGroupPlayers(group as any)}
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

      {/* Add Player to Group Dialog */}
      <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Player to Group</DialogTitle></DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-1 block">Player</label>
            <Select value={addUserId} onValueChange={setAddUserId}>
              <SelectTrigger><SelectValue placeholder="Select player..." /></SelectTrigger>
              <SelectContent>
                {players?.map((p) => (
                  <SelectItem key={p.userId} value={p.userId.toString()}>
                    {p.nickname ?? p.user?.name ?? `User ${p.userId}`} (HCP {p.currentHandicap})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlayerOpen(false)}>Cancel</Button>
            <Button
              disabled={!addUserId || !selectedGroup || addPlayer.isPending}
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
    </div>
  );
}
