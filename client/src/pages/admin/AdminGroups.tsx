import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useParams } from "wouter";
import { ArrowLeft, Plus, Trash2, Users, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const [addPartnerId, setAddPartnerId] = useState("");

  const createGroup = trpc.groups.create.useMutation({
    onSuccess: () => { toast.success("Group created"); setGroupOpen(false); refetch(); setGroupName(""); },
    onError: (e) => toast.error(e.message),
  });

  const addPlayer = trpc.groups.addPlayer.useMutation({
    onSuccess: () => { toast.success("Player added to group"); setPlayerOpen(false); refetch(); setAddUserId(""); setAddPartnerId(""); },
    onError: (e) => toast.error(e.message),
  });

  const deleteGroup = trpc.groups.delete.useMutation({
    onSuccess: () => { toast.success("Group deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

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
                <h3 className="font-semibold text-foreground">{group.name}</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-xs"
                    onClick={() => { setSelectedGroup(group.id); setPlayerOpen(true); }}>
                    <UserPlus className="w-3 h-3" /> Add Player
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    onClick={() => deleteGroup.mutate({ groupId: group.id })}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {group.players.length === 0 ? (
                <p className="text-xs text-muted-foreground">No players in this group.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {group.players.map((p) => (
                    <div key={p.userId} className="bg-muted rounded-full px-3 py-1 text-xs text-foreground flex items-center gap-1">
                      {p.nickname ?? p.user?.name ?? `User ${p.userId}`}
                      {p.partnerId && <span className="text-muted-foreground">+ partner</span>}
                    </div>
                  ))}
                </div>
              )}
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
          <div className="space-y-4 py-2">
            <div>
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
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">4BBB Partner (optional)</label>
              <Select value={addPartnerId} onValueChange={setAddPartnerId}>
                <SelectTrigger><SelectValue placeholder="Select partner..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No partner</SelectItem>
                  {players?.filter((p) => p.userId.toString() !== addUserId).map((p) => (
                    <SelectItem key={p.userId} value={p.userId.toString()}>
                      {p.nickname ?? p.user?.name ?? `User ${p.userId}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlayerOpen(false)}>Cancel</Button>
            <Button
              disabled={!addUserId || !selectedGroup || addPlayer.isPending}
              onClick={() => addPlayer.mutate({
                groupId: selectedGroup!,
                userId: Number(addUserId),
                partnerId: addPartnerId && addPartnerId !== "none" ? Number(addPartnerId) : undefined,
              })}
            >
              Add Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
