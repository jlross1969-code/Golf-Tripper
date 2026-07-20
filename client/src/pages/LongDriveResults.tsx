import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link, useParams } from "wouter";
import { ArrowLeft, Zap, Trophy, Ruler } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

// ── unit helpers ──────────────────────────────────────────────────────────────
const YARDS_PER_METRE = 1.09361;
const toYards = (m: number) => Math.round(m * YARDS_PER_METRE);
const toMetres = (m: number) => Math.round(m);
const fromYards = (yds: number) => Math.round(yds / YARDS_PER_METRE);
const UNIT_KEY = "longDriveUnit"; // localStorage key

export default function LongDriveResults() {
  const { roundId } = useParams<{ roundId: string }>();
  const rId = Number(roundId);
  const { user } = useAuth();

  // ── unit preference (persisted) ───────────────────────────────────────────
  const [useYards, setUseYards] = useState<boolean>(() => {
    try {
      return localStorage.getItem(UNIT_KEY) !== "metres";
    } catch {
      return true; // default yards
    }
  });

  const toggleUnit = (checked: boolean) => {
    setUseYards(checked);
    try {
      localStorage.setItem(UNIT_KEY, checked ? "yards" : "metres");
    } catch {}
    // Clear any partially-typed input to avoid confusion
    setDistanceToPin("");
  };

  const unitLabel = useYards ? "yds" : "m";
  const displayDist = (metres: number) => useYards ? toYards(metres) : toMetres(metres);

  // ── data ──────────────────────────────────────────────────────────────────
  const { data: roundData } = trpc.rounds.get.useQuery({ id: rId });
  const round = roundData?.round;

  const { data: leaderboard, refetch } = trpc.longDrive.getLeaderboard.useQuery(
    { roundId: rId },
    { refetchInterval: 15000 }
  );

  const [distanceToPin, setDistanceToPin] = useState("");
  const [showAchievement, setShowAchievement] = useState(false);
  const [achievementText, setAchievementText] = useState("");
  const prevLeaderRef = useRef<number | null>(null);

  // ── achievement popup ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!leaderboard || leaderboard.length === 0) return;
    const currentLeader = leaderboard[0];
    if (prevLeaderRef.current !== null && prevLeaderRef.current !== currentLeader.userId) {
      const name = (currentLeader as any).playerName ?? "A player";
      const dist = displayDist(currentLeader.driveDistanceM);
      setAchievementText(`💨 New Long Drive Leader!\n${name} — ${dist} ${unitLabel}`);
      setShowAchievement(true);
      setTimeout(() => setShowAchievement(false), 4000);
    }
    prevLeaderRef.current = currentLeader.userId;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderboard]);

  // ── mutation ──────────────────────────────────────────────────────────────
  const submitEntry = trpc.longDrive.submitEntry.useMutation({
    onSuccess: (data: any) => {
      const dist = displayDist(data.driveDistanceM ?? 0);
      toast.success(`Drive recorded: ${dist} ${unitLabel}${data.isNewLeader ? " 🏆 You're the new leader!" : ""}`);
      setDistanceToPin("");
      refetch();
    },
    onError: (e) => {
      // Friendly message for the "must beat leader" rule
      if (e.message.includes("must beat the current leader")) {
        toast.error(e.message, { duration: 6000 });
      } else {
        toast.error(e.message);
      }
    },
  });

  const handleSubmit = () => {
    const raw = Number(distanceToPin);
    if (!raw || raw <= 0) return;
    // Always send metres to the server
    const metres = useYards ? fromYards(raw) : raw;
    submitEntry.mutate({ roundId: rId, distanceToPinM: metres });
  };

  // ── derived ───────────────────────────────────────────────────────────────
  const isEnabled = round?.longDriveEnabled;
  const holeNumber = round?.longDriveHole;
  const myEntry = leaderboard?.find((e: any) => e.userId === user?.id);

  if (!round) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Achievement popup overlay */}
      {showAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-card border border-yellow-500/60 rounded-2xl px-8 py-6 shadow-2xl text-center animate-[achievement-pop_0.4s_ease-out] max-w-xs mx-4">
            <div className="text-4xl mb-2">💨</div>
            <p className="font-bold text-foreground text-lg whitespace-pre-line">{achievementText}</p>
          </div>
        </div>
      )}

      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Link href={`/trip/${round.tripId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <Zap className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <h1 className="font-bold text-foreground">Long Drive</h1>
          <p className="text-xs text-muted-foreground">{round.name}</p>
        </div>

        {/* Unit toggle — always visible in header */}
        <div className="flex items-center gap-2 shrink-0">
          <Label htmlFor="unit-toggle" className="text-xs text-muted-foreground select-none">m</Label>
          <Switch
            id="unit-toggle"
            checked={useYards}
            onCheckedChange={toggleUnit}
            aria-label="Toggle between yards and metres"
          />
          <Label htmlFor="unit-toggle" className="text-xs text-muted-foreground select-none">yds</Label>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        {!isEnabled ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Zap className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Long Drive is not enabled for this round.</p>
            <p className="text-xs text-muted-foreground">Ask your admin to configure a Long Drive hole.</p>
          </div>
        ) : (
          <>
            {/* Info card */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{holeNumber}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Hole {holeNumber} — Long Drive</p>
                  <p className="text-xs text-muted-foreground">Use your rangefinder to measure distance from your ball to the pin</p>
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-primary" />
                  After your drive, aim your rangefinder at the pin and enter the distance below in <strong className="text-foreground">{useYards ? "yards" : "metres"}</strong>.
                </p>
                <p className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  Drive distance = hole length − your distance to pin.
                </p>
                {/* Fairway rule */}
                <p className="flex items-center gap-1.5 text-amber-400/90 font-medium">
                  <span className="text-base leading-none">⛳</span>
                  <strong>Rule:</strong> Drive must be on the fairway to qualify.
                </p>
                {/* Must-beat-leader rule */}
                <p className="flex items-center gap-1.5 text-amber-400/90 font-medium">
                  <Trophy className="w-3.5 h-3.5" />
                  Only drives that beat the current round leader are recorded.
                </p>
              </div>
            </div>

            {/* Submit form */}
            {!myEntry ? (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Submit Your Drive</p>
                <p className="text-xs text-muted-foreground">
                  Enter the distance from your ball to the pin in <strong className="text-foreground">{useYards ? "yards" : "metres"}</strong> as shown on your rangefinder.
                </p>
                {/* Fairway confirmation reminder */}
                <div className="flex items-center gap-2 bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2">
                  <span className="text-base leading-none">⛳</span>
                  <p className="text-xs text-amber-300/90">Confirm your drive is on the <strong>fairway</strong> before submitting. Off-fairway drives are not eligible.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min="1"
                      max={useYards ? 660 : 600}
                      step="1"
                      value={distanceToPin}
                      onChange={(e) => setDistanceToPin(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      className="h-9 text-sm pr-10"
                      placeholder={`Distance to pin (${unitLabel})...`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      {unitLabel}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    disabled={!distanceToPin || submitEntry.isPending}
                    onClick={handleSubmit}
                  >
                    {submitEntry.isPending ? "..." : "Submit"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-emerald-700/40 rounded-xl p-4">
                <p className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Your drive recorded
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Distance to pin: {displayDist((myEntry as any).distanceToPinM)} {unitLabel} ·
                  Drive: <strong className="text-foreground">{displayDist((myEntry as any).driveDistanceM)} {unitLabel}</strong>
                </p>
              </div>
            )}

            {/* Leaderboard */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Leaderboard
              </p>
              {!leaderboard ? (
                [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)
              ) : leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No entries yet — be the first to submit!</p>
              ) : (
                leaderboard.map((entry: any, i: number) => (
                  <div
                    key={entry.id}
                    className={`bg-card border rounded-xl px-4 py-3 flex items-center gap-3 transition-all ${
                      i === 0 ? "border-yellow-600/50 bg-yellow-900/10" : "border-border"
                    } ${entry.userId === user?.id ? "ring-1 ring-primary/40" : ""}`}
                  >
                    <span className="w-7 text-center text-sm shrink-0">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${entry.userId === user?.id ? "text-primary" : "text-foreground"}`}>
                        {(entry as any).playerName ?? "Player"}{entry.userId === user?.id ? " (you)" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {displayDist(entry.distanceToPinM)} {unitLabel} to pin
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-lg ${i === 0 ? "text-yellow-400" : "text-foreground"}`}>
                        {displayDist(entry.driveDistanceM)}
                        <span className="text-xs font-normal text-muted-foreground ml-1">{unitLabel}</span>
                      </p>
                      {i === 0 && <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-600/40">Leader</Badge>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
