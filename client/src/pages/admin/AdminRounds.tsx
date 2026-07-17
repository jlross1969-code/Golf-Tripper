import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useParams } from "wouter";
import { ArrowLeft, Plus, Calendar, Users, PlayCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminRounds() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);

  const { data: trip } = trpc.trips.get.useQuery({ id });
  const { data: courses } = trpc.courses.list.useQuery();
  const { data: rounds, refetch } = trpc.rounds.list.useQuery({ tripId: id });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [roundDate, setRoundDate] = useState("");
  const [strokePlay, setStrokePlay] = useState(true);
  const [fourBBB, setFourBBB] = useState(false);
  const [skins, setSkins] = useState(false);
  const [matchPlay, setMatchPlay] = useState(false);
  const [alternateShot, setAlternateShot] = useState(false);

  const createRound = trpc.rounds.create.useMutation({
    onSuccess: () => { toast.success("Round created"); setOpen(false); refetch(); setName(""); setCourseId(""); setRoundDate(""); },
    onError: (e) => toast.error(e.message),
  });

  const updateRound = trpc.rounds.update.useMutation({
    onSuccess: () => { toast.success("Round updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const recalcHandicap = trpc.handicap.recalculateAfterRound.useMutation({
    onSuccess: (d) => toast.success(`Handicaps recalculated — ${d.updated} players updated`),
    onError: (e) => toast.error(e.message),
  });

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
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{round.name}</span>
                    <Badge variant={round.status === "active" ? "default" : round.status === "completed" ? "secondary" : "outline"}>
                      {round.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {round.strokePlayEnabled && <Badge variant="outline" className="text-xs">Stroke Play</Badge>}
                    {round.fourBBBEnabled && <Badge variant="outline" className="text-xs">4BBB</Badge>}
                    {round.skinsEnabled && <Badge variant="outline" className="text-xs">Skins</Badge>}
                    {(round as any).matchPlayEnabled && <Badge variant="outline" className="text-xs">Match Play</Badge>}
                    {(round as any).alternateShotEnabled && <Badge variant="outline" className="text-xs">Alt Shot</Badge>}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {round.status === "scheduled" && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => updateRound.mutate({ id: round.id, status: "active" })}>
                      <PlayCircle className="w-3 h-3" /> Start
                    </Button>
                  )}
                  {round.status === "active" && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1 text-xs"
                        onClick={() => updateRound.mutate({ id: round.id, status: "completed" })}>
                        <CheckCircle className="w-3 h-3" /> Complete
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-xs"
                        onClick={() => recalcHandicap.mutate({ roundId: round.id, tripId: id })}>
                        Recalc HCP
                      </Button>
                    </>
                  )}
                  {round.status === "completed" && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => recalcHandicap.mutate({ roundId: round.id, tripId: id })}>
                      Recalc HCP
                    </Button>
                  )}
                  <Link href={`/admin/trips/${id}/rounds/${round.id}/groups`}>
                    <Button size="sm" variant="outline" className="gap-1 text-xs">
                      <Users className="w-3 h-3" /> Groups
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

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
                <SelectTrigger>
                  <SelectValue placeholder="Select course..." />
                </SelectTrigger>
                <SelectContent>
                  {courses?.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
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
    </div>
  );
}
