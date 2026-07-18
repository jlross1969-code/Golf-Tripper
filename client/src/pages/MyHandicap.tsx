import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "wouter";
import { ArrowLeft, TrendingDown, TrendingUp, Minus, BarChart2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function MyHandicap() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const { user } = useAuth();

  const { data: trip } = trpc.trips.get.useQuery({ id });
  const { data: rounds } = trpc.rounds.list.useQuery({ tripId: id });
  const { data: players } = trpc.players.tripPlayers.useQuery({ tripId: id });

  // Fetch handicap history for the current user only
  const { data: history, isLoading } = trpc.players.handicapHistory.useQuery(
    { tripId: id, userId: user?.id },
    { enabled: !!user?.id }
  );

  const me = players?.find((p) => p.userId === user?.id);
  const displayName = me ? (me.nickname ?? me.user?.name ?? "You") : "You";

  // Build a roundId → round name map
  const roundMap = new Map<number, { name: string; date: Date }>();
  if (rounds) {
    for (const r of rounds) roundMap.set(r.id, { name: r.name, date: new Date(r.roundDate) });
  }

  // Build the journey: starting handicap + one entry per round that has a history record
  const journey: {
    label: string;
    date: Date | null;
    handicap: number;
    change: number | null;
    score: number | null;
    reason: string | null;
    isManual: boolean;
  }[] = [];

  if (me) {
    // Starting point
    journey.push({
      label: "Starting Handicap",
      date: null,
      handicap: me.startingHandicap,
      change: null,
      score: null,
      reason: null,
      isManual: false,
    });

    // Sort history oldest → newest
    const sorted = [...(history ?? [])].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const h of sorted) {
      const roundInfo = h.roundId ? roundMap.get(h.roundId) : null;
      journey.push({
        label: roundInfo ? roundInfo.name : "Manual Adjustment",
        date: roundInfo ? roundInfo.date : new Date(h.createdAt),
        handicap: h.newHandicap,
        change: h.newHandicap - h.oldHandicap,
        score: h.roundScore ?? null,
        reason: h.reason,
        isManual: h.isManual,
      });
    }
  }

  const currentHandicap = me?.currentHandicap ?? null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Link href={`/trip/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <BarChart2 className="w-5 h-5 text-primary" />
        <div>
          <h1 className="font-bold text-foreground">My Handicap Journey</h1>
          {trip && <p className="text-xs text-muted-foreground">{trip.name}</p>}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Current handicap summary card */}
        {me && (
          <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Trip Handicap</p>
              <p className="text-4xl font-black text-primary mt-1">{currentHandicap}</p>
              <p className="text-xs text-muted-foreground mt-1">{displayName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Started at</p>
              <p className="text-2xl font-bold text-foreground mt-1">{me.startingHandicap}</p>
              {currentHandicap !== null && me.startingHandicap !== currentHandicap && (
                <div className={`flex items-center justify-end gap-1 mt-1 text-sm font-semibold ${
                  currentHandicap < me.startingHandicap ? "text-primary" : "text-destructive"
                }`}>
                  {currentHandicap < me.startingHandicap
                    ? <TrendingDown className="w-4 h-4" />
                    : <TrendingUp className="w-4 h-4" />}
                  {Math.abs(currentHandicap - me.startingHandicap).toFixed(1)} overall
                </div>
              )}
            </div>
          </div>
        )}

        {/* Journey timeline */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Handicap Timeline</h2>

          {isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl mb-3" />)
          ) : journey.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl text-muted-foreground">
              No handicap history yet. Complete a round to see your journey.
            </div>
          ) : (
            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-5 top-6 bottom-6 w-px bg-border" />

              <div className="space-y-3">
                {journey.map((entry, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === journey.length - 1;
                  const improved = entry.change !== null && entry.change < 0;
                  const worsened = entry.change !== null && entry.change > 0;

                  return (
                    <div key={idx} className="flex items-start gap-4">
                      {/* Timeline dot */}
                      <div className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isFirst
                          ? "bg-muted border-border"
                          : isLast
                          ? "bg-primary border-primary"
                          : improved
                          ? "bg-primary/20 border-primary"
                          : worsened
                          ? "bg-destructive/20 border-destructive"
                          : "bg-muted border-border"
                      }`}>
                        {isFirst ? (
                          <span className="text-xs font-bold text-muted-foreground">S</span>
                        ) : improved ? (
                          <TrendingDown className="w-4 h-4 text-primary" />
                        ) : worsened ? (
                          <TrendingUp className="w-4 h-4 text-destructive" />
                        ) : (
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>

                      {/* Card */}
                      <div className="flex-1 bg-card border border-border rounded-xl px-4 py-3 mb-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">{entry.label}</span>
                            {entry.isManual && (
                              <Badge variant="secondary" className="text-xs">Manual</Badge>
                            )}
                          </div>
                          <span className="text-lg font-black text-foreground">HCP {entry.handicap}</span>
                        </div>

                        {entry.date && (
                          <p className="text-xs text-muted-foreground">
                            {entry.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                          </p>
                        )}

                        {entry.change !== null && (
                          <div className="flex items-center gap-3 mt-1">
                            {entry.score !== null && (
                              <span className="text-xs text-muted-foreground">
                                Score: <span className="text-foreground font-medium">{entry.score}</span>
                              </span>
                            )}
                            <span className={`text-xs font-semibold flex items-center gap-0.5 ${
                              improved ? "text-primary" : worsened ? "text-destructive" : "text-muted-foreground"
                            }`}>
                              {improved ? <TrendingDown className="w-3 h-3" /> : worsened ? <TrendingUp className="w-3 h-3" /> : null}
                              {entry.change > 0 ? "+" : ""}{entry.change.toFixed(1)} HCP
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Trip handicap settings summary */}
        {trip && (
          <div className="bg-muted/30 border border-border rounded-xl px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-sm">Trip Handicap Settings</p>
            <div className="flex gap-4 flex-wrap mt-1">
              <span>Mode: <span className="text-foreground">{trip.handicapMode === "stableford" ? "Stableford" : "Net Stroke"}</span></span>
              <span>Baseline: <span className="text-foreground">{trip.handicapBaseline === 0 ? (trip.handicapMode === "stableford" ? "34 (default)" : "70 (default)") : trip.handicapBaseline}</span></span>
              <span>Factor: <span className="text-foreground">{trip.handicapFactor}</span></span>
              <span>Auto-adjust: <span className="text-foreground">{trip.handicapAutoAdjust ? "On" : "Off"}</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
