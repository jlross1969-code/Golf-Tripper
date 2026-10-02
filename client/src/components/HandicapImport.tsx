import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function HandicapImport({ tripId }: { tripId: number }) {
  const utils = trpc.useUtils();
  const [csv, setCsv] = useState("");
  const run = trpc.players.importHandicaps.useMutation({
    onSuccess: (r) => {
      if (!r.dryRun) {
        toast.success(`${r.applied} handicap${r.applied === 1 ? "" : "s"} updated`);
        utils.players.tripPlayers.invalidate({ tripId });
        utils.players.handicapHistory.invalidate();
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const matched = run.data?.results.filter((r) => r.status === "matched").length ?? 0;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold">Import handicaps</h3>
      <p className="text-xs text-muted-foreground">Paste one player per line as “name or email, handicap” (for example from a club handicap export). Preview first, then apply.</p>
      <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} placeholder={"Sam Lee, 12.4\npat@example.com, 18"} aria-label="Handicaps to import" />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={!csv.trim() || run.isPending} onClick={() => run.mutate({ tripId, csv, dryRun: true })}>Preview</Button>
        <Button size="sm" disabled={!matched || run.isPending || !run.data?.dryRun} onClick={() => run.mutate({ tripId, csv, dryRun: false })}>Apply {matched || ""} matched</Button>
      </div>
      {run.data && (
        <ul className="divide-y divide-border rounded-lg border border-border text-sm">
          {run.data.results.map((r, i) => (
            <li key={i} className="flex items-center gap-2 p-2">
              <span className="flex-1">{r.identifier}</span><span>{r.handicap}</span>
              <Badge variant={r.status === "matched" ? "secondary" : "destructive"} title={r.reason ?? undefined}>{r.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
