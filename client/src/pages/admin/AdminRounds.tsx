import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Plus, Calendar, Users, PlayCircle, CheckCircle, Target, Pencil, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

type Round = {
  id: number;
  name: string;
  status: string;
  roundDate?: Date | null;
  courseId?: number | null;
  strokePlayEnabled: boolean;
  fourBBBEnabled: boolean;
  skinsEnabled: boolean;
  matchPlayEnabled?: boolean;
  alternateShotEnabled?: boolean;
};

export default function AdminRounds() {
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
  const { data: courses } = trpc.courses.list.useQuery();
  const { data: rounds, refetch } = trpc.rounds.list.useQuery({ tripId: id });

  // Create
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [roundDate, setRoundDate] = useState("");
  const [strokePlay, setStrokePlay] = useState(true);
  const [fourBBB, setFourBBB] = useState(false);
  const [skins, setSkins] = useState(false);
  const [matchPlay, setMatchPlay] = useState(false);
  const [alternateShot, setAlternateShot] = useState(false);

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editRound, setEditRound] = useState<Round | null>(null);
  const [editName, setEditName] = useState("");
  const [editCourseId, setEditCourseId] = useState("");
  const [editRoundDate, setEditRoundDate] = useState("");
  const [editStroke, setEditStroke] = useState(true);
  const [editFourBBB, setEditFourBBB] = useState(false);
  const [editSkins, setEditSkins] = useState(false);
  const [editMatchPlay, setEditMatchPlay] = useState(false);
  const [editAltShot, setEditAltShot] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRound, setDeleteRoundState] = useState<Round | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // Complete round confirmation
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeRound, setCompleteRound] = useState<Round | null>(null);
  const [runRecalc, setRunRecalc] = useState(true);

  const createRound = trpc.rounds.create.useMutation({
    onSuccess: () => { toast.success("Round created"); setOpen(false); refetch(); setName(""); setCourseId(""); setRoundDate(""); },
    onError: (e) => toast.error(e.message),
  });

  const updateRound = trpc.rounds.update.useMutation({
    onSuccess: () => { toast.success("Round updated"); setEditOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteRoundMutation = trpc.rounds.delete.useMutation({
    onSuccess: () => { toast.success("Round deleted"); setDeleteOpen(false); setDeleteRoundState(null); setDeleteConfirm(""); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const recalcHandicap = trpc.handicap.recalculateAfterRound.useMutation({
    onSuccess: (d) => toast.success(`Handicaps recalculated — ${d.updated} players updated`),
    onError: (e) => toast.error(e.message),
  });

  async function confirmComplete() {
    if (!completeRound) return;
    // Mark round as completed
    await updateRound.mutateAsync({ id: completeRound.id, status: "completed" });
    // Optionally run HC recalculation
    if (runRecalc) {
      recalcHandicap.mutate({ roundId: completeRound.id, tripId: id });
    }
    setCompleteOpen(false);
    setCompleteRound(null);
    refetch();
  }

  function openEdit(round: Round) {
    setEditRound(round);
    setEditName(round.name);
    setEditCourseId(round.courseId?.toString() ?? "");
    setEditRoundDate(round.roundDate ? new Date(round.roundDate).toISOString().split("T")[0] : "");
    setEditStroke(round.strokePlayEnabled);
    setEditFourBBB(round.fourBBBEnabled);
    setEditSkins(round.skinsEnabled);
    setEditMatchPlay(round.matchPlayEnabled ?? false);
    setEditAltShot(round.alternateShotEnabled ?? false);
    setEditOpen(true);
  }

  function openDelete(round: Round) {
    setDeleteRoundState(round);
    setDeleteConfirm("");
    setDeleteOpen(true);
  }

  function openComplete(round: Round) {
    setCompleteRound(round);
    setRunRecalc(true);
    setCompleteOpen(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <Calendar className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">Rounds</h1>
            <p className="text-xs text-muted-foreground">{trip?.name}</p>
          </div>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> New Round
        </Button>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        {!rounds || rounds.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No rounds yet.</p>
            <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Create First Round</Button>
          </div>
        ) : (
          rounds.map((round) => (
            <div key={round.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-foreground">{round.name}</span>
                    <Badge variant={round.status === "active" ? "default" : round.status === "completed" ? "secondary" : "outline"}>
                      {round.status}
                    </Badge>
                  </div>
                  {(round as any).roundDate && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date((round as any).roundDate).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {round.strokePlayEnabled && <Badge variant="outline" className="text-xs">Stroke Play</Badge>}
                    {round.fourBBBEnabled && <Badge variant="outline" className="text-xs">4BBB</Badge>}
                    {round.skinsEnabled && <Badge variant="outline" className="text-xs">Skins</Badge>}
                    {(round as any).matchPlayEnabled && <Badge variant="outline" className="text-xs">Match Play</Badge>}
                    {(round as any).alternateShotEnabled && <Badge variant="outline" className="text-xs">Alt Shot</Badge>}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {round.status === "scheduled" && (
                  <Button size="sm" variant="outline" className="gap-1 text-xs"
                    onClick={() => updateRound.mutate({ id: round.id, status: "active" })}>
                    <PlayCircle className="w-3 h-3" /> Start
                  </Button>
                )}
                {round.status === "active" && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => openComplete(round as Round)}>
                      <CheckCircle className="w-3 h-3" /> Complete
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => recalcHandicap.mutate({ roundId: round.id, tripId: id })}>
                      <RefreshCw className="w-3 h-3" /> Recalc HCP
                    </Button>
                  </>
                )}
                {round.status === "completed" && (
                  <Button size="sm" variant="outline" className="gap-1 text-xs"
                    onClick={() => recalcHandicap.mutate({ roundId: round.id, tripId: id })}>
                    <RefreshCw className="w-3 h-3" /> Recalc HCP
                  </Button>
                )}
                <Link href={`/admin/trips/${id}/rounds/${round.id}/groups`}>
                  <Button size="sm" variant="outline" className="gap-1 text-xs">
                    <Users className="w-3 h-3" /> Groups
                  </Button>
                </Link>
                <Link href={`/admin/trips/${id}/rounds/${round.id}/ntp`}>
                  <Button size="sm" variant="outline" className="gap-1 text-xs">
                    <Target className="w-3 h-3" /> NTP
                  </Button>
                </Link>
                <Button size="sm" variant="outline" className="gap-1 text-xs"
                  onClick={() => openEdit(round as Round)}>
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
                {round.status !== "active" && (
                  <Button size="sm" variant="outline" className="gap-1 text-xs text-red-400 border-red-800 hover:bg-red-900/30"
                    onClick={() => openDelete(round as Round)}>
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Round Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Round</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Round Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Day 1 — St Andrews" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Course</label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
                <SelectContent>
                  {courses?.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Date</label>
              <Input type="date" value={roundDate} onChange={(e) => setRoundDate(e.target.value)} />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground block">Formats</label>
              {[
                { label: "Stroke Play", value: strokePlay, set: setStrokePlay },
                { label: "4BBB", value: fourBBB, set: setFourBBB },
                { label: "Skins", value: skins, set: setSkins },
                { label: "Match Play", value: matchPlay, set: setMatchPlay },
                { label: "Alternate Shot", value: alternateShot, set: setAlternateShot },
              ].map(({ label, value, set }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{label}</span>
                  <Switch checked={value} onCheckedChange={set} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!name || !courseId || !roundDate || createRound.isPending}
              onClick={() => createRound.mutate({
                tripId: id, courseId: Number(courseId), name, roundDate,
                strokePlayEnabled: strokePlay, fourBBBEnabled: fourBBB, skinsEnabled: skins,
                matchPlayEnabled: matchPlay, alternateShotEnabled: alternateShot,
              })}
            >
              Create Round
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Round Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Round</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Round Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Round name" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Course</label>
              <Select value={editCourseId} onValueChange={setEditCourseId}>
                <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
                <SelectContent>
                  {courses?.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Date</label>
              <Input type="date" value={editRoundDate} onChange={(e) => setEditRoundDate(e.target.value)} />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground block">Formats</label>
              {[
                { label: "Stroke Play", value: editStroke, set: setEditStroke },
                { label: "4BBB", value: editFourBBB, set: setEditFourBBB },
                { label: "Skins", value: editSkins, set: setEditSkins },
                { label: "Match Play", value: editMatchPlay, set: setEditMatchPlay },
                { label: "Alternate Shot", value: editAltShot, set: setEditAltShot },
              ].map(({ label, value, set }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{label}</span>
                  <Switch checked={value} onCheckedChange={set} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              disabled={!editName || updateRound.isPending}
              onClick={() => editRound && updateRound.mutate({
                id: editRound.id,
                name: editName,
                ...(editCourseId ? { courseId: Number(editCourseId) } : {}),
                ...(editRoundDate ? { roundDate: editRoundDate } : {}),
                strokePlayEnabled: editStroke,
                fourBBBEnabled: editFourBBB,
                skinsEnabled: editSkins,
                matchPlayEnabled: editMatchPlay,
                alternateShotEnabled: editAltShot,
              })}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Round Dialog */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteConfirm(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" /> Delete Round
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This will permanently delete <strong className="text-foreground">{deleteRound?.name}</strong> and all its scores, groups, and NTP data. This cannot be undone.
            </p>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Type <span className="font-mono text-red-400">DELETE</span> to confirm
              </label>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="border-red-800 focus-visible:ring-red-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== "DELETE" || deleteRoundMutation.isPending}
              onClick={() => deleteRound && deleteRoundMutation.mutate({ id: deleteRound.id })}
            >
              {deleteRoundMutation.isPending ? "Deleting..." : "Delete Round"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Round Confirmation Dialog */}
      <Dialog open={completeOpen} onOpenChange={(o) => { if (!o) { setCompleteOpen(false); setCompleteRound(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Complete Round
            </DialogTitle>
            <DialogDescription>
              Mark <strong>{completeRound?.name}</strong> as completed. You can optionally run handicap recalculation now so players' handicaps are updated for the next round.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Run handicap recalculation now</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Updates all players' handicaps based on their scores in this round.
                </p>
              </div>
              <Switch checked={runRecalc} onCheckedChange={setRunRecalc} />
            </div>
            {!runRecalc && (
              <p className="text-xs text-amber-400 mt-2">
                ⚠️ You can run handicap recalculation later from the round's "Recalc HCP" button.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCompleteOpen(false); setCompleteRound(null); }}>Cancel</Button>
            <Button
              disabled={updateRound.isPending || recalcHandicap.isPending}
              onClick={confirmComplete}
            >
              {updateRound.isPending ? "Completing..." : runRecalc ? "Complete & Recalc HCP" : "Complete Round"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
