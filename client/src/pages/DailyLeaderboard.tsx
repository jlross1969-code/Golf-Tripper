import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "wouter";
import {
  ArrowLeft, BarChart2, RefreshCw, Trophy, Users, Layers, Download,
  Target, Star, Share2, ChevronRight,
} from "lucide-react";
import AchievementAlert from "@/components/AchievementAlert";

// ─── Ambrose Daily Leaderboard ────────────────────────────────────────────────
function AmbroseLeaderboardTab({ roundId }: { roundId: number }) {
  const { data: leaderboard, isLoading } = trpc.ambrose.getLeaderboard.useQuery({ roundId }, { refetchInterval: 15000 });
  if (isLoading) return <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  if (!leaderboard || leaderboard.length === 0) {
    return <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">No Ambrose scores yet.</div>;
  }
  return (
    <div className="space-y-2">
      {leaderboard.map((team) => (
        <div key={team.groupId} className="bg-card border border-purple-800/40 rounded-xl px-4 py-3 flex items-center gap-4">
          <div className="w-8 flex-shrink-0 flex justify-center">
            {team.position === 1 ? <span className="text-yellow-400 font-bold text-lg">🥇</span>
              : team.position === 2 ? <span className="text-slate-300 font-bold text-lg">🥈</span>
              : team.position === 3 ? <span className="text-amber-600 font-bold text-lg">🥉</span>
              : <span className="text-muted-foreground font-semibold w-6 text-center">{team.position}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {team.teamEmoji && <span className="mr-1">{team.teamEmoji}</span>}
              {team.teamName}
            </p>
            <p className="text-xs text-muted-foreground">
              {team.players.map((p) => p.name.split(" ")[0]).join(" & ")} · {team.holesPlayed} holes
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground">{team.totalNet}</p>
            <p className="text-xs text-muted-foreground">Net ({team.totalStableford} pts)</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function positionBadge(pos: number) {
  if (pos === 1) return <span className="text-yellow-400 font-bold text-lg">🥇</span>;
  if (pos === 2) return <span className="text-slate-300 font-bold text-lg">🥈</span>;
  if (pos === 3) return <span className="text-amber-600 font-bold text-lg">🥉</span>;
  return <span className="text-muted-foreground font-semibold w-6 text-center">{pos}</span>;
}

function PlayerAvatar({ name, photoUrl }: { name: string | null; photoUrl?: string | null }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <Avatar className="w-8 h-8 flex-shrink-0">
      {photoUrl && <AvatarImage src={photoUrl} alt={name ?? ""} />}
      <AvatarFallback className="text-xs font-semibold bg-primary/20 text-primary">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

/** Returns a Tailwind class for the score cell background based on score vs par */
function scoreCellClass(gross: number | null, par: number | null): string {
  if (gross === null || par === null) return "text-muted-foreground/40";
  const diff = gross - par;
  if (diff <= -2) return "bg-yellow-400/20 text-yellow-300 font-bold"; // eagle or better
  if (diff === -1) return "bg-primary/20 text-primary font-semibold";  // birdie
  if (diff === 0) return "text-foreground";                             // par
  if (diff === 1) return "text-rose-400";                               // bogey
  return "text-rose-600 font-semibold";                                 // double+
}

// ─── Scorecard Drawer ─────────────────────────────────────────────────────────

interface ScorecardDrawerProps {
  open: boolean;
  onClose: () => void;
  roundId: number;
  userId: number;
  playerName: string | null;
  handicap: number;
  isStableford?: boolean;
}

function ScorecardDrawer({ open, onClose, roundId, userId, playerName, handicap, isStableford }: ScorecardDrawerProps) {
  const { data, isLoading } = trpc.scores.getPlayerScorecard.useQuery(
    { roundId, userId },
    { enabled: open && userId > 0 }
  );

  const front9 = data?.filter((r) => r.hole.holeNumber <= 9) ?? [];
  const back9 = data?.filter((r) => r.hole.holeNumber >= 10) ?? [];

  function sectionTotals(rows: typeof front9) {
    const played = rows.filter((r) => r.score !== null);
    return {
      gross: played.reduce((s, r) => s + (r.score?.grossScore ?? 0), 0),
      net: played.reduce((s, r) => s + (r.score?.netScore ?? 0), 0),
      pts: played.reduce((s, r) => s + (r.score?.stablefordPoints ?? 0), 0),
      par: rows.reduce((s, r) => s + (r.hole.par ?? 0), 0),
    };
  }

  const outTotals = sectionTotals(front9);
  const inTotals = sectionTotals(back9);
  const totalGross = outTotals.gross + inTotals.gross;
  const totalNet = outTotals.net + inTotals.net;
  const totalPts = outTotals.pts + inTotals.pts;
  const totalPar = outTotals.par + inTotals.par;
  const played = (data ?? []).filter((r) => r.score !== null);

  function ptsCellClass(pts: number | null): string {
    if (pts === null) return "text-muted-foreground/30";
    if (pts >= 4) return "text-yellow-300 font-bold"; // eagle or better
    if (pts === 3) return "text-primary font-semibold"; // birdie
    if (pts === 2) return "text-foreground"; // par
    if (pts === 1) return "text-rose-400"; // bogey
    return "text-rose-600 font-semibold"; // 0 pts
  }

  function renderHoleRow(row: (typeof front9)[0]) {
    const { hole, score } = row;
    const gross = score?.grossScore ?? null;
    const net = score?.netScore ?? null;
    const pts = score?.stablefordPoints ?? null;
    const capped = score?.mercyCapped ?? false;
    // How many strokes this player gets on this hole
    const strokesReceived = handicap > 0 ? Math.floor(handicap / 18) + (hole.strokeIndex <= (handicap % 18) ? 1 : 0) : 0;
    return (
      <tr key={hole.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
        <td className="px-3 py-2 font-semibold text-foreground text-center">{hole.holeNumber}</td>
        <td className="px-2 py-2 text-center text-muted-foreground">{hole.par}</td>
        <td className="px-2 py-2 text-center text-muted-foreground">{hole.strokeIndex}</td>
        <td className={`px-2 py-2 text-center rounded ${scoreCellClass(gross, hole.par)}`}>
          {gross !== null ? (
            <span className="inline-flex items-center gap-0.5">
              {gross}
              {capped && <span className="text-amber-400 font-bold text-[10px] leading-none" title="Mercy rule">M</span>}
            </span>
          ) : <span className="text-muted-foreground/30">—</span>}
        </td>
        {!isStableford && (
          <td className="px-2 py-2 text-center text-foreground/80">
            {net !== null ? (
              <span className="inline-flex items-center gap-0.5">
                {net}
                {strokesReceived > 0 && <span className="text-primary text-[9px] font-bold">{'·'.repeat(strokesReceived)}</span>}
              </span>
            ) : <span className="text-muted-foreground/30">—</span>}
          </td>
        )}
        <td className={`px-3 py-2 text-center font-semibold ${ptsCellClass(pts)}`}>
          {pts !== null ? pts : <span className="text-muted-foreground/30">—</span>}
        </td>
      </tr>
    );
  }

  function renderSectionHeader(label: string) {
    return (
      <tr className="bg-slate-800/60">
        <th className="text-left px-3 py-1.5 font-bold text-foreground text-xs uppercase tracking-wider">HOLE</th>
        <th className="text-center px-2 py-1.5 font-bold text-foreground text-xs">PAR</th>
        <th className="text-center px-2 py-1.5 font-bold text-foreground text-xs">SI</th>
        <th className="text-center px-2 py-1.5 font-bold text-foreground text-xs">STROKES</th>
        {!isStableford && <th className="text-center px-2 py-1.5 font-bold text-foreground text-xs">SCORE</th>}
        <th className="text-center px-3 py-1.5 font-bold text-foreground text-xs">SCORE</th>
      </tr>
    );
  }

  function renderSubtotalRow(label: string, totals: ReturnType<typeof sectionTotals>) {
    return (
      <tr className="border-t border-border bg-muted/40 font-semibold">
        <td className="px-3 py-2 text-foreground text-sm">{label}</td>
        <td className="px-2 py-2 text-center text-muted-foreground text-sm">{totals.par}</td>
        <td className="px-2 py-2" />
        <td className="px-2 py-2 text-center text-foreground text-sm">{totals.gross || "—"}</td>
        {!isStableford && <td className="px-2 py-2 text-center text-foreground text-sm">{totals.net || "—"}</td>}
        <td className="px-3 py-2 text-center text-primary text-sm">{totals.pts || "—"}</td>
      </tr>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl px-0">
        <SheetHeader className="px-5 pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            <span>{playerName ?? "Player"}</span>
            <Badge variant="secondary" className="text-xs font-normal">HCP {handicap}</Badge>
            {isStableford
              ? <Badge className="text-xs bg-primary/20 text-primary border-primary/30">Stableford</Badge>
              : <Badge variant="outline" className="text-xs">Nett Stroke Play</Badge>
            }
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="px-5 py-4 space-y-2">
            {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-8 w-full rounded" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">No scorecard data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {/* Front 9 */}
                {front9.length > 0 && (
                  <>
                    {renderSectionHeader("OUT")}
                    {front9.map(renderHoleRow)}
                    {renderSubtotalRow("OUT", outTotals)}
                  </>
                )}
                {/* Back 9 */}
                {back9.length > 0 && (
                  <>
                    {renderSectionHeader("IN")}
                    {back9.map(renderHoleRow)}
                    {renderSubtotalRow("IN", inTotals)}
                  </>
                )}
                {/* Grand total */}
                {played.length > 0 && (
                  <tr className="border-t-2 border-border bg-primary/10 font-bold">
                    <td className="px-3 py-3 text-foreground">TOTAL</td>
                    <td className="px-2 py-3 text-center text-muted-foreground">{totalPar}</td>
                    <td className="px-2 py-3" />
                    <td className="px-2 py-3 text-center text-foreground">{totalGross}</td>
                    {!isStableford && <td className="px-2 py-3 text-center text-foreground">{totalNet}</td>}
                    <td className="px-3 py-3 text-center text-primary text-base">{totalPts}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {played.length < (data?.length ?? 0) && (
              <p className="text-xs text-muted-foreground text-center py-3">
                {played.length} of {data?.length} holes played
              </p>
            )}
            {/* Legend */}
            <div className="flex items-center gap-4 px-4 py-3 border-t border-border flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Legend:</span>
              <span className="text-xs text-yellow-300 font-bold">Eagle−</span>
              <span className="text-xs text-primary font-semibold">Birdie</span>
              <span className="text-xs text-foreground">Par</span>
              <span className="text-xs text-rose-400">Bogey</span>
              <span className="text-xs text-rose-600 font-semibold">D.Bogey+</span>
              {!isStableford && <span className="text-xs text-muted-foreground">· = stroke received on hole</span>}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Award display ────────────────────────────────────────────────────────────

const POSITION_LABELS: Record<string, string> = {
  top1: "1st 🥇", top2: "2nd 🥈", top3: "3rd 🥉", top4: "4th", top5: "5th", last: "Last 🐢",
};
const POSITION_COLORS: Record<string, string> = {
  top1: "text-yellow-400 border-yellow-600/40 bg-yellow-900/20",
  top2: "text-slate-300 border-slate-500/40 bg-slate-800/30",
  top3: "text-amber-500 border-amber-700/40 bg-amber-900/20",
  top4: "text-blue-400 border-blue-700/40 bg-blue-900/20",
  top5: "text-blue-400 border-blue-700/40 bg-blue-900/20",
  last: "text-rose-400 border-rose-700/40 bg-rose-900/20",
};

function AwardDisplayCard({ award }: { award: { id: number; name: string; description: string | null; prize: string | null; category: string; position: string; scope: string; winner: { displayName: string | null } | null } }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
      <div className={`mt-0.5 px-2 py-1 rounded-lg border text-xs font-bold shrink-0 ${POSITION_COLORS[award.position] ?? ""}`}>
        {POSITION_LABELS[award.position] ?? award.position}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">{award.name}</span>
          <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">{award.category === "individual" ? "Individual" : "Team 4BBB"}</span>
        </div>
        {award.description && <p className="text-sm text-muted-foreground mt-0.5">{award.description}</p>}
        {award.prize && <p className="text-xs text-primary mt-1">🏆 Prize: {award.prize}</p>}
        {award.winner?.displayName ? (
          <p className="text-xs text-emerald-400 mt-1 font-semibold">✓ Winner: {award.winner.displayName}</p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1 italic">Winner not yet assigned</p>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DailyLeaderboard() {
  const { roundId } = useParams<{ roundId: string }>();
  const id = Number(roundId);

  const { data, isLoading, refetch, isFetching } = trpc.leaderboard.daily.useQuery(
    { roundId: id },
    { refetchInterval: 15000 }
  );
  const tripId = data?.round?.tripId ?? 0;
  const { data: awardsData } = trpc.awards.list.useQuery(
    { tripId },
    { enabled: tripId > 0, refetchInterval: 30000 }
  );
  const roundAwards = awardsData?.filter((a) => a.scope === "daily" && a.roundId === id) ?? [];
  const overallAwards = awardsData?.filter((a) => a.scope === "overall") ?? [];

  // Scorecard drawer state
  const [drawerPlayer, setDrawerPlayer] = useState<{
    userId: number;
    userName: string | null;
    handicap: number;
  } | null>(null);

  function openScorecard(userId: number, userName: string | null, handicap: number) {
    setDrawerPlayer({ userId, userName, handicap });
  }

  return (
    <div className="min-h-screen bg-background">
      {data && <AchievementAlert tripId={data.round.tripId} />}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <BarChart2 className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">Daily Leaderboard</h1>
            {data?.round && <p className="text-xs text-muted-foreground">{data.round.name}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/round/${id}/ntp`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Target className="w-3 h-3" />
              NTP
            </Button>
          </Link>
          <div className="flex gap-1">
            <a href={`/api/pdf/scorecard/${id}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Download className="w-3 h-3" />
                Scorecard
              </Button>
            </a>
            <a href={`/api/pdf/round-summary/${id}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Download className="w-3 h-3" />
                Summary
              </Button>
            </a>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Effective Baseline Info Bar */}
      {data?.trip && (
        <div className="border-b border-border bg-muted/30 px-6 py-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span>Mode: <span className="text-foreground font-medium">{(data as any).roundScoringMode === "net_stroke" ? "Net Stroke" : "Stableford"}</span></span>
          <span>Effective Baseline: <span className="text-primary font-semibold">{data.effectiveBaseline}</span></span>
          {(data.round as any).dailyAdjustment !== 0 && (
            <span className="text-amber-400">
              (trip {data.trip.handicapBaseline === 0 ? ((data as any).roundScoringMode === "net_stroke" ? 70 : 34) : data.trip.handicapBaseline}
              {" "}{(data.round as any).dailyAdjustment > 0 ? "+" : ""}{(data.round as any).dailyAdjustment} daily adj)
            </span>
          )}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : !data ? (
          <div className="text-center py-12 text-muted-foreground">Round not found.</div>
        ) : (
          <Tabs defaultValue={(data.round as any).ambroseEnabled ? "ambrose" : data.round.fourBBBEnabled ? "4bbb" : "stroke"}>
            <TabsList className="mb-6 w-full flex-wrap gap-1">
              {data.round.strokePlayEnabled && <TabsTrigger value="stroke" className="flex-1 gap-2"><Trophy className="w-4 h-4" />Stroke Play</TabsTrigger>}
              {data.round.fourBBBEnabled && <TabsTrigger value="4bbb" className="flex-1 gap-2"><Users className="w-4 h-4" />4BBB</TabsTrigger>}
              {(data.round as any).ambroseEnabled && <TabsTrigger value="ambrose" className="flex-1 gap-2">🏌️ Ambrose</TabsTrigger>}
              {data.round.skinsEnabled && <TabsTrigger value="skins" className="flex-1 gap-2"><Layers className="w-4 h-4" />Skins</TabsTrigger>}
              <TabsTrigger value="highlights" className="flex-1 gap-2"><Star className="w-4 h-4" />Highlights</TabsTrigger>
            </TabsList>

            {/* Stroke Play Tab */}
            {data.round.strokePlayEnabled && (
              <TabsContent value="stroke">
                <p className="text-xs text-muted-foreground mb-3 text-center">Tap a player to see their scorecard</p>
                <div className="space-y-2">
                  {data.strokePlay.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
                      No scores entered yet.
                    </div>
                  ) : (
                    data.strokePlay.map((p) => {
                      const ach = (p as any).achievements as { hio: number; eagle: number; birdie: number } | undefined;
                      return (
                        <button
                          key={p.userId}
                          type="button"
                          className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/50 hover:bg-accent transition-colors cursor-pointer active:scale-[0.99]"
                          onClick={() => openScorecard(p.userId, p.userName, p.handicap)}
                        >
                          <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(p.position)}</div>
                          <PlayerAvatar name={p.userName} photoUrl={(p as any).photoUrl} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-foreground truncate">{p.userName ?? "Unknown"}</p>
                              {ach && ach.hio > 0 && <span className="text-xs bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">🕳️ {ach.hio}</span>}
                              {ach && ach.eagle > 0 && <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold">🦥 {ach.eagle}</span>}
                              {ach && ach.birdie > 0 && <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">🐦 {ach.birdie}</span>}
                              {(p as any).hasMercyCappedScore && (
                                <span className="text-[10px] bg-amber-400/15 text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded-full font-semibold" title="One or more scores capped by mercy rule">M</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">HCP {p.handicap} · {p.holesPlayed} holes</p>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <div>
                              {(data as any)?.roundScoringMode !== "net_stroke" ? (
                                <>
                                  <p className="text-lg font-bold text-primary">{(p as any).totalStableford ?? 0} pts</p>
                                  <p className="text-xs text-muted-foreground">{p.totalGross} gross</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-lg font-bold text-foreground">{p.totalNet}</p>
                                  <p className="text-xs text-muted-foreground">Net ({p.totalGross} gross)</p>
                                </>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            )}

            {/* Ambrose Tab */}
            {(data.round as any).ambroseEnabled && (
              <TabsContent value="ambrose">
                <AmbroseLeaderboardTab roundId={data.round.id} />
              </TabsContent>
            )}

            {/* 4BBB Tab */}
            {data.round.fourBBBEnabled && (
              <TabsContent value="4bbb">
                <div className="space-y-2">
                  {data.fourBBB.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
                      No 4BBB scores yet.
                    </div>
                  ) : (
                    data.fourBBB.map((t) => (
                      <div key={t.teamName} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4">
                        <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(t.position)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{t.teamName}</p>
                          <p className="text-xs text-muted-foreground">{t.holesPlayed} holes played</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{t.totalBestBall}</p>
                          <p className="text-xs text-muted-foreground">Best Ball Net</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            )}

            {/* Skins Tab */}
            {data.round.skinsEnabled && (
              <TabsContent value="skins">
                <div className="space-y-2">
                  {data.skins.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
                      No skins won yet.
                    </div>
                  ) : (
                    data.skins.map((s, i) => (
                      <div key={s.userId} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                        <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(i + 1)}</div>
                        <PlayerAvatar name={s.userName} photoUrl={null} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{s.userName ?? "Unknown"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{s.skinsWon}</p>
                          <p className="text-xs text-muted-foreground">Skins</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            )}

            {/* Highlights Tab */}
            <TabsContent value="highlights">
              <div className="space-y-6">
                {/* Share Button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      const top3 = data.strokePlay.slice(0, 3);
                      const pairs = data.fourBBB.slice(0, 3);
                      const medals = ["🥇", "🥈", "🥉"];
                      let text = `🏌️ ${data.round.name} — Highlights\n\n`;
                      text += "🏆 Top 3 Individual:\n";
                      top3.forEach((p, i) => {
                        text += `${medals[i]} ${p.userName ?? "Unknown"} — ${p.totalNet} net\n`;
                      });
                      if (data.round.fourBBBEnabled && pairs.length > 0) {
                        text += "\n🧑‍🤝‍🧑 Top 3 Pairs (4BBB):\n";
                        pairs.forEach((t, i) => {
                          text += `${medals[i]} ${t.teamName} — ${t.totalBestBall} best ball\n`;
                        });
                      }
                      if (navigator.share) {
                        navigator.share({ title: `${data.round.name} Highlights`, text });
                      } else {
                        navigator.clipboard.writeText(text).then(() => {
                          alert("Results copied to clipboard!");
                        });
                      }
                    }}
                  >
                    <Share2 className="w-3 h-3" />
                    Share
                  </Button>
                </div>

                {/* Top 3 Individual */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" /> Top 3 Individual
                  </h3>
                  {data.strokePlay.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground bg-card border border-border rounded-xl text-sm">
                      No individual scores yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.strokePlay.slice(0, 3).map((p) => (
                        <button
                          key={p.userId}
                          type="button"
                          className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/50 hover:bg-accent transition-colors cursor-pointer"
                          onClick={() => openScorecard(p.userId, p.userName, p.handicap)}
                        >
                          <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(p.position)}</div>
                          <PlayerAvatar name={p.userName} photoUrl={(p as any).photoUrl} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{p.userName ?? "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">HCP {p.handicap} · {p.holesPlayed} holes</p>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <div>
                              {(data as any)?.roundScoringMode !== "net_stroke" ? (
                                <>
                                  <p className="text-lg font-bold text-primary">{(p as any).totalStableford ?? 0} pts</p>
                                  <p className="text-xs text-muted-foreground">{p.totalGross} gross</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-lg font-bold text-foreground">{p.totalNet}</p>
                                  <p className="text-xs text-muted-foreground">Net ({p.totalGross} gross)</p>
                                </>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top 3 4BBB Pairs */}
                {data.round.fourBBBEnabled && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" /> Top 3 Pairs (4BBB)
                    </h3>
                    {data.fourBBB.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground bg-card border border-border rounded-xl text-sm">
                        No 4BBB pairs scored yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data.fourBBB.slice(0, 3).map((t) => (
                          <div key={t.teamName} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4">
                            <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(t.position)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate">{t.teamName}</p>
                              <p className="text-xs text-muted-foreground">{t.holesPlayed} holes played</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-foreground">{t.totalBestBall}</p>
                              <p className="text-xs text-muted-foreground">Best Ball Net</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!data.round.fourBBBEnabled && (
                  <p className="text-xs text-muted-foreground text-center">
                    4BBB not enabled for this round.
                  </p>
                )}

                {/* Daily Custom Awards */}
                {roundAwards.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-400" /> Round Awards
                    </h3>
                    <div className="space-y-2">
                      {roundAwards.map((award) => (
                        <AwardDisplayCard key={award.id} award={award as any} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Overall Trip Awards */}
                {overallAwards.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" /> Trip Awards
                    </h3>
                    <div className="space-y-2">
                      {overallAwards.map((award) => (
                        <AwardDisplayCard key={award.id} award={award as any} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

          </Tabs>
        )}
      </div>

      {/* Scorecard Drawer */}
      {drawerPlayer && (
        <ScorecardDrawer
          open={drawerPlayer !== null}
          onClose={() => setDrawerPlayer(null)}
          roundId={id}
          userId={drawerPlayer.userId}
          playerName={drawerPlayer.userName}
          handicap={drawerPlayer.handicap}
          isStableford={(data as any)?.roundScoringMode !== "net_stroke"}
        />
      )}
    </div>
  );
}
