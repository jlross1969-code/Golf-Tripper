import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "wouter";
import { Flag, BarChart2, Bell, Users, ChevronRight, ArrowLeft, Trophy, Calendar, MessageCircle, Download, Swords, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AchievementAlert from "@/components/AchievementAlert";

export default function TripDashboard() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const { user } = useAuth();

  const { data: trip, isLoading: tripLoading } = trpc.trips.get.useQuery({ id });
  const { data: rounds, isLoading: roundsLoading } = trpc.rounds.list.useQuery({ tripId: id });
  const { data: players } = trpc.players.tripPlayers.useQuery({ tripId: id });
  const { data: notifications } = trpc.notifications.list.useQuery({ tripId: id, limit: 5 });
  const { data: achievements } = trpc.achievements.listByTrip.useQuery({ tripId: id });

  if (tripLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!trip) return <div className="p-8 text-muted-foreground">Trip not found.</div>;

  const activeRound = rounds?.find((r) => r.status === "active");
  const completedRounds = rounds?.filter((r) => r.status === "completed") ?? [];

  return (
    <div className="min-h-screen bg-background">
      <AchievementAlert tripId={id} />
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Flag className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">{trip.name}</h1>
            <p className="text-xs text-muted-foreground">
              {new Date(trip.startDate).toLocaleDateString()} – {new Date(trip.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/trip/${id}/chat`}>
            <Button variant="outline" size="sm" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              Chat
            </Button>
          </Link>
          <Link href={`/trip/${id}/notifications`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Bell className="w-4 h-4" />
              Feed
            </Button>
          </Link>
          <Link href={`/trip/${id}/leaderboard`}>
            <Button size="sm" className="gap-2">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Players", value: players?.length ?? 0, icon: Users, href: `/trip/${id}/players` },
            { label: "Rounds", value: rounds?.length ?? 0, icon: Calendar, href: `#rounds` },
            { label: "Completed", value: completedRounds.length, icon: Trophy, href: `/trip/${id}/leaderboard` },
            { label: "Notifications", value: notifications?.length ?? 0, icon: Bell, href: `/trip/${id}/notifications` },
          ].map(({ label, value, icon: Icon, href }) => (
            <Link key={label} href={href}>
              <div className="bg-card border border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors active:scale-[0.97] transition-transform">
                <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* My Handicap Journey shortcut */}
        <Link href={`/trip/${id}/my-handicap`}>
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 cursor-pointer hover:bg-primary/15 transition-colors active:scale-[0.97]">
            <div className="flex items-center gap-3">
              <BarChart2 className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground text-sm">My Handicap Journey</p>
                <p className="text-xs text-muted-foreground">View your initial and dynamic handicap per round</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-primary" />
          </div>
        </Link>

        {/* Active Round */}
        {activeRound && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground">LIVE</Badge>
                <span className="font-semibold text-foreground">{activeRound.name}</span>
              </div>
              <div className="flex gap-2">
                <Link href={`/round/${activeRound.id}/score`}>
                  <Button size="sm">Enter Scores</Button>
                </Link>
                <Link href={`/round/${activeRound.id}/leaderboard`}>
                  <Button size="sm" variant="outline">Leaderboard</Button>
                </Link>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {activeRound.strokePlayEnabled && <Badge variant="secondary">Stroke Play</Badge>}
              {activeRound.fourBBBEnabled && <Badge variant="secondary">4BBB</Badge>}
              {activeRound.skinsEnabled && <Badge variant="secondary">Skins</Badge>}
            </div>
          </div>
        )}

        {/* All Rounds */}
        <div id="rounds">
          <h2 className="text-lg font-bold text-foreground mb-4">Rounds</h2>
          {!rounds || rounds.length === 0 ? (
            <div className="text-center py-8 bg-card border border-border rounded-xl text-muted-foreground">
              No rounds scheduled yet.
            </div>
          ) : (
            <div className="space-y-3">
              {rounds.map((round) => (
                <div key={round.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{round.name}</span>
                      <Badge variant={round.status === "active" ? "default" : round.status === "completed" ? "secondary" : "outline"}>
                        {round.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {round.strokePlayEnabled && <span className="text-xs text-muted-foreground">Stroke Play</span>}
                      {round.fourBBBEnabled && <span className="text-xs text-muted-foreground">• 4BBB</span>}
                      {round.skinsEnabled && <span className="text-xs text-muted-foreground">• Skins</span>}
                      {(round as any).matchPlayEnabled && <span className="text-xs text-muted-foreground">• Match Play</span>}
                      {(round as any).alternateShotEnabled && <span className="text-xs text-muted-foreground">• Alt Shot</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(round.status === "active" || round.status === "completed") && (
                      <>
                        <Link href={`/round/${round.id}/leaderboard`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <BarChart2 className="w-3 h-3" /> Board
                          </Button>
                        </Link>
                        {round.status === "active" && (
                          <>
                            <Link href={`/round/${round.id}/score`}>
                              <Button size="sm" className="gap-1">
                                <Flag className="w-3 h-3" /> Score
                              </Button>
                            </Link>
                            <Link href={`/round/${round.id}/ntp`}>
                              <Button size="sm" variant="outline" className="gap-1">
                                <Target className="w-3 h-3" /> NTP
                              </Button>
                            </Link>
                            {(round as any).matchPlayEnabled && (
                              <Link href={`/round/${round.id}/match-play`}>
                                <Button size="sm" variant="outline" className="gap-1">
                                  <Swords className="w-3 h-3" /> Match
                                </Button>
                              </Link>
                            )}
                          </>
                        )}
                        {round.status === "completed" && (
                          <a href={`/api/pdf/scorecard/${round.id}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="gap-1">
                              <Download className="w-3 h-3" /> PDF
                            </Button>
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achievements Feed */}
        {achievements && achievements.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" /> Achievements
              </h2>
            </div>
            <div className="space-y-2">
              {achievements.slice(0, 5).map((a) => {
                const cfg = a.type === "hole_in_one" ? { label: "Hole in One!", color: "text-yellow-400" } :
                  a.type === "eagle" ? { label: "Eagle", color: "text-purple-400" } :
                  { label: "Birdie", color: "text-red-400" };
                return (
                  <div key={a.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
                    <Trophy className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <span className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-sm text-foreground ml-2">{a.playerName ?? "A player"}</span>
                      <span className="text-xs text-muted-foreground ml-2">Hole {a.holeNumber}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Notifications */}
        {notifications && notifications.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Recent Alerts</h2>
              <Link href={`/trip/${id}/notifications`}>
                <Button variant="ghost" size="sm" className="gap-1 text-primary">
                  View all <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {notifications.slice(0, 3).map((n) => (
                <div key={n.id} className="bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground">
                  {n.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
