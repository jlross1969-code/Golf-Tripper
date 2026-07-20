import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Link, useParams } from "wouter";
import {
  ArrowLeft, User, Pencil, Check, X,
  TrendingDown, TrendingUp, BarChart2, Trophy, Target,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function MyProfile() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const { user } = useAuth();

  const { data: trip } = trpc.trips.get.useQuery({ id });
  const { data: rounds } = trpc.rounds.list.useQuery({ tripId: id });
  const { data: players, isLoading: playersLoading } = trpc.players.tripPlayers.useQuery({ tripId: id });
  const { data: history, isLoading: historyLoading } = trpc.players.handicapHistory.useQuery(
    { tripId: id, userId: user?.id },
    { enabled: !!user?.id }
  );

  const me = players?.find((p) => p.userId === user?.id);
  const displayName = me ? (me.nickname ?? me.user?.name ?? "You") : "You";

  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const utils = trpc.useUtils();

  const setNickname = trpc.players.setNickname.useMutation({
    onSuccess: () => {
      utils.players.tripPlayers.invalidate();
      setEditingNickname(false);
      toast.success("Nickname updated!");
    },
    onError: () => toast.error("Failed to update nickname"),
  });

  // Build round map
  const roundMap = new Map<number, { name: string; date: Date }>();
  if (rounds) {
    for (const r of rounds) roundMap.set(r.id, { name: r.name, date: new Date(r.roundDate) });
  }

  // Build handicap journey
  type JourneyEntry = {
    label: string;
    date: Date | null;
    handicap: number;
    change: number | null;
    reason: string | null;
    isManual: boolean;
  };
  const journey: JourneyEntry[] = [];
  if (me) {
    journey.push({ label: "Starting Handicap", date: null, handicap: me.startingHandicap, change: null, reason: null, isManual: false });
    const sorted = [...(history ?? [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const h of sorted) {
      const roundInfo = h.roundId ? roundMap.get(h.roundId) : null;
      journey.push({
        label: roundInfo ? roundInfo.name : "Manual Adjustment",
        date: roundInfo ? roundInfo.date : new Date(h.createdAt),
        handicap: h.newHandicap,
        change: h.newHandicap - h.oldHandicap,
        reason: h.reason,
        isManual: h.isManual,
      });
    }
  }

  const currentHandicap = me?.currentHandicap ?? null;
  const totalChange = currentHandicap !== null && me ? currentHandicap - me.startingHandicap : null;
  const isLoading = playersLoading || historyLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href={`/trip/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <User className="w-5 h-5 text-primary" />
        <div>
          <h1 className="font-bold text-foreground text-sm">My Profile</h1>
          {trip && <p className="text-xs text-muted-foreground">{trip.name}</p>}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Profile card */}
        {isLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : me ? (
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-black text-primary flex-shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>

                {/* Name + nickname edit */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{me.user?.name ?? "Player"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {editingNickname ? (
                      <>
                        <Input
                          value={nicknameInput}
                          onChange={(e) => setNicknameInput(e.target.value)}
                          placeholder="Nickname (optional)"
                          className="h-8 text-sm w-40"
                          maxLength={64}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setNickname.mutate({ tripId: id, nickname: nicknameInput.trim() || undefined });
                            if (e.key === "Escape") setEditingNickname(false);
                          }}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" disabled={setNickname.isPending}
                          onClick={() => setNickname.mutate({ tripId: id, nickname: nicknameInput.trim() || undefined })}>
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground"
                          onClick={() => setEditingNickname(false)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-foreground text-lg leading-tight truncate">
                          {displayName}
                        </p>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-primary"
                          onClick={() => { setNicknameInput(me.nickname ?? ""); setEditingNickname(true); }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                  {me.nickname && (
                    <p className="text-xs text-muted-foreground mt-0.5">{me.user?.name}</p>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Handicap stats row */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Current HC</p>
                  <p className="text-2xl font-black text-primary">{currentHandicap ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Started at</p>
                  <p className="text-2xl font-bold text-foreground">{me.startingHandicap}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Trip change</p>
                  {totalChange !== null && totalChange !== 0 ? (
                    <div className={`flex items-center justify-center gap-1 text-lg font-bold ${totalChange < 0 ? "text-primary" : "text-destructive"}`}>
                      {totalChange < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                      {totalChange > 0 ? "+" : ""}{totalChange.toFixed(1)}
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-muted-foreground">—</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-5 text-center text-muted-foreground py-10">
              You are not a member of this trip.
            </CardContent>
          </Card>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/trip/${id}/my-handicap`}>
            <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <BarChart2 className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Handicap Journey</p>
                  <p className="text-xs text-muted-foreground">Full history chart</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href={`/trip/${id}/leaderboard`}>
            <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <Trophy className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Leaderboard</p>
                  <p className="text-xs text-muted-foreground">Trip standings</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Handicap timeline (condensed) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Handicap Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg mb-2" />)
            ) : journey.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No handicap history yet. Complete a round to see your journey.
              </p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-5 bottom-5 w-px bg-border" />
                <div className="space-y-3">
                  {journey.map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-4 pl-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold ${
                        idx === 0 ? "bg-muted text-muted-foreground" :
                        entry.change !== null && entry.change < 0 ? "bg-primary/20 text-primary" :
                        entry.change !== null && entry.change > 0 ? "bg-destructive/20 text-destructive" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {entry.change !== null
                          ? (entry.change < 0 ? "↓" : entry.change > 0 ? "↑" : "—")
                          : "S"}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{entry.label}</p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {entry.change !== null && (
                              <span className={`text-xs font-semibold ${entry.change < 0 ? "text-primary" : entry.change > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                {entry.change > 0 ? "+" : ""}{entry.change.toFixed(1)}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs font-bold px-2">
                              {entry.handicap}
                            </Badge>
                          </div>
                        </div>
                        {entry.date && (
                          <p className="text-xs text-muted-foreground">
                            {entry.date.toLocaleDateString()}
                            {entry.isManual && " · Manual"}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
