import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useParams } from "wouter";
import { ArrowLeft, BarChart2, Save, History } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { calculateNewHandicap } from "../../../../shared/scoring";

export default function AdminHandicap() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);

  const { data: trip, refetch: refetchTrip } = trpc.trips.get.useQuery({ id });
  const { data: players } = trpc.players.tripPlayers.useQuery({ tripId: id });
  const { data: history } = trpc.handicap.history.useQuery({ tripId: id });

  const [baseline, setBaseline] = useState("");
  const [factor, setFactor] = useState("");
  const [autoAdjust, setAutoAdjust] = useState(true);
  const [mode, setMode] = useState<"stableford" | "net_stroke">("stableford");

  useEffect(() => {
    if (trip) {
      setBaseline(trip.handicapBaseline.toString());
      setFactor(trip.handicapFactor.toString());
      setAutoAdjust(trip.handicapAutoAdjust);
      setMode(trip.handicapMode as "stableford" | "net_stroke");
    }
  }, [trip]);

  const updateTrip = trpc.trips.update.useMutation({
    onSuccess: () => { toast.success("Handicap settings saved"); refetchTrip(); },
    onError: (e) => toast.error(e.message),
  });

  // Preview calculation
  const baselineNum = parseFloat(baseline);
  const factorNum = parseFloat(factor);
  const previewPlayers = players?.map((p) => {
    if (!isNaN(baselineNum) && !isNaN(factorNum)) {
      const exampleScore = baselineNum + 4;
      const newHcp = calculateNewHandicap(p.currentHandicap, exampleScore, baselineNum, factorNum);
      return { ...p, previewHcp: newHcp, exampleScore };
    }
    return { ...p, previewHcp: null, exampleScore: null };
  }) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <BarChart2 className="w-5 h-5 text-primary" />
        <div>
          <h1 className="font-bold text-foreground">Handicap Settings</h1>
          <p className="text-xs text-muted-foreground">{trip?.name}</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <Tabs defaultValue="settings">
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-2"><History className="w-4 h-4" />History</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            {/* Config form */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-5">
              <h2 className="font-semibold text-foreground">Configuration</h2>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-Adjust After Rounds</p>
                  <p className="text-xs text-muted-foreground">Automatically recalculate handicaps when a round is completed</p>
                </div>
                <Switch checked={autoAdjust} onCheckedChange={setAutoAdjust} />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Scoring Mode</label>
                <div className="flex gap-2">
                  {(["stableford", "net_stroke"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        mode === m ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {m === "stableford" ? "Stableford" : "Net Stroke"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Baseline Score
                    <span className="text-muted-foreground font-normal ml-1">({mode === "stableford" ? "points" : "strokes"})</span>
                  </label>
                  <Input type="number" value={baseline} onChange={(e) => setBaseline(e.target.value)} placeholder="e.g. 32" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Adjustment Factor</label>
                  <Input type="number" step="0.01" value={factor} onChange={(e) => setFactor(e.target.value)} placeholder="e.g. 0.25" />
                </div>
              </div>

              {/* Formula explanation */}
              <div className="bg-muted/40 rounded-lg p-4 text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Formula</p>
                <p>Score &gt; baseline: <code className="text-primary">HCP − ((score − baseline) × factor)</code></p>
                <p>Score &lt; baseline: <code className="text-primary">HCP + ((baseline − score) × factor)</code></p>
                <p>Rounding: ≤ .5 → floor, ≥ .6 → ceil</p>
              </div>

              <Button
                className="w-full gap-2"
                disabled={!baseline || !factor || updateTrip.isPending}
                onClick={() => updateTrip.mutate({
                  id,
                  handicapBaseline: parseFloat(baseline),
                  handicapFactor: parseFloat(factor),
                  handicapAutoAdjust: autoAdjust,
                  handicapMode: mode,
                })}
              >
                <Save className="w-4 h-4" /> Save Settings
              </Button>
            </div>

            {/* Preview */}
            {players && players.length > 0 && !isNaN(baselineNum) && !isNaN(factorNum) && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-semibold text-foreground mb-3">
                  Preview — if all players score {baselineNum + 4} {mode === "stableford" ? "pts" : "net"}
                </h2>
                <div className="space-y-2">
                  {previewPlayers.map((p) => (
                    <div key={p.userId} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{p.user?.name ?? `Player ${p.userId}`}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">HCP {p.currentHandicap}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className={`font-semibold ${p.previewHcp !== null && p.previewHcp < p.currentHandicap ? "text-primary" : "text-destructive"}`}>
                          HCP {p.previewHcp ?? "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-3">
              {!history || history.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-xl text-muted-foreground">
                  No handicap adjustments recorded yet.
                </div>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="bg-card border border-border rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">Player {h.userId}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={h.isManual ? "secondary" : "outline"} className="text-xs">
                          {h.isManual ? "Manual" : "Auto"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">HCP {h.oldHandicap}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className={`font-semibold ${h.newHandicap < h.oldHandicap ? "text-primary" : "text-destructive"}`}>
                        HCP {h.newHandicap}
                      </span>
                      {h.roundScore !== null && (
                        <span className="text-muted-foreground ml-2">Score: {h.roundScore}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{h.reason}</p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
