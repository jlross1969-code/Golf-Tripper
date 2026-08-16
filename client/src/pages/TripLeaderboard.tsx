import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "wouter";
import { ArrowLeft, Trophy, RefreshCw, ChevronDown, ChevronUp, Download, Star, Users, Share2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

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

function PlayerRow({ player, mode, onScorecardClick }: { player: any; mode: "stroke" | "stableford"; onScorecardClick?: (p: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const score = mode === "stroke" ? player.cumulativeNet : player.cumulativeStableford;
  const scoreLabel = mode === "stroke" ? "Net" : "Pts";
  const ach = player.achievements as { hio: number; eagle: number; birdie: number } | undefined;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(player.position)}</div>
        <PlayerAvatar name={player.userName} photoUrl={player.photoUrl} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              className="font-semibold text-foreground truncate hover:text-primary hover:underline text-left"
              onClick={(e) => { e.stopPropagation(); onScorecardClick?.(player); }}
            >
              {player.userName ?? "Unknown"}
            </button>
            {ach && ach.hio > 0 && <span className="text-xs bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">🕳️ {ach.hio}</span>}
            {ach && ach.eagle > 0 && <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold">🦅 {ach.eagle}</span>}
            {ach && ach.birdie > 0 && <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">🐦 {ach.birdie}</span>}
          </div>
          <p className="text-xs text-muted-foreground">{player.rounds.length} rounds · <span className="text-primary/70 text-xs">tap name for scorecard</span></p>
        </div>
        <div className="text-right mr-2">
          <p className="text-lg font-bold text-foreground">{score}</p>
          <p className="text-xs text-muted-foreground">{scoreLabel}</p>
        </div>
        {player.rounds.length > 0 && (
          expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> :
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </div>
      {expanded && player.rounds.length > 0 && (
        <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-1">
          {player.rounds.map((r: any) => (
            <div key={r.roundId} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{r.roundName}</span>
              <div className="flex gap-4">
                <span className="text-foreground">{r.totalNet} net</span>
                <span className="text-primary">{r.totalStableford} pts</span>
                <span className="text-muted-foreground">{r.holesPlayed}H</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const POSITION_LABELS_TL: Record<string, string> = {
  top1: "1st 🥇", top2: "2nd 🥈", top3: "3rd 🥉", top4: "4th", top5: "5th", last: "Last 🐢",
};
const POSITION_COLORS_TL: Record<string, string> = {
  top1: "text-yellow-400 border-yellow-600/40 bg-yellow-900/20",
  top2: "text-slate-300 border-slate-500/40 bg-slate-800/30",
  top3: "text-amber-500 border-amber-700/40 bg-amber-900/20",
  top4: "text-blue-400 border-blue-700/40 bg-blue-900/20",
  top5: "text-blue-400 border-blue-700/40 bg-blue-900/20",
  last: "text-rose-400 border-rose-700/40 bg-rose-900/20",
};

function TripAwardCard({ award }: { award: { id: number; name: string; description: string | null; prize: string | null; category: string; position: string; winner: { displayName: string | null } | null } }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
      <div className={`mt-0.5 px-2 py-1 rounded-lg border text-xs font-bold shrink-0 ${POSITION_COLORS_TL[award.position] ?? ""}`}>
        {POSITION_LABELS_TL[award.position] ?? award.position}
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

// ─── Trip Scorecard Drawer ────────────────────────────────────────────────────
function TripScorecardDrawer({
  open, onClose, player, isStableford,
}: {
  open: boolean;
  onClose: () => void;
  player: { userId: number; userName: string | null; currentHandicap: number; rounds: { roundId: number; roundName: string }[] } | null;
  isStableford: boolean;
}) {
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const roundId = selectedRoundId ?? (player?.rounds[0]?.roundId ?? 0);
  const { data, isLoading } = trpc.scores.getPlayerScorecard.useQuery(
    { roundId, userId: player?.userId ?? 0 },
    { enabled: open && !!player && roundId > 0 }
  );

  if (!player) return null;

  const handicap = player.currentHandicap;
  const played = (data ?? []).filter((h) => h.score !== null);
  const front9 = played.filter((h) => h.hole.holeNumber <= 9);
  const back9 = played.filter((h) => h.hole.holeNumber >= 10);

  function strokesReceived(si: number): number {
    const h = Math.floor(handicap);
    const extra = handicap - h;
    if (si <= h) return 1;
    if (extra >= 0.5 && si === h + 1) return 1;
    return 0;
  }

  function sectionTotals(rows: typeof played) {
    return rows.reduce(
      (acc, h) => ({
        par: acc.par + h.hole.par,
        gross: acc.gross + (h.score?.grossScore ?? 0),
        net: acc.net + (h.score?.netScore ?? 0),
        pts: acc.pts + (h.score?.stablefordPoints ?? 0),
      }),
      { par: 0, gross: 0, net: 0, pts: 0 }
    );
  }

  function grossClass(gross: number, par: number): string {
    const diff = gross - par;
    if (diff <= -2) return "text-yellow-300 font-bold";
    if (diff === -1) return "text-primary font-semibold";
    if (diff === 0) return "text-foreground";
    if (diff === 1) return "text-rose-400";
    return "text-rose-600 font-semibold";
  }

  function renderHoleRow(h: typeof played[0]) {
    const si = h.hole.strokeIndex ?? 18;
    const strokes = strokesReceived(si);
    const gross = h.score?.grossScore ?? 0;
    const net = h.score?.netScore ?? 0;
    const pts = h.score?.stablefordPoints ?? 0;
    return (
      <tr key={h.hole.id} className="border-b border-border/40 hover:bg-muted/20">
        <td className="px-3 py-2 text-foreground">{h.hole.holeNumber}</td>
        <td className="px-2 py-2 text-center text-muted-foreground">{h.hole.par}</td>
        <td className="px-2 py-2 text-center text-muted-foreground text-xs">{si}</td>
        <td className={`px-2 py-2 text-center ${grossClass(gross, h.hole.par)}`}>{gross || "—"}</td>
        {!isStableford && (
          <td className="px-2 py-2 text-center text-foreground text-sm">
            {net || "—"}{strokes > 0 ? <span className="text-primary text-xs ml-0.5">{"·".repeat(strokes)}</span> : null}
          </td>
        )}
        <td className={`px-3 py-2 text-center font-semibold ${pts >= 3 ? "text-yellow-300" : pts === 2 ? "text-primary" : pts === 1 ? "text-foreground" : "text-rose-400"}`}>{pts}</td>
      </tr>
    );
  }

  function renderHeader() {
    return (
      <tr className="bg-slate-800/60">
        <th className="text-left px-3 py-1.5 font-bold text-foreground text-xs uppercase tracking-wider">HOLE</th>
        <th className="text-center px-2 py-1.5 font-bold text-foreground text-xs">PAR</th>
        <th className="text-center px-2 py-1.5 font-bold text-foreground text-xs">SI</th>
        <th className="text-center px-2 py-1.5 font-bold text-foreground text-xs">STROKES</th>
        {!isStableford && <th className="text-center px-2 py-1.5 font-bold text-foreground text-xs">NET</th>}
        <th className="text-center px-3 py-1.5 font-bold text-foreground text-xs">{isStableford ? "PTS" : "PTS"}</th>
      </tr>
    );
  }

  function renderSubtotal(label: string, rows: typeof played) {
    const t = sectionTotals(rows);
    return (
      <tr className="border-t border-border bg-muted/40 font-semibold">
        <td className="px-3 py-2 text-foreground text-sm">{label}</td>
        <td className="px-2 py-2 text-center text-muted-foreground text-sm">{t.par}</td>
        <td className="px-2 py-2" />
        <td className="px-2 py-2 text-center text-foreground text-sm">{t.gross || "—"}</td>
        {!isStableford && <td className="px-2 py-2 text-center text-foreground text-sm">{t.net || "—"}</td>}
        <td className="px-3 py-2 text-center text-primary text-sm">{t.pts || "—"}</td>
      </tr>
    );
  }

  const outTotals = sectionTotals(front9);
  const inTotals = sectionTotals(back9);
  const allTotals = sectionTotals(played);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl px-0">
        <SheetHeader className="px-5 pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            <span>{player.userName ?? "Player"}</span>
            <Badge variant="secondary" className="text-xs font-normal">HCP {handicap}</Badge>
            {isStableford
              ? <Badge className="text-xs bg-primary/20 text-primary border-primary/30">Stableford</Badge>
              : <Badge variant="outline" className="text-xs">Nett Stroke Play</Badge>
            }
          </SheetTitle>
          {player.rounds.length > 1 && (
            <div className="mt-2">
              <Select
                value={String(roundId)}
                onValueChange={(v) => setSelectedRoundId(Number(v))}
              >
                <SelectTrigger className="w-full text-sm h-8">
                  <SelectValue placeholder="Select round" />
                </SelectTrigger>
                <SelectContent>
                  {player.rounds.map((r) => (
                    <SelectItem key={r.roundId} value={String(r.roundId)}>{r.roundName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
                {front9.length > 0 && <>{renderHeader()}{front9.map(renderHoleRow)}{renderSubtotal("OUT", front9)}</>}
                {back9.length > 0 && <>{renderHeader()}{back9.map(renderHoleRow)}{renderSubtotal("IN", back9)}</>}
                {played.length > 0 && (
                  <tr className="border-t-2 border-border bg-primary/10 font-bold">
                    <td className="px-3 py-3 text-foreground">TOTAL</td>
                    <td className="px-2 py-3 text-center text-muted-foreground">{allTotals.par}</td>
                    <td className="px-2 py-3" />
                    <td className="px-2 py-3 text-center text-foreground">{allTotals.gross}</td>
                    {!isStableford && <td className="px-2 py-3 text-center text-foreground">{allTotals.net}</td>}
                    <td className="px-3 py-3 text-center text-primary text-base">{allTotals.pts}</td>
                  </tr>
                )}
              </tbody>
            </table>
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

function FourBBBPairScorecardDrawer({
  open,
  onClose,
  pair,
}: {
  open: boolean;
  onClose: () => void;
  pair: {
    player1Id: number;
    player2Id: number;
    player1Name: string;
    player2Name: string;
    rounds: { roundId: number; roundName: string; totalBestBall: number; holesPlayed: number }[];
  } | null;
}) {
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const roundId = selectedRoundId ?? pair?.rounds[0]?.roundId ?? 0;
  const { data, isLoading } = trpc.leaderboard.fourBBBPairScorecard.useQuery(
    { roundId, player1Id: pair?.player1Id ?? 0, player2Id: pair?.player2Id ?? 0 },
    { enabled: open && !!pair && roundId > 0 }
  );

  if (!pair) return null;

  const sectionTotals = (rows: any[]) => rows.reduce((total, row) => ({
    p1Gross: total.p1Gross + (row.player1Score?.grossScore ?? 0),
    p2Gross: total.p2Gross + (row.player2Score?.grossScore ?? 0),
    bestNet: total.bestNet + (row.bestBallNet ?? 0),
    holesPlayed: total.holesPlayed + (row.bestBallNet === null ? 0 : 1),
  }), { p1Gross: 0, p2Gross: 0, bestNet: 0, holesPlayed: 0 });

  const front9 = data?.holes.filter((row) => row.hole.holeNumber <= 9) ?? [];
  const back9 = data?.holes.filter((row) => row.hole.holeNumber >= 10) ?? [];
  const out = sectionTotals(front9);
  const inn = sectionTotals(back9);
  const total = sectionTotals(data?.holes ?? []);

  const summaryRow = (label: string, values: ReturnType<typeof sectionTotals>, emphasized = false) => (
    <tr className={`border-t border-border font-semibold ${emphasized ? "bg-primary/10" : "bg-muted/40"}`}>
      <td colSpan={2} className="px-3 py-2 text-foreground">{label}</td>
      <td className="px-2 py-2 text-center text-foreground">{values.p1Gross || "—"}</td>
      <td className="px-2 py-2 text-center text-foreground" />
      <td className="px-2 py-2 text-center text-foreground">{values.p2Gross || "—"}</td>
      <td className="px-2 py-2 text-center text-foreground" />
      <td className="px-3 py-2 text-center text-primary">{values.bestNet || "—"}</td>
    </tr>
  );

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-0">
        <SheetHeader className="px-5 pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            <Users className="w-5 h-5 text-primary" />
            <span>{pair.player1Name} & {pair.player2Name}</span>
            <Badge className="text-xs bg-primary/15 text-primary border border-primary/25">4BBB best ball</Badge>
          </SheetTitle>
          <p className="text-xs text-muted-foreground mt-1">Tap a round to view each score and the counting net score on every hole.</p>
          {pair.rounds.length > 1 && (
            <Select value={String(roundId)} onValueChange={(value) => setSelectedRoundId(Number(value))}>
              <SelectTrigger className="w-full text-sm h-8 mt-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pair.rounds.map((round) => <SelectItem key={round.roundId} value={String(round.roundId)}>{round.roundName} · {round.totalBestBall} net</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </SheetHeader>
        {isLoading ? (
          <div className="px-5 py-5 space-y-2">{[...Array(9)].map((_, index) => <Skeleton key={index} className="h-9 w-full rounded" />)}</div>
        ) : !data ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">No 4BBB scorecard data is available for this round.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[630px] text-sm">
              <thead className="bg-slate-800/70 text-xs">
                <tr>
                  <th className="px-3 py-2 text-left text-foreground">Hole</th>
                  <th className="px-2 py-2 text-center text-foreground">Par</th>
                  <th className="px-2 py-2 text-center text-sky-300">{data.player1.userName.split(" ")[0]}</th>
                  <th className="px-2 py-2 text-center text-muted-foreground">Net</th>
                  <th className="px-2 py-2 text-center text-emerald-300">{data.player2.userName.split(" ")[0]}</th>
                  <th className="px-2 py-2 text-center text-muted-foreground">Net</th>
                  <th className="px-3 py-2 text-center text-primary">Best Net</th>
                </tr>
              </thead>
              <tbody>
                {data.holes.map((row) => {
                  const p1Counting = row.countingPlayerId === data.player1.userId || row.countingPlayerId === null && row.bestBallNet !== null && row.player1Score?.netScore === row.bestBallNet;
                  const p2Counting = row.countingPlayerId === data.player2.userId || row.countingPlayerId === null && row.bestBallNet !== null && row.player2Score?.netScore === row.bestBallNet;
                  return (
                    <tr key={row.hole.id} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="px-3 py-2 text-foreground font-medium">{row.hole.holeNumber}</td>
                      <td className="px-2 py-2 text-center text-muted-foreground">{row.hole.par}</td>
                      <td className={`px-2 py-2 text-center font-semibold ${p1Counting ? "bg-sky-500/20 text-sky-300" : "text-foreground"}`}>{row.player1Score?.grossScore ?? "—"}</td>
                      <td className={`px-2 py-2 text-center ${p1Counting ? "text-sky-300 font-bold" : "text-muted-foreground"}`}>{row.player1Score?.netScore ?? "—"}</td>
                      <td className={`px-2 py-2 text-center font-semibold ${p2Counting ? "bg-emerald-500/20 text-emerald-300" : "text-foreground"}`}>{row.player2Score?.grossScore ?? "—"}</td>
                      <td className={`px-2 py-2 text-center ${p2Counting ? "text-emerald-300 font-bold" : "text-muted-foreground"}`}>{row.player2Score?.netScore ?? "—"}</td>
                      <td className="px-3 py-2 text-center font-bold text-primary">{row.bestBallNet ?? "—"}</td>
                    </tr>
                  );
                })}
                {summaryRow("OUT", out)}
                {summaryRow("IN", inn)}
                {summaryRow("TOTAL", total, true)}
              </tbody>
            </table>
            <p className="px-5 py-3 text-xs text-muted-foreground border-t border-border">Highlighted player cells supplied the counting score. When both nets match, both scores count.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function TripLeaderboard() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const [drawerPlayer, setDrawerPlayer] = useState<{
    userId: number;
    userName: string | null;
    currentHandicap: number;
    rounds: { roundId: number; roundName: string }[];
  } | null>(null);
  const [drawerPair, setDrawerPair] = useState<{
    player1Id: number;
    player2Id: number;
    player1Name: string;
    player2Name: string;
    rounds: { roundId: number; roundName: string; totalBestBall: number; holesPlayed: number }[];
  } | null>(null);

  const { data: trip } = trpc.trips.get.useQuery({ id });
  const { data: awardsData } = trpc.awards.list.useQuery({ tripId: id }, { refetchInterval: 60000 });
  const overallAwards = awardsData?.filter((a) => a.scope === "overall") ?? [];
  const { data, isLoading, refetch, isFetching } = trpc.leaderboard.trip.useQuery(
    { tripId: id },
    { refetchInterval: 30000 }
  );
  const isStableford = (data as any)?.individualScoringMode === "stableford";
  const tournamentType = (data as any)?.tournamentType ?? (trip as any)?.tournamentType ?? "stableford";
  const isMatchPlayTrip = tournamentType === "matchplay";
  const pennantLeaderboard: any[] = (data as any)?.pennantLeaderboard ?? [];
  const hasMatchPlayRound = (data as any)?.hasMatchPlayRound ?? false;
  const openPairScorecard = (team: any) => {
    const [player1Id, player2Id] = String(team.teamKey).split("-").map(Number);
    if (!player1Id || !player2Id || !team.rounds?.length) return;
    setDrawerPair({
      player1Id,
      player2Id,
      player1Name: team.player1Name,
      player2Name: team.player2Name,
      rounds: team.rounds,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/trip/${id}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <Trophy className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">Trip Leaderboard</h1>
            {trip && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{trip.name}</p>
                {(trip as any).tournamentType && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                    {{
                      stableford: "Stableford",
                      stableford_4bbb: "Stableford + 4BBB",
                      stroke: "Stroke Play",
                      stroke_4bbb: "Stroke + 4BBB",
                      matchplay: "Match Play",
                      ambrose: "Ambrose",
                      alternate_shot: "Alternate Shot",
                    }[(trip as any).tournamentType as string] ?? "Stableford"}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`/api/pdf/trip-results/${id}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-3 h-3" />
              PDF
            </Button>
          </a>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : !data ? (
          <div className="text-center py-12 text-muted-foreground">No leaderboard data.</div>
        ) : (
          <Tabs defaultValue={
            isMatchPlayTrip && hasMatchPlayRound ? "pennant"
            : (data as any).hasAmbroseRound ? "ambrose"
            : tournamentType === "stableford" || tournamentType === "stableford_4bbb" ? "stableford"
            : (data as any).hasFourBBBRound ? "4bbb"
            : "stroke"
          }>
            <TabsList className="mb-6 w-full flex-wrap gap-1">
              {isMatchPlayTrip && hasMatchPlayRound && (
                <TabsTrigger value="pennant" className="flex-1 gap-2">🏆 Match Play</TabsTrigger>
              )}
              <TabsTrigger value="stroke" className="flex-1 gap-2"><Trophy className="w-4 h-4" />Net Stroke</TabsTrigger>
              <TabsTrigger value="stableford" className="flex-1 gap-2">⭐ Stableford</TabsTrigger>
              <TabsTrigger value="bestday" className="flex-1 gap-2">🌟 Best Day</TabsTrigger>
              {(data as any).hasFourBBBRound && <TabsTrigger value="4bbb" className="flex-1 gap-2"><Users className="w-4 h-4" />4BBB</TabsTrigger>}
              {(data as any).hasAmbroseRound && <TabsTrigger value="ambrose" className="flex-1 gap-2">🏌️ Ambrose</TabsTrigger>}
              <TabsTrigger value="highlights" className="flex-1 gap-2"><Star className="w-4 h-4" />Highlights</TabsTrigger>
            </TabsList>

            <TabsContent value="stroke">
              <div className="space-y-2">
                {data.strokePlay.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
                    No scores yet.
                  </div>
                ) : (
                  data.strokePlay.map((p) => (
                    <PlayerRow key={p.userId} player={p} mode="stroke" onScorecardClick={setDrawerPlayer} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="stableford">
              <div className="space-y-2">
                {data.stableford.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
                    No scores yet.
                  </div>
                ) : (
                  data.stableford.map((p) => (
                    <PlayerRow key={p.userId} player={p} mode="stableford" onScorecardClick={setDrawerPlayer} />
                  ))
                )}
              </div>
            </TabsContent>
            {/* Best Day Tab */}
            <TabsContent value="bestday">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center mb-3">Each player's single best round of the trip</p>
                {((data as any).bestDayStableford ?? []).length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">No scores yet.</div>
                ) : (
                  ((data as any).bestDayStableford ?? []).map((p: any) => (
                    <div
                      key={p.userId}
                      className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors active:scale-[0.98]"
                      onClick={() => setDrawerPlayer({ userId: p.userId, userName: p.userName, currentHandicap: p.currentHandicap ?? 0, rounds: p.rounds })}
                    >
                      <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(p.position)}</div>
                      <PlayerAvatar name={p.userName} photoUrl={p.photoUrl} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{p.userName ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{p.rounds.length} rounds played</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{p.bestDayStableford}</p>
                        <p className="text-xs text-muted-foreground">Best Day pts</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* 4BBB Trip Tab */}
            {(data as any).hasFourBBBRound && (
              <TabsContent value="4bbb">
                <div className="space-y-2">
                  {data.fourBBB.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">No 4BBB data yet.</div>
                  ) : (
                    data.fourBBB.map((t) => (
                      <button key={t.teamKey} type="button" onClick={() => openPairScorecard(t)} className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors active:scale-[0.98]">
                        <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(t.position)}</div>
                        <div className="flex -space-x-2 flex-shrink-0">
                          <PlayerAvatar name={t.player1Name} photoUrl={t.player1PhotoUrl} />
                          <PlayerAvatar name={t.player2Name} photoUrl={t.player2PhotoUrl} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{t.player1Name} & {t.player2Name}</p>
                          <p className="text-xs text-muted-foreground">{t.roundsPlayed} round{t.roundsPlayed !== 1 ? "s" : ""} · tap for hole scores</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{t.cumulativeBestBall}</p>
                          <p className="text-xs text-muted-foreground">Best Ball Net</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </TabsContent>
            )}

            {/* Match Play Pennant Trip Tab */}
            {isMatchPlayTrip && hasMatchPlayRound && (
              <TabsContent value="pennant">
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    Pennant team standings across all match play rounds. Points: Win = 1, Half = 0.5, Loss = 0.
                  </p>
                  {pennantLeaderboard.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
                      No match play results yet.
                    </div>
                  ) : (
                    pennantLeaderboard.map((t: any) => (
                      <div key={t.teamName} className="bg-card border border-blue-800/40 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(t.position)}</div>
                          <div className="text-2xl flex-shrink-0">{t.teamEmoji}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">{t.teamName}</p>
                            <p className="text-xs text-muted-foreground">{t.roundsPlayed} round{t.roundsPlayed !== 1 ? "s" : ""} played</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-blue-300">{t.totalPoints}</p>
                            <p className="text-xs text-muted-foreground">Points</p>
                          </div>
                        </div>
                        <div className="flex gap-4 mt-3 pl-11">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-green-400 bg-green-900/30 border border-green-700/40 px-2 py-0.5 rounded-full">
                              W {t.wins}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-yellow-400 bg-yellow-900/30 border border-yellow-700/40 px-2 py-0.5 rounded-full">
                              H {t.halves}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-red-400 bg-red-900/30 border border-red-700/40 px-2 py-0.5 rounded-full">
                              L {t.losses}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            )}

            {/* Ambrose Trip Tab */}
            {(data as any).hasAmbroseRound && (
              <TabsContent value="ambrose">
                <div className="space-y-2">
                  {((data as any).ambrose ?? []).length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">No Ambrose data yet.</div>
                  ) : (
                    ((data as any).ambrose ?? []).map((t: any) => (
                      <div key={t.teamKey} className="bg-card border border-purple-800/40 rounded-xl px-4 py-3 flex items-center gap-4">
                        <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(t.position)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {t.teamEmoji && <span className="mr-1">{t.teamEmoji}</span>}
                            {t.teamName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t.players.map((p: any) => p.name.split(" ")[0]).join(" & ")} · {t.roundsPlayed} round{t.roundsPlayed !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{t.cumulativeNet}</p>
                          <p className="text-xs text-muted-foreground">{t.cumulativeStableford} pts</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            )}

            <TabsContent value="highlights">
              <div className="space-y-6">
                {/* Share Button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      const top3 = data.stableford.slice(0, 3);
                      const pairs = data.fourBBB.slice(0, 3);
                      const medals = ["🥇", "🥈", "🥉"];
                      let text = `🏌️ ${trip?.name ?? "Golf Trip"} — Overall Highlights\n\n`;
                      text += "🏆 Top 3 Individual (Stableford):\n";
                      top3.forEach((p, i) => {
                        text += `${medals[i]} ${p.userName ?? "Unknown"} — ${p.cumulativeStableford} pts\n`;
                      });
                      if (pairs.length > 0) {
                        text += "\n🧑\u200D🤝\u200D🧑 Top 3 Pairs (4BBB Cumulative):\n";
                        pairs.forEach((t, i) => {
                          text += `${medals[i]} ${t.player1Name} & ${t.player2Name} — ${t.cumulativeBestBall} best ball\n`;
                        });
                      }
                      if (navigator.share) {
                        navigator.share({ title: `${trip?.name ?? "Golf Trip"} Highlights`, text });
                      } else {
                        navigator.clipboard.writeText(text).then(() => alert("Results copied to clipboard!"));
                      }
                    }}
                  >
                    <Share2 className="w-3 h-3" />
                    Share
                  </Button>
                </div>
                {/* Top 3 Individual (Stableford) */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" /> Top 3 Individual (Stableford)
                  </h3>
                  {data.stableford.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground bg-card border border-border rounded-xl text-sm">
                      No scores yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.stableford.slice(0, 3).map((p) => (
                        <div
                          key={p.userId}
                          className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors active:scale-[0.98]"
                          onClick={() => setDrawerPlayer({ userId: p.userId, userName: p.userName, currentHandicap: p.currentHandicap ?? 0, rounds: p.rounds })}
                        >
                          <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(p.position)}</div>
                          <PlayerAvatar name={p.userName} photoUrl={p.photoUrl} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{p.userName ?? "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{p.rounds.length} rounds</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">{p.cumulativeStableford}</p>
                            <p className="text-xs text-muted-foreground">Total pts</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top 3 4BBB Pairs */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Top 3 Pairs (4BBB Cumulative)
                  </h3>
                  {data.fourBBB.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground bg-card border border-border rounded-xl text-sm">
                      No 4BBB pair data yet. Pairs must be set up in 4BBB-enabled rounds.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.fourBBB.slice(0, 3).map((t) => (
                        <button key={t.teamKey} type="button" onClick={() => openPairScorecard(t)} className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors active:scale-[0.98]">
                          <div className="w-8 flex-shrink-0 flex justify-center">{positionBadge(t.position)}</div>
                          <div className="flex -space-x-2 flex-shrink-0">
                            <PlayerAvatar name={t.player1Name} photoUrl={t.player1PhotoUrl} />
                            <PlayerAvatar name={t.player2Name} photoUrl={t.player2PhotoUrl} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{t.player1Name} & {t.player2Name}</p>
                            <p className="text-xs text-muted-foreground">{t.roundsPlayed} round{t.roundsPlayed !== 1 ? "s" : ""} · tap for hole scores</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">{t.cumulativeBestBall}</p>
                            <p className="text-xs text-muted-foreground">Best Ball Net</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

                {/* Overall Trip Custom Awards */}
                {overallAwards.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-400" /> Trip Awards
                    </h3>
                    <div className="space-y-2">
                      {overallAwards.map((award) => (
                        <TripAwardCard key={award.id} award={award as any} />
                      ))}
                    </div>
                  </div>
                )}
            </TabsContent>

          </Tabs>
        )}
      </div>

      {/* Scorecard drawer — tap any player name to view their hole-by-hole scorecard */}
      <TripScorecardDrawer
        open={drawerPlayer !== null}
        onClose={() => setDrawerPlayer(null)}
        player={drawerPlayer}
        isStableford={isStableford}
      />
      <FourBBBPairScorecardDrawer
        key={drawerPair ? `${drawerPair.player1Id}-${drawerPair.player2Id}` : "closed"}
        open={drawerPair !== null}
        onClose={() => setDrawerPair(null)}
        pair={drawerPair}
      />
    </div>
  );
}
