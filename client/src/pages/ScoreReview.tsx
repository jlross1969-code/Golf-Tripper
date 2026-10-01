import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, useParams } from "wouter";
import { ArrowLeft, History, Flag } from "lucide-react";
import { toast } from "sonner";

const SOURCE_LABEL: Record<string, string> = { entry: "Entered", admin_correction: "Admin correction", offline_sync: "Offline sync" };

export default function ScoreReview() {
  const { roundId } = useParams<{ roundId: string }>();
  const id = Number(roundId);
  const utils = trpc.useUtils();
  const { data: me } = trpc.auth.me.useQuery();
  const { data: round } = trpc.rounds.get.useQuery({ id });
  const { data: history } = trpc.scoreReview.history.useQuery({ roundId: id });
  const { data: disputes } = trpc.scoreReview.disputes.useQuery({ roundId: id });
  const { data: players } = trpc.players.tripPlayers.useQuery({ tripId: round?.round.tripId ?? 0 }, { enabled: !!round });
  const { data: attestations } = trpc.attestation.list.useQuery({ roundId: id });
  const sign = trpc.attestation.sign.useMutation({
    onSuccess: (r) => { utils.attestation.list.invalidate({ roundId: id }); toast.success(r.signed ? "Card signed by both" : `Signed as ${r.role}`); },
    onError: (e) => toast.error(e.message),
  });
  const reopen = trpc.attestation.reopen.useMutation({
    onSuccess: () => utils.attestation.list.invalidate({ roundId: id }),
    onError: (e) => toast.error(e.message),
  });
  const [resolutionNote, setResolutionNote] = useState("");
  const [disputeNote, setDisputeNote] = useState("");

  const nameOf = (userId: number) => {
    const p = players?.find((tp) => tp.userId === userId);
    return p?.nickname ?? p?.user?.name ?? `Player ${userId}`;
  };

  const resolve = trpc.scoreReview.resolveDispute.useMutation({
    onSuccess: () => { utils.scoreReview.disputes.invalidate({ roundId: id }); toast.success("Dispute updated"); },
    onError: (e) => toast.error(e.message),
  });
  const raise = trpc.scoreReview.raiseDispute.useMutation({
    onSuccess: () => { utils.scoreReview.disputes.invalidate({ roundId: id }); setDisputeNote(""); toast.success("Dispute raised"); },
    onError: (e) => toast.error(e.message),
  });

  // Holes the signed-in player has scored, so they can query one of their own.
  const myLatest = history?.filter((h) => h.userId === me?.id)[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4 flex items-center gap-3">
        <Link href={`/round/${id}/score`}><Button variant="ghost" size="icon" aria-label="Back to score entry"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <History className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-foreground">Score history &amp; disputes</h1>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        <section>
          <h2 className="text-lg font-bold mb-1">Scorecard sign-off</h2>
          <p className="text-xs text-muted-foreground mb-3">Players sign their own card and a playing partner signs as marker. Signed cards lock for editing.</p>
          <ul className="divide-y divide-border bg-card border border-border rounded-xl">
            {players?.map((p) => {
              const rows = attestations?.filter((a) => a.userId === p.userId) ?? [];
              const playerSigned = rows.some((a) => a.role === "player");
              const markerSigned = rows.some((a) => a.role === "marker");
              return (
                <li key={p.userId} className="p-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="flex-1 min-w-32 font-medium">{nameOf(p.userId)}</span>
                  <Badge variant={playerSigned ? "secondary" : "outline"}>player {playerSigned ? "✓" : "–"}</Badge>
                  <Badge variant={markerSigned ? "secondary" : "outline"}>marker {markerSigned ? "✓" : "–"}</Badge>
                  <Button size="sm" variant="outline" disabled={sign.isPending} onClick={() => sign.mutate({ roundId: id, userId: p.userId })}>
                    {p.userId === me?.id ? "Sign my card" : "Sign as marker"}
                  </Button>
                  {playerSigned && markerSigned && <Button size="sm" variant="ghost" onClick={() => reopen.mutate({ roundId: id, userId: p.userId })}>Reopen</Button>}
                </li>
              );
            })}
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Flag className="w-5 h-5 text-primary" /> Disputes</h2>
          {myLatest && (
            <div className="bg-card border border-border rounded-xl p-3 mb-3 space-y-2">
              <p className="text-sm text-muted-foreground">Query your latest change (hole {myLatest.holeNumber}):</p>
              <div className="flex gap-2">
                <Input value={disputeNote} onChange={(e) => setDisputeNote(e.target.value)} placeholder="What looks wrong?" maxLength={500} />
                <Button disabled={disputeNote.trim().length < 3 || raise.isPending} onClick={() => raise.mutate({ roundId: id, userId: myLatest.userId, holeId: myLatest.holeId, holeNumber: myLatest.holeNumber, note: disputeNote })}>Raise</Button>
              </div>
            </div>
          )}
          {!disputes?.length && <p className="text-sm text-muted-foreground">No disputes.</p>}
          <div className="space-y-2">
            {disputes?.map((d) => (
              <div key={d.id} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={d.status === "open" ? "destructive" : "secondary"}>{d.status}</Badge>
                  <span className="text-sm font-medium">{nameOf(d.userId)} · hole {d.holeNumber}</span>
                </div>
                <p className="text-sm">{d.note}</p>
                <p className="text-xs text-muted-foreground">Raised by {nameOf(d.raisedBy)} · {new Date(d.createdAt).toLocaleString("en-AU")}</p>
                {d.resolutionNote && <p className="text-xs mt-1">Resolution: {d.resolutionNote}</p>}
                {d.status === "open" && (
                  <div className="flex gap-2 mt-2">
                    <Input value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} placeholder="Resolution note (admins)" maxLength={500} />
                    <Button size="sm" onClick={() => resolve.mutate({ id: d.id, status: "resolved", note: resolutionNote || undefined })}>Resolve</Button>
                    <Button size="sm" variant="outline" onClick={() => resolve.mutate({ id: d.id, status: "dismissed", note: resolutionNote || undefined })}>Dismiss</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-lg font-bold mb-3">Change log</h2>
          {!history?.length && <p className="text-sm text-muted-foreground">No score changes recorded yet.</p>}
          <ul className="divide-y divide-border bg-card border border-border rounded-xl">
            {history?.map((h) => (
              <li key={h.id} className="p-3 text-sm flex flex-wrap items-center gap-x-2">
                <span className="font-medium">{nameOf(h.userId)}</span>
                <span>hole {h.holeNumber}: {h.oldGross ?? "–"} → <b>{h.newGross}</b></span>
                <span className="text-xs text-muted-foreground">by {nameOf(h.changedBy)} · {SOURCE_LABEL[h.source]} · {new Date(h.createdAt).toLocaleString("en-AU")}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
