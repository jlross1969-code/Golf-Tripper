import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link, useParams } from "wouter";
import { ArrowLeft, BarChart2, RefreshCw, Trophy, Users, Layers, Download, Target, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AchievementAlert from "@/components/AchievementAlert";

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

export default function DailyLeaderboard() {
  const { roundId } = useParams<{ roundId: string }>();
  const id = Number(roundId);

  const { data, isLoading, refetch, isFetching } = trpc.leaderboard.daily.useQuery(
    { roundId: id },
    { refetchInterval: 15000 }
  );

  return (
    <div className="min-h-screen bg-background">
      {data && <AchievementAlert tripId={data.round.tripId} />}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <BarChart2 className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">Daily Leaderboard</h1>
            {data?.round && <p className="text-xs text-muted-foreground">{data.round.name}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/round/${id}/ntp`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Target className="w-3 h-3" />
              NTP
            </Button>
          </Link>
          <a href={`/api/pdf/scorecard/${id}`} target="_blank" rel="noopener noreferrer">
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

      {/* Effective Baseline Info Bar */}
      {data?.trip && (
        <div className="border-b border-border bg-muted/30 px-6 py-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span>Mode: <span className="text-foreground font-medium">{data.trip.handicapMode === "stableford" ? "Stableford" : "Net Stroke"}</span></span>
          <span>Effective Baseline: <span className="text-primary font-semibold">{data.effectiveBaseline}</span></span>
          {(data.round as any).dailyAdjustment !== 0 && (
            <span className="text-amber-400">
              (trip {data.trip.handicapBaseline === 0 ? (data.trip.handicapMode === "stableford" ? 34 : 70) : data.trip.handicapBaseline}
              {" "}{(data.round as any).dailyAdjustment > 0 ? "+" : ""}{(data.round as any).dailyAdjustment} daily adj)
            </span>
          )}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : !data ? (
          <div className="text-center py-12 text-muted-foreground">Round not found.</div>
        ) : (
          <Tabs defaultValue="stroke">
            <TabsList className="mb-6 w-full">
              {data.round.strokePlayEnabled && <TabsTrigger value="stroke" className="flex-1 gap-2"><Trophy className="w-4 h-4" />Stroke Play</TabsTrigger>}
              {data.round.fourBBBEnabled && <TabsTrigger value="4bbb" className="flex-1 gap-2"><Users className="w-4 h-4" />4BBB</TabsTrigger>}
              {data.round.skinsEnabled && <TabsTrigger value="skins" className="flex-1 gap-2"><Layers className="w-4 h-4" />Skins</TabsTrigger>}
              <TabsTrigger value="highlights" className="flex-1 gap-2"><Star className="w-4 h-4" />Highlights</TabsTrigger>
            </TabsList>

            {/* Stroke Play Tab */}
            {data.round.strokePlayEnabled && (
              <TabsContent value="stroke">
                <div className="space-y-2">
                  {data.strokePlay.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
                      No scores entered yet.
                    </div>
                  ) : (
                    data.strokePlay.map((p) => (
                      <div key={p.userId} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                        <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(p.position)}</div>
                        <PlayerAvatar name={p.userName} photoUrl={(p as any).photoUrl} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{p.userName ?? "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">HCP {p.handicap} · {p.holesPlayed} holes</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{p.totalNet}</p>
                          <p className="text-xs text-muted-foreground">Net ({p.totalGross} gross)</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            )}

            {/* 4BBB Tab */}
            {data.round.fourBBBEnabled && (
              <TabsContent value="4bbb">
                <div className="space-y-2">
                  {data.fourBBB.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
                      No 4BBB scores yet.
                    </div>
                  ) : (
                    data.fourBBB.map((t) => (
                      <div key={t.teamName} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4">
                        <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(t.position)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{t.teamName}</p>
                          <p className="text-xs text-muted-foreground">{t.holesPlayed} holes played</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{t.totalBestBall}</p>
                          <p className="text-xs text-muted-foreground">Best Ball Net</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            )}

            {/* Skins Tab */}
            {data.round.skinsEnabled && (
              <TabsContent value="skins">
                <div className="space-y-2">
                  {data.skins.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
                      No skins won yet.
                    </div>
                  ) : (
                    data.skins.map((s, i) => (
                      <div key={s.userId} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                        <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(i + 1)}</div>
                        <PlayerAvatar name={s.userName} photoUrl={null} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{s.userName ?? "Unknown"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{s.skinsWon}</p>
                          <p className="text-xs text-muted-foreground">Skins</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            )}
            {/* Highlights Tab */}
            <TabsContent value="highlights">
              <div className="space-y-6">
                {/* Top 3 Individual */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" /> Top 3 Individual
                  </h3>
                  {data.strokePlay.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground bg-card border border-border rounded-xl text-sm">
                      No individual scores yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.strokePlay.slice(0, 3).map((p) => (
                        <div key={p.userId} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                          <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(p.position)}</div>
                          <PlayerAvatar name={p.userName} photoUrl={(p as any).photoUrl} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{p.userName ?? "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">HCP {p.handicap} · {p.holesPlayed} holes</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">{p.totalNet}</p>
                            <p className="text-xs text-muted-foreground">Net ({p.totalGross} gross)</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top 3 4BBB Pairs */}
                {data.round.fourBBBEnabled && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" /> Top 3 Pairs (4BBB)
                    </h3>
                    {data.fourBBB.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground bg-card border border-border rounded-xl text-sm">
                        No 4BBB pairs scored yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data.fourBBB.slice(0, 3).map((t) => (
                          <div key={t.teamName} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4">
                            <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(t.position)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate">{t.teamName}</p>
                              <p className="text-xs text-muted-foreground">{t.holesPlayed} holes played</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-foreground">{t.totalBestBall}</p>
                              <p className="text-xs text-muted-foreground">Best Ball Net</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!data.round.fourBBBEnabled && (
                  <p className="text-xs text-muted-foreground text-center">
                    4BBB not enabled for this round.
                  </p>
                )}
              </div>
            </TabsContent>

          </Tabs>
        )}
      </div>
    </div>
  );
}
