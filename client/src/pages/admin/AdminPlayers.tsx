import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link, useParams } from "wouter";
import { ArrowLeft, Plus, Trash2, Users, Edit2, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminPlayers() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);

  const { data: trip } = trpc.trips.get.useQuery({ id });
  const { data: players, refetch } = trpc.players.tripPlayers.useQuery({ tripId: id });
  const { data: invites, refetch: refetchInvites } = trpc.invites.list.useQuery({ tripId: id });

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [handicap, setHandicap] = useState("");
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editHandicap, setEditHandicap] = useState("");
  const [editReason, setEditReason] = useState("");

  const addInvite = trpc.invites.create.useMutation({
    onSuccess: () => {
      toast.success("Player added — invite link ready");
      setAddOpen(false);
      refetch();
      setNewName("");
      setNewEmail("");
      setHandicap("");
    },
    onError: (e) => toast.error(e.message),
  });

  const removePlayer = trpc.players.remove.useMutation({
    onSuccess: () => { toast.success("Player removed"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const updateHandicap = trpc.players.updateHandicap.useMutation({
    onSuccess: () => { toast.success("Handicap updated"); setEditOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });



  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <Users className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">Players</h1>
            <p className="text-xs text-muted-foreground">{trip?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/trips/${id}/roster`}>
            <Button size="sm" variant="outline" className="gap-2">
              <Mail className="w-4 h-4" /> Invite via Link
            </Button>
          </Link>
          <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add Player
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {!players || players.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No players added yet.</p>
            <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Add First Player</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {players.map((p) => (
              <div key={p.userId} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {p.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{p.user?.name ?? `User ${p.userId}`}</p>
                  <p className="text-xs text-muted-foreground">{p.user?.email}</p>
                </div>
                <div className="text-right mr-2">
                  <p className="text-lg font-bold text-primary">{p.currentHandicap}</p>
                  <p className="text-xs text-muted-foreground">Current HCP</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => { setEditUserId(p.userId); setEditHandicap(p.currentHandicap.toString()); setEditReason(""); setEditOpen(true); }}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removePlayer.mutate({ tripId: id, userId: p.userId })}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Player Dialog — free-text entry, creates invite record */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Player to Trip</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">Enter the player's details. An invite link will be generated that you can share with them via WhatsApp or SMS.</p>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Full Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. John Smith"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email (optional)</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. john@example.com"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Starting Handicap</label>
              <Input
                type="number"
                min={0}
                max={54}
                value={handicap}
                onChange={(e) => setHandicap(e.target.value)}
                placeholder="e.g. 18"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              disabled={!newName.trim() || !handicap || addInvite.isPending}
              onClick={() =>
                addInvite.mutate({
                  tripId: id,
                  name: newName.trim(),
                  email: newEmail.trim() || `${newName.trim().toLowerCase().replace(/\s+/g, '.')}.noemail@golftrip.local`,
                  startingHandicap: Number(handicap),
                  origin: window.location.origin,
                })
              }
            >
              {addInvite.isPending ? "Adding..." : "Add Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Handicap Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manual Handicap Override</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">New Handicap</label>
              <Input type="number" min={0} max={54} value={editHandicap} onChange={(e) => setEditHandicap(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Reason (optional)</label>
              <Input value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="e.g. Admin correction" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              disabled={!editHandicap || !editUserId || updateHandicap.isPending}
              onClick={() => updateHandicap.mutate({ tripId: id, userId: editUserId!, newHandicap: Number(editHandicap), reason: editReason || undefined })}
            >
              Update Handicap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
