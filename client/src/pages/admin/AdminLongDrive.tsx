import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "wouter";
import { ArrowLeft, Zap, ToggleLeft, ToggleRight } from "lucide-react";
import { EditTripDialog } from "@/components/EditTripDialog";
import { toast } from "sonner";

export default function AdminLongDrive() {
  const { tripId, roundId } = useParams<{ tripId: string; roundId: string }>();
  const tId = Number(tripId);
  const rId = Number(roundId);
  const utils = trpc.useUtils();

  const { data: trip } = trpc.trips.get.useQuery({ id: tId });
  const { data: roundData, refetch: refetchRound } = trpc.rounds.get.useQuery({ id: rId });
  const round = roundData?.round;
  const holes = roundData?.holes;

  const { data: ldEntries, refetch } = trpc.longDrive.getByRound.useQuery({ roundId: rId });

  const configure = trpc.longDrive.configure.useMutation({
    onSuccess: async () => {
      await Promise.all([
        refetchRound(),
        refetch(),
        utils.rounds.list.invalidate({ tripId: tId }),
      ]);
      toast.success("Long Drive updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isEnabled = !!round?.longDriveEnabled;
  const enabledHole = round?.longDriveHole ?? null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/trips/${tId}/rounds`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <Zap className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">Long Drive</h1>
            <p className="text-xs text-muted-foreground">{round?.name ?? "Loading..."}</p>
          </div>
        </div>
        <EditTripDialog tripId={tId} trip={trip} />
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        <p className="text-sm text-muted-foreground">
          Enable Long Drive on one hole per round. Players use their rangefinder to measure the distance from their ball to the pin, then enter that number. The system calculates drive distance as <strong>hole length − distance to pin</strong>. The current leader is shown to all players in real time.
        </p>

        {/* Current status card */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isEnabled ? "bg-emerald-500/15" : "bg-muted"}`}>
            <Zap className={`w-5 h-5 ${isEnabled ? "text-emerald-400" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">
              {isEnabled ? `Long Drive enabled — Hole ${enabledHole}` : "Long Drive disabled"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isEnabled ? "Players can submit their rangefinder reading" : "Select a hole below to enable"}
            </p>
          </div>
          {isEnabled && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs text-rose-400 border-rose-700/50 hover:bg-rose-900/20 shrink-0"
              onClick={() => configure.mutate({ roundId: rId, enabled: false, holeNumber: null })}
              disabled={configure.isPending}
            >
              <ToggleLeft className="w-4 h-4" /> Disable
            </Button>
          )}
        </div>

        {/* Hole selection */}
        {!holes ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select Long Drive Hole</p>
            {holes.map((hole: { id: number; holeNumber: number; par: number; strokeIndex: number }) => {
              const isThisHole = isEnabled && enabledHole === hole.holeNumber;
              return (
                <div key={hole.id} className={`bg-card border rounded-xl p-3 flex items-center gap-3 transition-colors ${isThisHole ? "border-emerald-600/50 bg-emerald-900/10" : "border-border"}`}>
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="font-bold text-primary text-sm">{hole.holeNumber}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">Hole {hole.holeNumber}</span>
                    <span className="text-xs text-muted-foreground ml-2">Par {hole.par} · SI {hole.strokeIndex}</span>
                  </div>
                  {isThisHole ? (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <ToggleRight className="w-4 h-4" /> Active
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1"
                      onClick={() => configure.mutate({ roundId: rId, enabled: true, holeNumber: hole.holeNumber })}
                      disabled={configure.isPending}
                    >
                      <ToggleLeft className="w-3.5 h-3.5" /> Set
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Entries leaderboard */}
        {ldEntries && ldEntries.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" /> Current Entries
            </p>
            {ldEntries.map((e: any, i: number) => (
              <div key={e.id} className={`bg-card border rounded-xl px-4 py-3 flex items-center gap-3 ${i === 0 ? "border-yellow-600/40" : "border-border"}`}>
                <span className="w-6 text-center text-sm">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{e.userName}</p>
                  <p className="text-xs text-muted-foreground">{e.distanceToPin} yds to pin</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">{e.driveDistanceYards} yds</p>
                  <p className="text-xs text-muted-foreground">drive</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
