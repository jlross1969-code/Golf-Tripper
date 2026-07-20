import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, Users, Edit2, Mail, Shield, ShieldOff } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AdminPlayers() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: tripList } = trpc.trips.list.useQuery();
  const { data: trip } = trpc.trips.get.useQuery({ id });

  // Scope guard: must be global admin, trip owner, or co-admin for this trip
  const isGlobalAdmin = user?.role === "admin";
  const tripEntry = tripList?.find((t) => t.id === id);
  const isAuthorized = isGlobalAdmin || (tripEntry && (tripEntry.createdBy === user?.id || (tripEntry as any).isCoAdmin));

  useEffect(() => {
    if (tripList && user && !isAuthorized) navigate("/");
  }, [tripList, user, isAuthorized, navigate]);
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

  const setCoAdmin = trpc.players.setCoAdmin.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.isCoAdmin ? "Co-admin assigned" : "Co-admin removed");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // Count current co-admins
  const coAdminCount = players?.filter((p) => p.isCoAdmin).length ?? 0;
  // Only the trip owner can assign co-admins
  const isOwner = !!trip && !!user && trip.createdBy === user.id;

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
        {/* Co-admin info banner — only shown to trip owner */}
        {isOwner && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300">
              Co-admins can manage groups, scoring and settings for this trip.{" "}
              <span className="font-semibold">{coAdminCount}/4</span> assigned.
            </p>
          </div>
        )}

        {!players || players.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No players added yet.</p>
            <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Add First Player</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {players.map((p) => {
              const isCoAdmin = !!p.isCoAdmin;
              const atMax = coAdminCount >= 4 && !isCoAdmin;
              return (
                <div key={p.userId} className="bg-card border border-border rounded-xl px-4 py-3 space-y-2">
                  {/* Row 1: Avatar + name + action buttons */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {(p.nickname ?? p.user?.name)?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{p.nickname ?? p.user?.name ?? `User ${p.userId}`}</p>
                        {isCoAdmin && (
                          <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-1.5 py-0">
                            <Shield className="w-2.5 h-2.5 mr-1" />Co-Admin
                          </Badge>
                        )}
                      </div>
                      {p.nickname && p.user?.name && p.nickname !== p.user.name && (
                        <p className="text-xs text-muted-foreground">{p.user.name}</p>
                      )}
                      {p.user?.email && (
                        <p className="text-xs text-muted-foreground">{p.user.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Co-admin toggle — only visible to trip owner */}
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${isCoAdmin ? "text-amber-400 hover:text-amber-300" : atMax ? "opacity-30 cursor-not-allowed" : "text-muted-foreground hover:text-amber-400"}`}
                          title={isCoAdmin ? "Remove co-admin" : atMax ? "Maximum 4 co-admins reached" : "Make co-admin"}
                          disabled={atMax || setCoAdmin.isPending}
                          onClick={() => {
                            if (atMax) return;
                            setCoAdmin.mutate({ tripId: id, userId: p.userId, isCoAdmin: !isCoAdmin });
                          }}
                        >
                          {isCoAdmin ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                        </Button>
                      )}
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
                  {/* Row 2: HCP badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Current HCP</span>
                    <span className="text-sm font-bold text-primary">{p.currentHandicap}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Player Dialog */}
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
