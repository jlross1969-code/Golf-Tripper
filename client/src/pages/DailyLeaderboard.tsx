import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useParams } from "wouter";
import { ArrowLeft, BarChart2, RefreshCw, Trophy, Users, Layers, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function positionBadge(pos: number) {
  if (pos === 1) return <span className="text-yellow-400 font-bold text-lg">🥇</span>;
  if (pos === 2) return <span className="text-slate-300 font-bold text-lg">🥈</span>;
  if (pos === 3) return <span className="text-amber-600 font-bold text-lg">🥉</span>;
  return <span className="text-muted-foreground font-semibold w-6 text-center">{pos}</span>;
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
                      <div key={p.userId} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4">
                        <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(p.position)}</div>
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
                      <div key={s.userId} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4">
                        <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(i + 1)}</div>
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
          </Tabs>
        )}
      </div>
    </div>
  );
}
