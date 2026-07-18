import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "wouter";
import { ArrowLeft, Target, Trophy } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function NTPResults() {
  const { roundId } = useParams<{ roundId: string }>();
  const rId = Number(roundId);
  const { user } = useAuth();

  const { data: roundData } = trpc.rounds.get.useQuery({ id: rId });
  const round = roundData?.round;
  const { data: ntpList, refetch } = trpc.ntp.getByRound.useQuery({ roundId: rId });

  const [ntpInputs, setNtpInputs] = useState<Record<number, string>>({});
  const submitNtp = trpc.ntp.submitEntry.useMutation({
    onSuccess: () => { toast.success("Distance submitted!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (!ntpList) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  if (ntpList.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-6 py-4 flex items-center gap-3">
          <Link href={`/trip/${round?.tripId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <Target className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">Nearest to Pin</h1>
            <p className="text-xs text-muted-foreground">{round?.name}</p>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Target className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">No NTP holes set for this round yet.</p>
          <p className="text-xs text-muted-foreground">Ask your admin to enable NTP on specific holes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Link href={`/trip/${round?.tripId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <Target className="w-5 h-5 text-primary" />
        <div>
          <h1 className="font-bold text-foreground">Nearest to Pin</h1>
          <p className="text-xs text-muted-foreground">{round?.name}</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        {ntpList.map((ntp) => {
          const sorted = [...ntp.entries].sort((a, b) => a.distanceCm - b.distanceCm);
          const myEntry = ntp.entries.find((e) => e.userId === user?.id);
          const ntpVal = ntpInputs[ntp.id] ?? "";

          return (
            <div key={ntp.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{ntp.holeNumber}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Hole {ntp.holeNumber}</p>
                    <p className="text-xs text-muted-foreground">Nearest to Pin</p>
                  </div>
                </div>
                {ntp.winnerId ? (
                  <Badge variant="default" className="gap-1">
                    <Trophy className="w-3 h-3" /> Winner confirmed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Target className="w-3 h-3" /> In progress
                  </Badge>
                )}
              </div>

              {/* Winner banner */}
              {ntp.winnerId && ntp.winnerName && (
                <div className="mb-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">
                    {ntp.winnerName} — {ntp.winnerDistanceCm} cm
                  </span>
                </div>
              )}

              {/* Entries leaderboard */}
              {sorted.length > 0 ? (
                <div className="space-y-1 mb-3">
                  {sorted.map((entry, i) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between py-1.5 px-3 rounded-lg ${
                        i === 0 && !ntp.winnerId ? "bg-primary/10" : "bg-muted/30"
                      } ${ntp.winnerId === entry.userId ? "bg-primary/15 border border-primary/30" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          {i + 1}
                        </span>
                        <span className={`text-sm ${entry.userId === user?.id ? "font-semibold text-primary" : "text-foreground"}`}>
                          {entry.userName ?? "Player"}
                          {entry.userId === user?.id && " (you)"}
                        </span>
                        {ntp.winnerId === entry.userId && <Trophy className="w-3 h-3 text-primary" />}
                      </div>
                      <span className="font-mono text-sm font-semibold text-foreground">{entry.distanceCm} cm</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-3">No entries yet — be the first to submit!</p>
              )}

              {/* Submit form for current user */}
              {!myEntry && !ntp.winnerId && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Target className="w-4 h-4 text-primary flex-shrink-0" />
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={ntpVal}
                    onChange={(e) => setNtpInputs((prev) => ({ ...prev, [ntp.id]: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="Your distance in cm..."
                  />
                  <Button
                    size="sm"
                    disabled={!ntpVal || submitNtp.isPending}
                    onClick={() => submitNtp.mutate({ ntpId: ntp.id, distanceCm: Number(ntpVal) })}
                  >
                    Submit
                  </Button>
                </div>
              )}
              {myEntry && !ntp.winnerId && (
                <p className="text-xs text-primary pt-2 border-t border-border">
                  Your entry: {myEntry.distanceCm} cm — waiting for admin to confirm winner.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
