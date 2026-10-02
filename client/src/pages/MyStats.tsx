import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowLeft, BarChart2 } from "lucide-react";

export default function MyStats() {
  const { data } = trpc.stats.myCareer.useQuery();
  if (!data) return <div className="p-6 max-w-2xl mx-auto"><Skeleton className="h-64" /></div>;
  const tiles = [
    { label: "Rounds", value: data.roundsPlayed },
    { label: "Avg points", value: data.averagePoints ?? "–" },
    { label: "Avg gross (18)", value: data.averageGross18 ?? "–" },
    { label: "Best round", value: data.bestRound ? `${data.bestRound.points} pts` : "–" },
  ];
  const trend = data.handicapTrend;
  const lo = Math.min(...trend.map((t) => t.handicap), 0);
  const hi = Math.max(...trend.map((t) => t.handicap), 1);
  const points = trend.map((t, i) => `${trend.length > 1 ? (i / (trend.length - 1)) * 300 : 150},${60 - ((t.handicap - lo) / Math.max(hi - lo, 1)) * 50}`).join(" ");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4 flex items-center gap-3">
        <Link href="/"><Button variant="ghost" size="icon" aria-label="Back"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <BarChart2 className="w-5 h-5 text-primary" />
        <h1 className="font-bold">My career stats</h1>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{t.value}</p>
              <p className="text-xs text-muted-foreground">{t.label}</p>
            </div>
          ))}
        </div>
        <section>
          <h2 className="font-bold mb-2">Scoring moments</h2>
          <p className="text-sm">Birdies <b>{data.achievements.birdie}</b> · Eagles <b>{data.achievements.eagle}</b> · Holes in one <b>{data.achievements.hole_in_one}</b></p>
        </section>
        {trend.length > 1 && (
          <section>
            <h2 className="font-bold mb-2">Handicap trend</h2>
            <svg viewBox="0 0 300 70" role="img" aria-label={`Handicap moved from ${trend[0].handicap} to ${trend[trend.length - 1].handicap}`} className="w-full bg-card border border-border rounded-xl p-2">
              <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
            </svg>
            <p className="text-xs text-muted-foreground mt-1">{trend[0].handicap} → {trend[trend.length - 1].handicap}</p>
          </section>
        )}
        <section>
          <h2 className="font-bold mb-2">By trip</h2>
          <ul className="bg-card border border-border rounded-xl divide-y divide-border text-sm">
            {data.perTrip.map((t) => <li key={t.tripId} className="p-3 flex"><span className="flex-1">{t.tripName}</span><span>{t.rounds} rounds · {t.points} pts</span></li>)}
            {!data.perTrip.length && <li className="p-3 text-muted-foreground">No completed rounds yet.</li>}
          </ul>
        </section>
      </main>
    </div>
  );
}
