import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Trophy, Flag, Users, BarChart2, Bell, ChevronRight, LogIn, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const { data: trips } = trpc.trips.list.useQuery(undefined, { enabled: isAuthenticated });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Flag className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Golf Trip App</span>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !isAuthenticated && (
            <Button onClick={() => { window.location.href = getLoginUrl(); }} className="gap-2">
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
          )}
          {isAuthenticated && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{user?.name}</span>
              {user?.role === "admin" && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">Admin Panel</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Your Trips — shown at top for logged-in users */}
      {isAuthenticated && (
        <section className="px-6 pt-8 pb-4 max-w-5xl mx-auto w-full">
          <h2 className="text-xl font-bold text-foreground mb-4">Your Trips</h2>
          {!trips ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 animate-pulse" />
              ))}
            </div>
          ) : trips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trips.map((trip) => {
                const statusConfig: Record<string, { label: string; className: string }> = {
                  active: { label: "Live", className: "bg-primary text-primary-foreground" },
                  "in-progress": { label: "In Progress", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
                  completed: { label: "Completed", className: "bg-muted text-muted-foreground" },
                  upcoming: { label: "Upcoming", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
                };
                const sc = statusConfig[(trip as any).status] ?? statusConfig.upcoming;
                return (
                  <Link key={trip.id} href={`/trip/${trip.id}`}>
                    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:bg-accent transition-colors cursor-pointer group active:scale-[0.97]">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                            <Flag className="w-5 h-5 text-primary" />
                          </div>
                          <Badge className={`text-xs border ${sc.className}`}>{sc.label}</Badge>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{trip.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(trip.startDate).toLocaleDateString()} – {new Date(trip.endDate).toLocaleDateString()}
                      </p>
                      {(trip as any).activeRoundName && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-primary font-medium">
                          <Radio className="w-3 h-3" />
                          {(trip as any).activeRoundName} — Live
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 bg-card border border-border rounded-xl">
              <Flag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No trips yet. Ask your admin to create one.</p>
              {user?.role === "admin" && (
                <Link href="/admin">
                  <Button>Go to Admin Panel</Button>
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      {/* Hero + feature cards — only shown to non-logged-in visitors */}
      {!isAuthenticated && (
        <>
          <section className="px-6 py-16 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Trophy className="w-4 h-4" />
              Competitive Golf Trip Management
            </div>
            <h1 className="text-5xl font-extrabold text-foreground mb-4 leading-tight">
              Run Your Golf Trip<br />
              <span className="text-primary">Like a Pro</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Live leaderboards, automatic handicap adjustment, Stroke Play, 4BBB and Skins scoring — all in one place for your group.
            </p>
            <Button size="lg" onClick={() => { window.location.href = getLoginUrl(); }} className="gap-2 text-base px-8">
              Get Started <ChevronRight className="w-5 h-5" />
            </Button>
          </section>
          <section className="px-6 pb-16 max-w-5xl mx-auto w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: BarChart2, title: "Live Leaderboards", desc: "Daily & trip-wide standings updated hole by hole" },
                { icon: Flag, title: "Multi-Format Scoring", desc: "Stroke Play, 4BBB and Skins running concurrently" },
                { icon: Users, title: "Handicap Engine", desc: "Auto-adjusts handicaps after every round" },
                { icon: Bell, title: "Achievement Alerts", desc: "Instant notifications for Eagles, Birdies & HIO" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-card border border-border rounded-xl p-5">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
