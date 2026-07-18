import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "wouter";
import { ArrowLeft, Users } from "lucide-react";

export default function TripPlayers() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);

  const { data: trip } = trpc.trips.get.useQuery({ id });
  const { data: players, isLoading } = trpc.players.tripPlayers.useQuery({ tripId: id });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Link href={`/trip/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <Users className="w-5 h-5 text-primary" />
        <div>
          <h1 className="font-bold text-foreground">Players</h1>
          {trip && <p className="text-xs text-muted-foreground">{trip.name}</p>}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-3">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : !players || players.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl text-muted-foreground">
            No players have joined yet.
          </div>
        ) : (
          players.map((p, idx) => {
            const displayName = p.nickname ?? p.user?.name ?? `Player ${p.userId}`;
            const initials = displayName.charAt(0).toUpperCase();
            return (
              <div key={p.userId} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4">
                {/* Rank */}
                <div className="w-6 text-center text-sm font-bold text-muted-foreground shrink-0">
                  {idx + 1}
                </div>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {initials}
                </div>
                {/* Name + nickname info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{displayName}</p>
                  {p.nickname && p.user?.name && p.nickname !== p.user.name && (
                    <p className="text-xs text-muted-foreground">{p.user.name}</p>
                  )}
                </div>
                {/* HCP */}
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-primary">{p.currentHandicap}</p>
                  <p className="text-xs text-muted-foreground">HCP</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
