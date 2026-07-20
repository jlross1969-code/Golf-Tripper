import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link, useParams } from "wouter";
import { ArrowLeft, Trophy, RefreshCw, ChevronDown, ChevronUp, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

function positionBadge(pos: number) {
  if (pos === 1) return <span className="text-yellow-400 font-bold text-lg">🥇</span>;
  if (pos === 2) return <span className="text-slate-300 font-bold text-lg">🥈</span>;
  if (pos === 3) return <span className="text-amber-600 font-bold text-lg">🥉</span>;
  return <span className="text-muted-foreground font-semibold w-6 text-center">{pos}</span>;
}

function PlayerAvatar({ name, photoUrl }: { name: string | null; photoUrl?: string | null }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <Avatar className="w-8 h-8 flex-shrink-0">
      {photoUrl && <AvatarImage src={photoUrl} alt={name ?? ""} />}
      <AvatarFallback className="text-xs font-semibold bg-primary/20 text-primary">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function PlayerRow({ player, mode }: { player: any; mode: "stroke" | "stableford" }) {
  const [expanded, setExpanded] = useState(false);
  const score = mode === "stroke" ? player.cumulativeNet : player.cumulativeStableford;
  const scoreLabel = mode === "stroke" ? "Net" : "Pts";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(player.position)}</div>
        <PlayerAvatar name={player.userName} photoUrl={player.photoUrl} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{player.userName ?? "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{player.rounds.length} rounds</p>
        </div>
        <div className="text-right mr-2">
          <p className="text-lg font-bold text-foreground">{score}</p>
          <p className="text-xs text-muted-foreground">{scoreLabel}</p>
        </div>
        {player.rounds.length > 0 && (
          expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> :
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </div>
      {expanded && player.rounds.length > 0 && (
        <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-1">
          {player.rounds.map((r: any) => (
            <div key={r.roundId} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{r.roundName}</span>
              <div className="flex gap-4">
                <span className="text-foreground">{r.totalNet} net</span>
                <span className="text-primary">{r.totalStableford} pts</span>
                <span className="text-muted-foreground">{r.holesPlayed}H</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TripLeaderboard() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);

  const { data: trip } = trpc.trips.get.useQuery({ id });
  const { data, isLoading, refetch, isFetching } = trpc.leaderboard.trip.useQuery(
    { tripId: id },
    { refetchInterval: 30000 }
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/trip/${id}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <Trophy className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">Trip Leaderboard</h1>
            {trip && <p className="text-xs text-muted-foreground">{trip.name}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`/api/pdf/trip-results/${id}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-3 h-3" />
              PDF
            </Button>
          </a>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : !data ? (
          <div className="text-center py-12 text-muted-foreground">No leaderboard data.</div>
        ) : (
          <Tabs defaultValue="stroke">
            <TabsList className="mb-6 w-full">
              <TabsTrigger value="stroke" className="flex-1 gap-2"><Trophy className="w-4 h-4" />Net Stroke</TabsTrigger>
              <TabsTrigger value="stableford" className="flex-1 gap-2">⭐ Stableford</TabsTrigger>
            </TabsList>

            <TabsContent value="stroke">
              <div className="space-y-2">
                {data.strokePlay.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
                    No scores yet.
                  </div>
                ) : (
                  data.strokePlay.map((p) => (
                    <PlayerRow key={p.userId} player={p} mode="stroke" />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="stableford">
              <div className="space-y-2">
                {data.stableford.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
                    No scores yet.
                  </div>
                ) : (
                  data.stableford.map((p) => (
                    <PlayerRow key={p.userId} player={p} mode="stableford" />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
