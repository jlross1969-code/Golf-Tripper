import { trpc } from "@/lib/trpc";
import { Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "wouter";

export default function SpectatorView() {
  const { tripId } = useParams<{ tripId: string }>();
  const token = new URLSearchParams(window.location.search).get("t") ?? "";
  const { data, isLoading, error } = trpc.spectator.view.useQuery(
    { tripId: Number(tripId), token },
    { enabled: !!token, refetchInterval: 30000, retry: false },
  );

  if (!token || error) {
    return <div className="min-h-screen flex items-center justify-center p-6 text-center text-muted-foreground">This spectator link is not valid or has been turned off.</div>;
  }
  if (isLoading || !data) return <div className="p-6 max-w-2xl mx-auto space-y-3"><Skeleton className="h-10" /><Skeleton className="h-64" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4 text-center">
        {data.trip.logoUrl && <img src={data.trip.logoUrl} alt="" className="h-14 mx-auto mb-2 object-contain" />}
        <h1 className="font-bold text-foreground text-xl">{data.trip.name}</h1>
        <p className="text-xs text-muted-foreground">{data.trip.location ?? ""} · live leaderboard (updates every 30s)</p>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <section aria-label="Leaderboard">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Stableford standings</h2>
          <ol className="bg-card border border-border rounded-xl divide-y divide-border">
            {data.leaderboard.map((p, i) => (
              <li key={i} className="p-3 flex items-center gap-3">
                <span className="w-6 text-center font-bold text-muted-foreground">{i + 1}</span>
                {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" /> : <span className="w-8 h-8 rounded-full bg-muted" />}
                <span className="flex-1 font-medium">{p.userName ?? "Player"}</span>
                <span className="text-xs text-muted-foreground">{p.holesPlayed} holes</span>
                <span className="font-bold w-14 text-right">{p.stableford} pts</span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-label="Rounds">
          <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Rounds</h2>
          <ul className="text-sm space-y-1">
            {data.rounds.map((r) => <li key={r.id}>{r.name} · {new Date(r.roundDate).toLocaleDateString("en-AU")} · {r.status}</li>)}
          </ul>
        </section>
      </main>
    </div>
  );
}
