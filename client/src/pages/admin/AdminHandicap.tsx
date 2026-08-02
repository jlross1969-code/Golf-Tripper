import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useParams } from "wouter";
import { ArrowLeft, BarChart2, Save, History, AlertTriangle, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { calculateNewHandicap } from "../../../../shared/scoring";

export default function AdminHandicap() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);

  const { data: trip, refetch: refetchTrip } = trpc.trips.get.useQuery({ id });
  const { data: players } = trpc.players.tripPlayers.useQuery({ tripId: id });
  const { data: history } = trpc.handicap.history.useQuery({ tripId: id });
  const { data: rounds } = trpc.rounds.list.useQuery({ tripId: id });

  const [baseline, setBaseline] = useState("");
  const [factor, setFactor] = useState("");
  const [autoAdjust, setAutoAdjust] = useState(true);
  const [mode, setMode] = useState<"stableford" | "net_stroke">("stableford");

  // Per-round daily adjustment state: roundId → adjustment string
  const [dailyAdjs, setDailyAdjs] = useState<Record<number, string>>({});

  // Sensible defaults per mode
  const DEFAULT_BASELINE: Record<"stableford" | "net_stroke", number> = { stableford: 34, net_stroke: 70 };

  useEffect(() => {
    if (trip) {
      const storedBaseline = trip.handicapBaseline;
      const storedMode = trip.handicapMode as "stableford" | "net_stroke";
      const effectiveBaseline = storedBaseline === 0 ? DEFAULT_BASELINE[storedMode] : storedBaseline;
      setBaseline(effectiveBaseline.toString());
      setFactor(trip.handicapFactor.toString());
      setAutoAdjust(trip.handicapAutoAdjust);
      setMode(storedMode);
    }
  }, [trip]);

  // Initialise per-round daily adjustment inputs from fetched rounds
  useEffect(() => {
    if (rounds) {
      const init: Record<number, string> = {};
      for (const r of rounds) {
        init[r.id] = ((r as any).dailyAdjustment ?? 0).toString();
      }
      setDailyAdjs(init);
    }
  }, [rounds]);

  const handleModeChange = (newMode: "stableford" | "net_stroke") => {
    const currentBaseline = parseFloat(baseline);
    const oldDefault = DEFAULT_BASELINE[mode];
    if (isNaN(currentBaseline) || currentBaseline === oldDefault) {
      setBaseline(DEFAULT_BASELINE[newMode].toString());
    }
    setMode(newMode);
  };

  const updateTrip = trpc.trips.update.useMutation({
    onSuccess: () => { toast.success("Handicap settings saved"); refetchTrip(); },
    onError: (e) => toast.error(e.message),
  });

  const updateRound = trpc.rounds.update.useMutation({
    onSuccess: () => toast.success("Daily adjustment saved"),
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

  // Build a userId → player name map for the history tab
  const playerNameMap = new Map<number, string>();
  if (players) {
    for (const p of players) {
      playerNameMap.set(p.userId, p.nickname ?? p.user?.name ?? `Player ${p.userId}`);
    }
  }

  // Build a roundId → round name map for the history tab
  const roundNameMap = new Map<number, string>();
  if (rounds) {
    for (const r of rounds) roundNameMap.set(r.id, r.name);
  }

  const baselineIsUnconfigured = !trip || trip.handicapBaseline === 0;

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
            <TabsTrigger value="rounds" className="flex-1">Daily Adjustments</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-2"><History className="w-4 h-4" />History</TabsTrigger>
          </TabsList>

          {/* ── Settings Tab ── */}
          <TabsContent value="settings" className="space-y-6">
            {/* Validation note for unconfigured trips */}
            {baselineIsUnconfigured && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-300">Baseline not configured</p>
                  <p className="text-amber-300/80 mt-0.5">
                    This trip's baseline is set to 0. Handicap adjustments will not work correctly until you save a baseline below.
                    Defaults are <strong>34 pts</strong> for Stableford and <strong>70 strokes</strong> for Net Stroke.
                  </p>
                </div>
              </div>
            )}

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
                      onClick={() => handleModeChange(m)}
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
                  <Input
                    type="number"
                    value={baseline}
                    onChange={(e) => setBaseline(e.target.value)}
                    placeholder={mode === "stableford" ? "e.g. 34" : "e.g. 70"}
                  />
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
                      <span className="text-foreground">{p.nickname ?? p.user?.name ?? `Player ${p.userId}`}</span>
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

          {/* ── Daily Adjustments Tab ── */}
          <TabsContent value="rounds" className="space-y-4">
            <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-sm">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="text-muted-foreground">
                <p className="font-medium text-foreground">Daily Adjustment</p>
                <p className="mt-0.5">
                  Shift the effective baseline for a specific round. Use a <strong className="text-foreground">positive value</strong> for a harder course
                  (raises the baseline so players aren't penalised as much) or a <strong className="text-foreground">negative value</strong> for an easier course.
                  The formula uses <code className="text-primary">trip baseline + daily adjustment</code> as the effective baseline for that round.
                </p>
              </div>
            </div>

            {!rounds || rounds.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-xl text-muted-foreground">
                No rounds scheduled yet.
              </div>
            ) : (
              rounds.map((round) => {
                const adjStr = dailyAdjs[round.id] ?? "0";
                const adjNum = parseFloat(adjStr);
                const effectiveBaseline = isNaN(baselineNum) ? "—" : (baselineNum + (isNaN(adjNum) ? 0 : adjNum)).toFixed(1);
                return (
                  <div key={round.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{round.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(round.roundDate).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={round.status === "active" ? "default" : round.status === "completed" ? "secondary" : "outline"}>
                        {round.status}
                      </Badge>
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Daily Adjustment ({mode === "stableford" ? "pts" : "strokes"})
                        </label>
                        <Input
                          type="number"
                          step="0.5"
                          value={adjStr}
                          onChange={(e) => setDailyAdjs((prev) => ({ ...prev, [round.id]: e.target.value }))}
                          placeholder="0"
                          className="w-full"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground pb-2 whitespace-nowrap">
                        Effective baseline: <span className="text-foreground font-medium">{effectiveBaseline}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updateRound.isPending}
                        onClick={() => updateRound.mutate({ id: round.id, dailyAdjustment: isNaN(adjNum) ? 0 : adjNum })}
                      >
                        <Save className="w-3 h-3 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* ── History Tab ── */}
          <TabsContent value="history">
            {/* Active baseline summary */}
            {trip && (
              <div className="bg-card border border-border rounded-xl px-4 py-3 mb-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Active baseline:</span>
                  <span className="font-semibold text-foreground">
                    {trip.handicapBaseline === 0
                      ? `${DEFAULT_BASELINE[trip.handicapMode as "stableford" | "net_stroke"]} (default)`
                      : trip.handicapBaseline}
                    {" "}{trip.handicapMode === "stableford" ? "pts" : "strokes"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Mode:</span>
                  <Badge variant="outline" className="text-xs">{trip.handicapMode === "stableford" ? "Stableford" : "Net Stroke"}</Badge>
                  <span className="text-muted-foreground">Factor:</span>
                  <span className="font-medium text-foreground">{trip.handicapFactor}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {!history || history.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-xl text-muted-foreground">
                  No handicap adjustments recorded yet.
                </div>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="bg-card border border-border rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">
                        {playerNameMap.get(h.userId) ?? `Player ${h.userId}`}
                      </span>
                      <div className="flex items-center gap-2">
                        {h.roundId && roundNameMap.has(h.roundId) && (
                          <span className="text-xs text-muted-foreground">{roundNameMap.get(h.roundId)}</span>
                        )}
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
