import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { Plus, Flag, ChevronRight, Settings, Users, Calendar, BarChart2, Pencil, Trash2, AlertTriangle, Copy, MapPin, Link2Off } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Trip = {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  location?: string | null;
  description?: string | null;
  status?: string;
  activeRoundName?: string | null;
};

export default function AdminTrips() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { data: allTrips, refetch } = trpc.trips.list.useQuery();
  const isGlobalAdmin = user?.role === "admin";
  // Co-admins only see trips they are assigned to
  const trips = isGlobalAdmin ? allTrips : allTrips?.filter((t) => (t as any).isCoAdmin || t.createdBy === user?.id);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editTrip, setEditTrip] = useState<Trip | null>(null);
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTrip, setDeleteTripState] = useState<Trip | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const createTrip = trpc.trips.create.useMutation({
    onSuccess: () => {
      toast.success("Trip created");
      setCreateOpen(false);
      refetch();
      setName(""); setStartDate(""); setEndDate(""); setLocation(""); setDescription("");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTrip = trpc.trips.update.useMutation({
    onSuccess: () => {
      toast.success("Trip updated");
      setEditOpen(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteTripMutation = trpc.trips.delete.useMutation({
    onSuccess: () => {
      toast.success("Trip deleted");
      setDeleteOpen(false);
      setDeleteTripState(null);
      setDeleteConfirmText("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });


  function openEdit(trip: Trip) {
    setEditTrip(trip);
    setEditName(trip.name);
    setEditStart(new Date(trip.startDate).toISOString().split("T")[0]);
    setEditEnd(new Date(trip.endDate).toISOString().split("T")[0]);
    setEditLocation(trip.location ?? "");
    setEditDescription(trip.description ?? "");
    setEditOpen(true);
  }

  function openDelete(trip: Trip) {
    setDeleteTripState(trip);
    setDeleteConfirmText("");
    setDeleteOpen(true);
  }

  function canDelete(trip: Trip) {
    const status = trip.status;
    return status === "upcoming" || status === "completed";
  }

  const getShareLinkMutation = trpc.invites.getShareLink.useMutation({
    onSuccess: async (data) => {
      try {
        await navigator.clipboard.writeText(data.shareUrl);
        toast.success("Invite link copied to clipboard!");
      } catch {
        toast.error("Could not copy to clipboard");
      }
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  function copyInviteLink(tripId: number) {
    getShareLinkMutation.mutate({ tripId, origin: window.location.origin });
  }

  const revokeShareLinkMutation = trpc.invites.revokeShareLink.useMutation({
    onSuccess: () => {
      toast.success("Share link revoked. Old invite URLs will no longer work.");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const statusColor: Record<string, string> = {
    upcoming: "bg-blue-900/40 text-blue-300 border-blue-700/40",
    "in-progress": "bg-yellow-900/40 text-yellow-300 border-yellow-700/40",
    active: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
    completed: "bg-zinc-800 text-zinc-400 border-zinc-700",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Flag className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Golf Trip Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/"><Button variant="ghost" size="sm">← Back to App</Button></Link>
          {isGlobalAdmin && (
            <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> New Trip
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">{isGlobalAdmin ? "All Trips" : "Your Trips"}</h2>
          {isGlobalAdmin && (
          <Link href="/admin/courses">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="w-4 h-4" /> Manage Courses
            </Button>
          </Link>
          )}
        </div>

        {!trips || trips.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Flag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{isGlobalAdmin ? "No trips created yet." : "You have not been assigned as co-admin on any trips yet."}</p>
            {isGlobalAdmin && (
              <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Create First Trip</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trips.map((trip) => {
              const status = (trip as any).status as string | undefined;
              const activeRound = (trip as any).activeRoundName as string | null | undefined;
              const tripLocation = (trip as any).location as string | null | undefined;
              return (
                <div key={trip.id} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-lg truncate">{trip.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(trip.startDate).toLocaleDateString()} – {new Date(trip.endDate).toLocaleDateString()}
                      </p>
                      {tripLocation && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />{tripLocation}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      {status && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColor[status] ?? statusColor.upcoming}`}>
                          {status === "in-progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {activeRound && (
                    <p className="text-xs text-emerald-400 mb-3 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                      {activeRound} — Live
                    </p>
                  )}

                  {/* Edit, Delete & Copy Invite row */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {isGlobalAdmin && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs flex-1" onClick={() => openEdit(trip as Trip)}>
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="gap-1 text-xs flex-1 text-primary border-primary/30 hover:bg-primary/10"
                      disabled={getShareLinkMutation.isPending}
                      onClick={() => copyInviteLink(trip.id)}>
                      <Copy className="w-3 h-3" /> Copy Invite
                    </Button>
                    {(trip as any).shareToken && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs text-amber-400 border-amber-800 hover:bg-amber-900/30"
                        disabled={revokeShareLinkMutation.isPending}
                        title="Revoke share link — old invite URLs will stop working"
                        onClick={() => revokeShareLinkMutation.mutate({ tripId: trip.id })}>
                        <Link2Off className="w-3 h-3" /> Revoke
                      </Button>
                    )}
                    {isGlobalAdmin && (
                      canDelete(trip as Trip) ? (
                        <Button size="sm" variant="outline" className="gap-1 text-xs text-red-400 border-red-800 hover:bg-red-900/30" onClick={() => openDelete(trip as Trip)}>
                          <Trash2 className="w-3 h-3" /> Delete
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="gap-1 text-xs text-muted-foreground cursor-not-allowed opacity-50" disabled title="Can only delete upcoming or completed trips">
                          <Trash2 className="w-3 h-3" /> Delete
                        </Button>
                      )
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div className="grid grid-cols-3 gap-2">
                      <Link href={`/admin/trips/${trip.id}/players`}>
                        <button className="w-full flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg bg-emerald-900/40 border border-emerald-700/50 hover:bg-emerald-800/50 active:scale-95 transition-all text-emerald-300">
                          <Users className="w-5 h-5" />
                          <span className="text-xs font-semibold">Players</span>
                        </button>
                      </Link>
                      <Link href={`/admin/trips/${trip.id}/rounds`}>
                        <button className="w-full flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg bg-emerald-900/40 border border-emerald-700/50 hover:bg-emerald-800/50 active:scale-95 transition-all text-emerald-300">
                          <Calendar className="w-5 h-5" />
                          <span className="text-xs font-semibold">Rounds</span>
                        </button>
                      </Link>
                      <Link href={`/admin/trips/${trip.id}/handicap`}>
                        <button className="w-full flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg bg-emerald-900/40 border border-emerald-700/50 hover:bg-emerald-800/50 active:scale-95 transition-all text-emerald-300">
                          <BarChart2 className="w-5 h-5" />
                          <span className="text-xs font-semibold">Handicap</span>
                        </button>
                      </Link>
                    </div>
                    <Link href={`/trip/${trip.id}`}>
                      <button className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white font-semibold text-sm">
                        View Trip <ChevronRight className="w-4 h-4" />
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Trip Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Trip</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Trip Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Scotland 2025" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Start Date *</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">End Date *</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. St Andrews, Scotland" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional trip notes or details..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!name || !startDate || !endDate || createTrip.isPending}
              onClick={() => createTrip.mutate({ name, startDate, endDate, location: location || undefined, description: description || undefined })}
            >
              Create Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Trip Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Trip</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Trip Name *</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Trip name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Start Date *</label>
                <Input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">End Date *</label>
                <Input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Location</label>
              <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="e.g. St Andrews, Scotland" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Optional trip notes or details..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              disabled={!editName || !editStart || !editEnd || updateTrip.isPending}
              onClick={() => editTrip && updateTrip.mutate({
                id: editTrip.id,
                name: editName,
                startDate: editStart,
                endDate: editEnd,
                location: editLocation || undefined,
                description: editDescription || undefined,
              })}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Trip Dialog */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteConfirmText(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" /> Delete Trip
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This will permanently delete <strong className="text-foreground">{deleteTrip?.name}</strong> and all its rounds, scores, groups, and player data. This action cannot be undone.
            </p>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Type <span className="font-mono text-red-400">DELETE</span> to confirm
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="border-red-800 focus-visible:ring-red-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteConfirmText(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "DELETE" || deleteTripMutation.isPending}
              onClick={() => deleteTrip && deleteTripMutation.mutate({ id: deleteTrip.id })}
            >
              {deleteTripMutation.isPending ? "Deleting..." : "Delete Trip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
