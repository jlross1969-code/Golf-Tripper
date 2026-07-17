import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "wouter";
import { ArrowLeft, Bell, Trophy, Flag, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAchievementType } from "../../../shared/scoring";

function notificationIcon(type: string) {
  switch (type) {
    case "achievement": return <Trophy className="w-4 h-4 text-yellow-400" />;
    case "round_start": return <Flag className="w-4 h-4 text-primary" />;
    case "round_complete": return <Star className="w-4 h-4 text-primary" />;
    default: return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
}

export default function NotificationFeed() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);

  const { data: notifications, isLoading } = trpc.notifications.list.useQuery(
    { tripId: id, limit: 100 },
    { refetchInterval: 10000 }
  );
  const { data: achievements } = trpc.achievements.listByTrip.useQuery({ tripId: id });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Link href={`/trip/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <Bell className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-foreground">Notification Feed</h1>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Achievement Hall of Fame */}
        {achievements && achievements.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" /> Hall of Fame
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {achievements.map((a) => (
                <div key={a.id} className="bg-card border border-border rounded-xl p-4 achievement-pop">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={
                      a.type === "hole_in_one" ? "bg-yellow-400 text-yellow-900" :
                      a.type === "eagle" ? "bg-purple-600 text-white" :
                      "bg-red-600 text-white"
                    }>
                      {formatAchievementType(a.type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Hole {a.holeNumber}</span>
                  </div>
                  <p className="text-sm text-foreground font-medium">
                    Score: {a.grossScore} (Par {a.par})
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Notifications */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">All Notifications</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
                  <div className="mt-0.5">{notificationIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
