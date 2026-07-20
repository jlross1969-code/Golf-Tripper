import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Trophy, Plus, Pencil, Trash2, UserCheck, X } from "lucide-react";
import { toast } from "sonner";

const POSITION_LABELS: Record<string, string> = {
  top1: "1st Place 🥇",
  top2: "2nd Place 🥈",
  top3: "3rd Place 🥉",
  top4: "4th Place",
  top5: "5th Place",
  last: "Last Place 🐢",
};

const POSITION_COLORS: Record<string, string> = {
  top1: "text-yellow-400 border-yellow-600/40 bg-yellow-900/20",
  top2: "text-slate-300 border-slate-500/40 bg-slate-800/30",
  top3: "text-amber-500 border-amber-700/40 bg-amber-900/20",
  top4: "text-blue-400 border-blue-700/40 bg-blue-900/20",
  top5: "text-blue-400 border-blue-700/40 bg-blue-900/20",
  last: "text-rose-400 border-rose-700/40 bg-rose-900/20",
};

type Award = {
  id: number;
  name: string;
  description: string | null;
  prize: string | null;
  category: "individual" | "team";
  position: "top1" | "top2" | "top3" | "top4" | "top5" | "last";
  scope: "daily" | "overall";
  roundId: number | null;
  winner: { id: number; displayName: string | null; tripPlayerId: number | null; groupPlayerId: number | null } | null;
};

export default function AdminAwards() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: tripList } = trpc.trips.list.useQuery();
  const { data: trip } = trpc.trips.get.useQuery({ id });
  const { data: rounds } = trpc.rounds.list.useQuery({ tripId: id });
  const { data: awards, refetch } = trpc.awards.list.useQuery({ tripId: id });
  const { data: tripPlayers } = trpc.players.tripPlayers.useQuery({ tripId: id });

  const isGlobalAdmin = user?.role === "admin";
  const tripEntry = tripList?.find((t) => t.id === id);
  const isAuthorized = isGlobalAdmin || (tripEntry && (tripEntry.createdBy === user?.id || (tripEntry as any).isCoAdmin));

  useEffect(() => {
    if (tripList && user && !isAuthorized) navigate("/");
  }, [tripList, user, isAuthorized, navigate]);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", prize: "",
    category: "individual" as "individual" | "team",
    position: "top1" as "top1" | "top2" | "top3" | "top4" | "top5" | "last",
    scope: "overall" as "daily" | "overall",
    roundId: "" as string,
  });

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editAward, setEditAward] = useState<Award | null>(null);
  const [editForm, setEditForm] = useState({ ...form });

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAward, setDeleteAwardState] = useState<Award | null>(null);

  // Assign winner
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [winnerAward, setWinnerAward] = useState<Award | null>(null);
  const [selectedWinnerId, setSelectedWinnerId] = useState("");

  const createMutation = trpc.awards.create.useMutation({
    onSuccess: () => { toast.success("Award created"); setCreateOpen(false); refetch(); resetForm(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.awards.update.useMutation({
    onSuccess: () => { toast.success("Award updated"); setEditOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.awards.delete.useMutation({
    onSuccess: () => { toast.success("Award deleted"); setDeleteOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const assignWinnerMutation = trpc.awards.assignWinner.useMutation({
    onSuccess: () => { toast.success("Winner assigned"); setWinnerOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setForm({ name: "", description: "", prize: "", category: "individual", position: "top1", scope: "overall", roundId: "" });
  }

  function openEdit(award: Award) {
    setEditAward(award);
    setEditForm({
      name: award.name,
      description: award.description ?? "",
      prize: award.prize ?? "",
      category: award.category,
      position: award.position,
      scope: award.scope,
      roundId: award.roundId?.toString() ?? "",
    });
    setEditOpen(true);
  }

  function openAssignWinner(award: Award) {
    setWinnerAward(award);
    setSelectedWinnerId(award.winner?.tripPlayerId?.toString() ?? "");
    setWinnerOpen(true);
  }

  function handleAssignWinner() {
    if (!winnerAward) return;
    if (!selectedWinnerId) {
      // Clear winner
      assignWinnerMutation.mutate({ awardId: winnerAward.id, tripPlayerId: null, groupPlayerId: null, displayName: "" });
      return;
    }
    const tp = tripPlayers?.find((p) => p.id === Number(selectedWinnerId));
    if (!tp) return;
    assignWinnerMutation.mutate({
      awardId: winnerAward.id,
      tripPlayerId: tp.id,
      groupPlayerId: null,
      displayName: tp.nickname ?? (tp as any).user?.name ?? `Player ${tp.id}`,
    });
  }

  const overallAwards = awards?.filter((a) => a.scope === "overall") ?? [];
  const dailyAwards = awards?.filter((a) => a.scope === "daily") ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Link href={`/admin/trips/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <Trophy className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <h1 className="font-bold text-foreground">Custom Awards</h1>
          <p className="text-xs text-muted-foreground">{trip?.name}</p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> Add Award
        </Button>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-8">
        {/* Overall Awards */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Overall Trip Awards</h2>
          {overallAwards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              No overall awards yet. Add one to recognise top and bottom finishers across the whole trip.
            </div>
          ) : (
            <div className="space-y-3">
              {overallAwards.map((award) => (
                <AwardCard key={award.id} award={award as Award} onEdit={openEdit} onDelete={(a) => { setDeleteAwardState(a); setDeleteOpen(true); }} onAssignWinner={openAssignWinner} />
              ))}
            </div>
          )}
        </section>

        {/* Daily Awards */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Daily Round Awards</h2>
          {dailyAwards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              No daily awards yet. Add one to recognise round-specific achievements.
            </div>
          ) : (
            <div className="space-y-3">
              {dailyAwards.map((award) => {
                const round = rounds?.find((r) => r.id === award.roundId);
                return (
                  <AwardCard key={award.id} award={award as Award} roundName={round?.name} onEdit={openEdit} onDelete={(a) => { setDeleteAwardState(a); setDeleteOpen(true); }} onAssignWinner={openAssignWinner} />
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Award</DialogTitle></DialogHeader>
          <AwardForm form={form} setForm={setForm} rounds={rounds ?? []} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.name || createMutation.isPending}
              onClick={() => createMutation.mutate({
                tripId: id,
                name: form.name,
                description: form.description || undefined,
                prize: form.prize || undefined,
                category: form.category,
                position: form.position,
                scope: form.scope,
                roundId: form.scope === "daily" && form.roundId ? Number(form.roundId) : null,
              })}
            >
              {createMutation.isPending ? "Saving…" : "Create Award"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Award</DialogTitle></DialogHeader>
          <AwardForm form={editForm} setForm={setEditForm} rounds={rounds ?? []} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              disabled={!editForm.name || updateMutation.isPending}
              onClick={() => editAward && updateMutation.mutate({
                id: editAward.id,
                name: editForm.name,
                description: editForm.description || null,
                prize: editForm.prize || null,
                category: editForm.category,
                position: editForm.position,
                scope: editForm.scope,
                roundId: editForm.scope === "daily" && editForm.roundId ? Number(editForm.roundId) : null,
              })}
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Award</DialogTitle>
            <DialogDescription>Are you sure you want to delete "{deleteAward?.name}"? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending}
              onClick={() => deleteAward && deleteMutation.mutate({ id: deleteAward.id })}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Winner Dialog */}
      <Dialog open={winnerOpen} onOpenChange={setWinnerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Winner — {winnerAward?.name}</DialogTitle>
            <DialogDescription>Select the player who won this award. Leave blank to clear the current winner.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={selectedWinnerId} onValueChange={setSelectedWinnerId}>
              <SelectTrigger><SelectValue placeholder="Select player…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Clear winner —</SelectItem>
                {tripPlayers?.map((p) => {
                  const displayName = p.nickname ?? (p as any).user?.name ?? `Player ${p.id}`;
                  return (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.nickname ? `${p.nickname} (${(p as any).user?.name ?? p.id})` : displayName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWinnerOpen(false)}>Cancel</Button>
            <Button disabled={assignWinnerMutation.isPending} onClick={handleAssignWinner}>
              {assignWinnerMutation.isPending ? "Saving…" : "Assign Winner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AwardCard({
  award, roundName, onEdit, onDelete, onAssignWinner,
}: {
  award: Award;
  roundName?: string;
  onEdit: (a: Award) => void;
  onDelete: (a: Award) => void;
  onAssignWinner: (a: Award) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
      <div className={`mt-0.5 px-2 py-1 rounded-lg border text-xs font-bold shrink-0 ${POSITION_COLORS[award.position]}`}>
        {POSITION_LABELS[award.position]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">{award.name}</span>
          <Badge variant="outline" className="text-xs">{award.category === "individual" ? "Individual" : "Team 4BBB"}</Badge>
          {roundName && <Badge variant="secondary" className="text-xs">{roundName}</Badge>}
        </div>
        {award.description && <p className="text-sm text-muted-foreground mt-0.5">{award.description}</p>}
        {award.prize && (
          <p className="text-xs text-primary mt-1">🏆 Prize: {award.prize}</p>
        )}
        {award.winner?.displayName ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Winner: <strong>{award.winner.displayName}</strong></span>
            <button onClick={() => onAssignWinner(award)} className="underline text-muted-foreground ml-1 hover:text-foreground">change</button>
          </div>
        ) : (
          <button onClick={() => onAssignWinner(award)} className="mt-2 text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> Assign winner
          </button>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(award)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => onDelete(award)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function AwardForm({
  form, setForm, rounds,
}: {
  form: { name: string; description: string; prize: string; category: string; position: string; scope: string; roundId: string };
  setForm: (f: any) => void;
  rounds: { id: number; name: string }[];
}) {
  return (
    <div className="space-y-4 py-2">
      <div>
        <label className="text-sm font-medium mb-1 block">Award Name *</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Naga Award, Mug Award" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Description</label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Awarded to the player who finishes last overall" rows={2} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Prize</label>
        <Input value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} placeholder="e.g. Buy the first round, Wooden spoon" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Category</label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="team">Team (4BBB)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Position</label>
          <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(POSITION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Scope</label>
        <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v, roundId: "" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="overall">Overall Trip</SelectItem>
            <SelectItem value="daily">Specific Round (Daily)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {form.scope === "daily" && (
        <div>
          <label className="text-sm font-medium mb-1 block">Round</label>
          <Select value={form.roundId} onValueChange={(v) => setForm({ ...form, roundId: v })}>
            <SelectTrigger><SelectValue placeholder="Select round…" /></SelectTrigger>
            <SelectContent>
              {rounds.map((r) => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
