import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "wouter";
import { ArrowLeft, Target, Trophy, ToggleLeft, ToggleRight } from "lucide-react";
import { EditTripDialog } from "@/components/EditTripDialog";
import { toast } from "sonner";

export default function AdminNTP() {
  const { tripId, roundId } = useParams<{ tripId: string; roundId: string }>();
  const tId = Number(tripId);
  const rId = Number(roundId);

  const { data: trip } = trpc.trips.get.useQuery({ id: tId });
  const { data: roundData } = trpc.rounds.get.useQuery({ id: rId });
  const round = roundData?.round;
  const holes = roundData?.holes;
  const { data: ntpList, refetch } = trpc.ntp.getByRound.useQuery({ roundId: rId });

  const utils = trpc.useUtils();

  const enableHole = trpc.ntp.enableHole.useMutation({
    onSuccess: () => { toast.success("NTP enabled for hole"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const disableHole = trpc.ntp.disableHole.useMutation({
    onSuccess: () => { toast.success("NTP disabled"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const setWinner = trpc.ntp.setWinner.useMutation({
    onSuccess: () => {
      toast.success("Winner confirmed!");
      setWinnerDialog(null);
      refetch();
      utils.ntp.getByRound.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [winnerDialog, setWinnerDialog] = useState<{
    ntpId: number;
    holeNumber: number;
    entries: { userId: number; userName: string | null; distanceCm: number }[];
  } | null>(null);
  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [winnerDist, setWinnerDist] = useState("");

  const ntpMap = new Map((ntpList ?? []).map((n) => [n.holeId, n]));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/trips/${tId}/rounds`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <Target className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">Nearest to Pin</h1>
            <p className="text-xs text-muted-foreground">{round?.name ?? "Loading..."}</p>
          </div>
        </div>
        <EditTripDialog tripId={tId} trip={trip} />
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-3">
        <p className="text-sm text-muted-foreground mb-4">
          Toggle NTP on for par-3 holes. Players submit their distance from the pin in centimetres. Confirm the winner once all entries are in.
        </p>

        {!holes ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : (
          holes.map((hole: { id: number; holeNumber: number; par: number; strokeIndex: number }) => {
            const ntp = ntpMap.get(hole.id);
            const isEnabled = !!ntp;

            return (
              <div key={hole.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{hole.holeNumber}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">Hole {hole.holeNumber}</p>
                      <p className="text-xs text-muted-foreground">Par {hole.par} · SI {hole.strokeIndex}</p>
                    </div>
                    {isEnabled && (
                      <Badge variant="default" className="text-xs gap-1">
                        <Target className="w-3 h-3" /> NTP Active
                      </Badge>
                    )}
                    {ntp?.winnerId && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Trophy className="w-3 h-3" /> Won: {ntp.winnerName} ({ntp.winnerDistanceCm} cm)
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEnabled && ntp && ntp.entries.length > 0 && !ntp.winnerId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        onClick={() => {
                          setSelectedWinnerId("");
                          setWinnerDist("");
                          setWinnerDialog({
                            ntpId: ntp.id,
                            holeNumber: ntp.holeNumber,
                            entries: ntp.entries,
                          });
                        }}
                      >
                        <Trophy className="w-3 h-3" /> Set Winner
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={isEnabled ? "destructive" : "outline"}
                      className="text-xs gap-1"
                      disabled={enableHole.isPending || disableHole.isPending}
                      onClick={() => {
                        if (isEnabled) {
                          disableHole.mutate({ roundId: rId, holeId: hole.id });
                        } else {
                          enableHole.mutate({ roundId: rId, holeId: hole.id, holeNumber: hole.holeNumber });
                        }
                      }}
                    >
                      {isEnabled ? (
                        <><ToggleRight className="w-3 h-3" /> Disable</>
                      ) : (
                        <><ToggleLeft className="w-3 h-3" /> Enable</>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Entries list */}
                {isEnabled && ntp && ntp.entries.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1">
                    <p className="text-xs text-muted-foreground font-medium mb-2">Entries ({ntp.entries.length})</p>
                    {ntp.entries
                      .slice()
                      .sort((a, b) => a.distanceCm - b.distanceCm)
                      .map((entry, i) => (
                        <div key={entry.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                              {i + 1}
                            </span>
                            <span className={`${ntp.winnerId === entry.userId ? "text-primary font-semibold" : "text-foreground"}`}>
                              {entry.userName ?? "Player"}
                            </span>
                            {ntp.winnerId === entry.userId && <Trophy className="w-3 h-3 text-primary" />}
                          </div>
                          <span className="font-mono text-sm font-semibold text-foreground">{entry.distanceCm} cm</span>
                        </div>
                      ))}
                  </div>
                )}

                {isEnabled && ntp && ntp.entries.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">No entries yet — players can submit from the Score Entry screen.</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Set Winner Dialog */}
      <Dialog open={!!winnerDialog} onOpenChange={(o) => !o && setWinnerDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Set NTP Winner — Hole {winnerDialog?.holeNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Winner</label>
              <Select value={selectedWinnerId} onValueChange={(v) => {
                setSelectedWinnerId(v);
                const entry = winnerDialog?.entries.find((e) => e.userId.toString() === v);
                if (entry) setWinnerDist(entry.distanceCm.toString());
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select player..." />
                </SelectTrigger>
                <SelectContent>
                  {winnerDialog?.entries.map((e) => (
                    <SelectItem key={e.userId} value={e.userId.toString()}>
                      {e.userName ?? "Player"} — {e.distanceCm} cm
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Winning Distance (cm)</label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={winnerDist}
                onChange={(e) => setWinnerDist(e.target.value)}
                placeholder="e.g. 85.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWinnerDialog(null)}>Cancel</Button>
            <Button
              disabled={!selectedWinnerId || !winnerDist || setWinner.isPending}
              onClick={() => {
                if (!winnerDialog) return;
                setWinner.mutate({
                  ntpId: winnerDialog.ntpId,
                  winnerId: Number(selectedWinnerId),
                  winnerDistanceCm: Number(winnerDist),
                });
              }}
            >
              Confirm Winner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
