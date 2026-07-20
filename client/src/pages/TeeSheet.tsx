import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "wouter";
import { ArrowLeft, Clock, Flag, MapPin, Users, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function TeeSheet() {
  const { tripId, roundId } = useParams<{ tripId: string; roundId: string }>();
  const tid = Number(tripId);
  const rid = Number(roundId);

  const { data: trip } = trpc.trips.get.useQuery({ id: tid });
  const { data: roundData } = trpc.rounds.get.useQuery({ id: rid });
  const round = roundData?.round;
  const { data: groups, isLoading } = trpc.trips.getTeeSheet.useQuery(
    { roundId: rid, tripId: tid },
    { enabled: !!rid && !!tid }
  );

  function shareSheet() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `Tee Sheet — ${round?.name ?? "Round"}`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(
        () => toast.success("Tee sheet link copied!"),
        () => toast.error("Could not copy link")
      );
    }
  }

  const groupsWithTeeTime = groups?.filter((g) => g.teeTime) ?? [];
  const groupsWithout = groups?.filter((g) => !g.teeTime) ?? [];
  const sortedGroups = [...groupsWithTeeTime, ...groupsWithout];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/trip/${tid}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="font-bold text-foreground flex items-center gap-1.5">
              <Flag className="w-4 h-4 text-primary" />
              Tee Sheet
            </h1>
            <p className="text-xs text-muted-foreground">{trip?.name} — {round?.name ?? ""}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={shareSheet}>
          <Share2 className="w-3.5 h-3.5" /> Share
        </Button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 h-28 animate-pulse" />
            ))}
          </div>
        ) : sortedGroups.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No groups set up for this round yet.</p>
          </div>
        ) : (
          sortedGroups.map((group, idx) => {
            const players = (group as any).players as Array<{
              userId: number;
              pairId: string | null;
              nickname?: string | null;
              currentHandicap?: number | null;
              user?: { name?: string | null };
            }>;

            // Group players by pair
            const pairMap = new Map<string, typeof players>();
            const unpaired: typeof players = [];
            for (const p of players) {
              if (p.pairId) {
                const list = pairMap.get(p.pairId) ?? [];
                list.push(p);
                pairMap.set(p.pairId, list);
              } else {
                unpaired.push(p);
              }
            }

            return (
              <div key={group.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Group header */}
                <div className="px-4 py-3 bg-primary/10 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-base">{group.name}</span>
                    <span className="text-xs text-muted-foreground">({players.length} players)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {group.teeTime ? (
                      <div className="flex items-center gap-1 text-primary font-semibold text-sm">
                        <Clock className="w-3.5 h-3.5" />
                        {group.teeTime}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No tee time</span>
                    )}
                    {group.startingHole && (
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <MapPin className="w-3 h-3" />
                        Hole {group.startingHole}
                      </div>
                    )}
                  </div>
                </div>

                {/* Players */}
                <div className="p-3 space-y-2">
                  {Array.from(pairMap.entries()).map(([pairId, pairPlayers]) => (
                    <div key={pairId} className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${pairId === "A" ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"}`}>
                        Pair {pairId}
                      </span>
                      {pairPlayers.map((p) => (
                        <div key={p.userId} className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-2.5 py-1.5">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                            {(p.nickname ?? p.user?.name ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {p.nickname ?? p.user?.name ?? `Player ${p.userId}`}
                          </span>
                          {p.currentHandicap != null && (
                            <span className="text-xs text-muted-foreground">HC {p.currentHandicap}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                  {unpaired.map((p) => (
                    <div key={p.userId} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground px-1.5 py-0.5">Solo</span>
                      <div className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-2.5 py-1.5">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                          {(p.nickname ?? p.user?.name ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {p.nickname ?? p.user?.name ?? `Player ${p.userId}`}
                        </span>
                        {p.currentHandicap != null && (
                          <span className="text-xs text-muted-foreground">HC {p.currentHandicap}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
