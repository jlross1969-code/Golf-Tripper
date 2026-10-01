import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "wouter";
import { ArrowLeft, Trophy, Printer, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatAchievementType } from "../../../shared/scoring";

export default function TripRecap() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const { data } = trpc.recap.get.useQuery({ tripId: id });
  const [story, setStory] = useState<string | null>(null);
  const narrative = trpc.recap.narrative.useMutation({
    onSuccess: (r) => setStory(r.text),
    onError: (e) => toast.error(e.message),
  });

  if (!data) return <div className="p-6 max-w-2xl mx-auto"><Skeleton className="h-64" /></div>;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4 flex items-center gap-3 print:hidden">
        <Link href={`/trip/${id}`}><Button variant="ghost" size="icon" aria-label="Back to trip"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="font-bold flex-1">Trip recap</h1>
        <Button size="sm" variant="outline" className="gap-1" disabled={narrative.isPending} onClick={() => narrative.mutate({ tripId: id })}><Sparkles className="w-4 h-4" /> Write story</Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print / PDF</Button>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">{data.trip.name}</h2>
          <p className="text-sm text-muted-foreground">{data.trip.location ?? ""} {new Date(data.trip.startDate).toLocaleDateString("en-AU")} – {new Date(data.trip.endDate).toLocaleDateString("en-AU")}</p>
        </div>
        {story && <section className="whitespace-pre-line text-sm leading-relaxed bg-card border border-border rounded-xl p-4">{story}</section>}
        <section>
          <h3 className="font-bold mb-2 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Final standings</h3>
          <ol className="bg-card border border-border rounded-xl divide-y divide-border">
            {data.standings.map((p, i) => (
              <li key={i} className="p-3 flex gap-3 text-sm"><span className="w-6 font-bold text-muted-foreground">{i + 1}</span><span className="flex-1">{p.name}</span><b>{p.stableford} pts</b></li>
            ))}
          </ol>
        </section>
        {data.awards.length > 0 && (
          <section>
            <h3 className="font-bold mb-2">Awards</h3>
            <ul className="text-sm space-y-1">{data.awards.map((a, i) => <li key={i}><b>{a.name}</b>: {a.winner}</li>)}</ul>
          </section>
        )}
        {data.highlights.length > 0 && (
          <section>
            <h3 className="font-bold mb-2">Highlights</h3>
            <ul className="text-sm space-y-1">{data.highlights.map((h, i) => <li key={i}>{h.player}: {formatAchievementType(h.type)} on hole {h.holeNumber} ({h.grossScore} on a par {h.par})</li>)}</ul>
          </section>
        )}
      </main>
    </div>
  );
}
