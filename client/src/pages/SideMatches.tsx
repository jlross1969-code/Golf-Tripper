import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useParams } from "wouter";
import { ArrowLeft, Plus, Users, Swords, Trophy, Minus, ChevronRight, Pencil, Check, X, Shuffle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const SIDE_MATCH_TYPES = [
  { value: "match_play", label: "Match Play" },
  { value: "nassau", label: "Nassau" },
  { value: "skins", label: "Skins" },
  { value: "stableford", label: "Stableford" },
  { value: "stroke", label: "Stroke Play" },
];

function holeResultIcon(result: "A" | "B" | "H") {
  if (result === "A") return <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">A</span>;
  if (result === "B") return <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-xs flex items-center justify-center font-bold">B</span>;
  return <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center"><Minus className="w-3 h-3" /></span>;
}

function matchStatusLabel(status: number, holesPlayed: number, pairATeamName: string, pairBTeamName: string) {
  if (holesPlayed === 0) return { label: "Not started", color: "secondary" as const };
  if (status === 0) return { label: "All Square", color: "secondary" as const };
  const n = Math.abs(status);
  const side = status > 0 ? pairATeamName : pairBTeamName;
  return { label: `${side} ${n} UP`, color: "default" as const };
}

// Running match status after each hole
function buildRunningStatus(holeResults: { result: "A" | "B" | "H" | null }[], totalHoles: number): string[] {
  let status = 0;
  return holeResults.map((h, i) => {
    if (h.result === "A") status++;
    else if (h.result === "B") status--;
    const holesPlayed = i + 1;
    const holesRemaining = totalHoles - holesPlayed;
    if (status === 0) return "AS";
    const n = Math.abs(status);
    const dir = status > 0 ? "A" : "B";
    if (n > holesRemaining) return `${dir}${n}&${holesRemaining}`;
    if (n === holesRemaining) return `${dir}${n}D`;
    return `${dir}${n}`;
  });
}

// ─── Hole-by-Hole Sheet ───────────────────────────────────────────────────────

interface HoleByHoleSheetProps {
  matchId: number | null;
  onClose: () => void;
}

function HoleByHoleSheet({ matchId, onClose }: HoleByHoleSheetProps) {
  const { data, isLoading } = trpc.groupMatch.getHoleByHole.useQuery(
    { matchId: matchId! },
    { enabled: matchId !== null }
  );

  const pairATeamName = data?.pairATeamName ?? `${data?.pairANames?.join(" & ") ?? "Pair A"}`;
  const pairBTeamName = data?.pairBTeamName ?? `${data?.pairBNames?.join(" & ") ?? "Pair B"}`;
  const pairAEmoji = data?.pairATeamEmoji ?? "";
  const pairBEmoji = data?.pairBTeamEmoji ?? "";

  const runningStatus = data ? buildRunningStatus(data.holes.map(h => ({ result: h.result })), data.holes.length) : [];

  return (
    <Sheet open={matchId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" />
            Hole-by-Hole Breakdown
          </SheetTitle>
          {data && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="text-blue-400 font-medium flex items-center gap-1">
                {pairAEmoji && <span aria-hidden>{pairAEmoji}</span>}
                {pairATeamName}
              </span>
              <span className="text-xs">vs</span>
              <span className="text-orange-400 font-medium flex items-center gap-1">
                {pairBTeamName}
                {pairBEmoji && <span aria-hidden>{pairBEmoji}</span>}
              </span>
            </div>
          )}
        </SheetHeader>

        {isLoading && (
          <div className="space-y-2">
            {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        )}

        {data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Hole</th>
                  <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Par</th>
                  <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">SI</th>
                  <th className="text-center py-2 px-2 text-xs text-blue-400 font-medium">A Pts</th>
                  <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Match</th>
                  <th className="text-center py-2 px-2 text-xs text-orange-400 font-medium">B Pts</th>
                  <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.holes.map((hole, i) => {
                  const status = runningStatus[i];
                  const isAWin = hole.result === "A";
                  const isBWin = hole.result === "B";
                  const isHalved = hole.result === "H";
                  return (
                    <tr key={hole.holeNumber} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2 font-medium text-foreground">{hole.holeNumber}</td>
                      <td className="py-2 px-2 text-center text-muted-foreground">{hole.par}</td>
                      <td className="py-2 px-2 text-center text-muted-foreground">{hole.strokeIndex}</td>
                      <td className={`py-2 px-2 text-center font-bold ${isAWin ? "text-blue-400" : "text-foreground"}`}>
                        {hole.pairABestPoints ?? "—"}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {hole.result ? holeResultIcon(hole.result) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className={`py-2 px-2 text-center font-bold ${isBWin ? "text-orange-400" : "text-foreground"}`}>
                        {hole.pairBBestPoints ?? "—"}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {status ? (
                          <span className={`text-xs font-medium ${
                            status === "AS" ? "text-muted-foreground" :
                            status.startsWith("A") ? "text-blue-400" : "text-orange-400"
                          }`}>{status}</span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td colSpan={3} className="py-2 px-2 text-xs font-semibold text-muted-foreground">Total</td>
                  <td className="py-2 px-2 text-center font-bold text-blue-400">
                    {data.holes.filter(h => h.result === "A").length}W
                  </td>
                  <td className="py-2 px-2 text-center text-xs text-muted-foreground">
                    {data.holes.filter(h => h.result === "H").length}H
                  </td>
                  <td className="py-2 px-2 text-center font-bold text-orange-400">
                    {data.holes.filter(h => h.result === "B").length}W
                  </td>
                  <td className="py-2 px-2 text-center">
                    {data.winner !== "pending" && (
                      <Badge className={`text-xs ${data.winner === "player1" ? "bg-blue-600" : data.winner === "player2" ? "bg-orange-600" : "bg-muted"} text-white`}>
                        {data.winner === "player1" ? "A Wins" : data.winner === "player2" ? "B Wins" : "Halved"}
                      </Badge>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Automatic Team / Singles Matchboard ──────────────────────────────────────

function AutomaticMatchGrid({ matchId, labelA, labelB }: { matchId: number; labelA: string; labelB: string }) {
  const { data, isLoading } = trpc.groupMatch.getHoleByHole.useQuery({ matchId });
  if (isLoading) return <Skeleton className="h-80 rounded-xl" />;
  if (!data) return <div className="rounded-xl border border-border p-5 text-center text-sm text-muted-foreground">Match details are not available yet.</div>;

  const running = buildRunningStatus(data.holes.map((hole: any) => ({ result: hole.result })), data.holes.length);
  const summary = (start: number, end: number) => {
    const results = data.holes.slice(start, end).map((hole: any) => hole.result);
    const a = results.filter((result: string) => result === "A").length;
    const b = results.filter((result: string) => result === "B").length;
    if (a === b) return "A/S";
    return `${a > b ? labelA : labelB} ${Math.abs(a - b)} UP`;
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-card shadow-sm">
      <div className="grid grid-cols-[52px_1fr_94px_1fr] bg-slate-900 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-100">
        <span>Hole</span><span className="text-center truncate">{labelA}</span><span className="text-center">Match</span><span className="text-center truncate">{labelB}</span>
      </div>
      <div className="max-h-[58vh] overflow-y-auto">
        {data.holes.map((hole: any, index: number) => {
          const isA = hole.result === "A";
          const isB = hole.result === "B";
          const isHalved = hole.result === "H";
          return (
            <div key={hole.holeNumber} className={`grid grid-cols-[52px_1fr_94px_1fr] items-center min-h-12 px-3 text-sm ${index % 2 === 0 ? "bg-slate-100/70 dark:bg-slate-800/45" : "bg-background"}`}>
              <span className="w-8 h-8 rounded-full border-2 border-slate-400 flex items-center justify-center font-bold text-foreground">{hole.holeNumber}</span>
              <span className={`mx-auto min-w-10 rounded-sm px-3 py-1.5 text-center font-bold ${isA ? "bg-sky-300 text-slate-950" : "text-foreground"}`}>{hole.pairABestPoints ?? "—"}</span>
              <span className={`text-center font-bold ${isHalved ? "text-foreground" : isA ? "text-sky-500" : isB ? "text-orange-500" : "text-muted-foreground"}`}>{running[index] ?? "—"}</span>
              <span className={`mx-auto min-w-10 rounded-sm px-3 py-1.5 text-center font-bold ${isB ? "bg-sky-300 text-slate-950" : "text-foreground"}`}>{hole.pairBBestPoints ?? "—"}</span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-[1fr_94px_1fr] border-t border-slate-700 bg-slate-100 px-3 py-3 text-sm font-bold dark:bg-slate-800">
        <span>Out</span><span className="text-center">{summary(0, 9)}</span><span className="text-right">{summary(0, 9).includes("A/S") ? "Halved" : "Winner"}</span>
      </div>
      <div className="grid grid-cols-[1fr_94px_1fr] border-t border-slate-700 bg-slate-900 px-3 py-3 text-sm font-bold text-white">
        <span>Overall</span><span className="text-center">{data.winner === "pending" ? (running.filter(Boolean).at(-1) ?? "A/S") : data.winner === "halved" ? "A/S" : `${data.winner === "player1" ? labelA : labelB} Wins`}</span><span className="text-right">{data.winner === "pending" ? "In play" : data.winner === "halved" ? "Halved" : "Winner"}</span>
      </div>
    </div>
  );
}

function AutomaticMatchBoard({
  teamMatch,
  singlesMatches,
  roundId,
}: {
  teamMatch: any | null;
  singlesMatches: any[];
  roundId: number;
}) {
  if (!teamMatch && singlesMatches.length === 0) return null;
  const teamA = teamMatch?.pairATeamName ?? teamMatch?.pairANames?.join(" & ") ?? "Us";
  const teamB = teamMatch?.pairBTeamName ?? teamMatch?.pairBNames?.join(" & ") ?? "Them";
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2"><Swords className="w-4 h-4 text-primary" /> Your automatic side matches</h2>
          <p className="text-xs text-muted-foreground mt-1">Created from score-marker pairs. Team uses best Stableford score; Single is between card markers.</p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary whitespace-nowrap">Auto</Badge>
      </div>
      <Tabs defaultValue={teamMatch ? "team" : "single"}>
        <TabsList className="w-full grid grid-cols-2 rounded-full p-1 bg-sky-100/70 dark:bg-slate-800">
          <TabsTrigger value="team" disabled={!teamMatch} className="rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white">Team</TabsTrigger>
          <TabsTrigger value="single" disabled={singlesMatches.length === 0} className="rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white">Single</TabsTrigger>
        </TabsList>
        <TabsContent value="team" className="mt-4 space-y-3">
          {teamMatch ? <AutomaticMatchGrid matchId={teamMatch.id} labelA={teamA} labelB={teamB} /> : <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Confirm the other score-marker pair to create the default 4BBB Team Match Play.</div>}
        </TabsContent>
        <TabsContent value="single" className="mt-4 space-y-5">
          {singlesMatches.map((match) => {
            const playerA = match.player1Name ?? "Player A";
            const playerB = match.player2Name ?? "Player B";
            return <AutomaticMatchGrid key={match.id} matchId={match.id} labelA={playerA} labelB={playerB} />;
          })}
          {singlesMatches.length > 0 && <Link href={`/round/${roundId}/match-play`}><Button variant="outline" className="w-full gap-2"><Swords className="w-4 h-4" /> Enter or review Singles Match Play</Button></Link>}
        </TabsContent>
      </Tabs>
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SideMatches() {
  const { roundId } = useParams<{ roundId: string }>();
  const id = Number(roundId);
  const { user } = useAuth();

  const { data: roundData, isLoading } = trpc.rounds.get.useQuery({ id });
  const { data: groups } = trpc.groups.list.useQuery({ roundId: id });
  const { data: sideMatches, refetch } = trpc.sideMatches.list.useQuery({ roundId: id });
  const { data: groupMatches, isLoading: gmLoading } = trpc.groupMatch.getByRound.useQuery({ roundId: id });
  const { data: myGroup } = trpc.groups.getMyGroup.useQuery({ roundId: id }, { enabled: !!user });
  const { data: allMatchPlay = [] } = trpc.matchPlay.getByRound.useQuery({ roundId: id });

  const myTeamMatch = myGroup
    ? groupMatches?.find((match: any) => match.groupId === myGroup.groupId) ?? null
    : null;
  const mySinglesMatches = myGroup
    ? allMatchPlay.filter((match: any) =>
      match.groupId === myGroup.groupId &&
      match.player1PartnerId === null &&
      match.player2PartnerId === null &&
      (match.player1Id === user?.id || match.player2Id === user?.id)
    )
    : [];

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [holeByHoleMatchId, setHoleByHoleMatchId] = useState<number | null>(null);

  // Inline team name editing state: key = matchId + side ('A'|'B')
  const [editingTeamName, setEditingTeamName] = useState<string | null>(null); // e.g. "42-A"
  const [teamNameDraft, setTeamNameDraft] = useState<string>("");
  const [emojiDraft, setEmojiDraft] = useState<string>("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");

  const utils = trpc.useUtils();
  const setTeamName = trpc.groups.setTeamName.useMutation({
    onSuccess: (_data, variables) => {
      const savedName = variables.teamName.trim();
      const savedEmoji = (variables.teamEmoji ?? "").trim();
      if (savedName === "") {
        toast.success("Team name reverted to default.");
      } else {
        toast.success(`${savedEmoji ? savedEmoji + " " : ""}Team name saved: "${savedName}"`);
      }
      setEditingTeamName(null);
      setEmojiPickerOpen(false);
      utils.groupMatch.getByRound.invalidate({ roundId: id });
    },
    onError: (e) => toast.error(e.message),
  });

  const createMatch = trpc.sideMatches.create.useMutation({
    onSuccess: () => {
      toast.success("Side match created");
      setCreateOpen(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = async () => {
    if (!selectedGroupId || !selectedType) return;
    const group = groups?.find((g) => g.id === selectedGroupId);
    if (!group) return;
    await createMatch.mutateAsync({
      groupId: selectedGroupId,
      roundId: id,
      type: selectedType as any,
      players: group.players.filter((p) => p.userId != null).map((p) => ({ userId: p.userId as number, partnerId: p.partnerId ?? undefined })),
    });
  };

  if (isLoading) return <div className="p-8"><Skeleton className="h-8 w-64" /></div>;
  if (!roundData) return <div className="p-8 text-muted-foreground">Round not found.</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/trip/${roundData.round.tripId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <Swords className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">Side Matches</h1>
            <p className="text-xs text-muted-foreground">{roundData.round.name}</p>
          </div>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> New Side Match
        </Button>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        <AutomaticMatchBoard teamMatch={myTeamMatch} singlesMatches={mySinglesMatches} roundId={id} />

        {/* ── Group 4BBB Matchplay section ── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" />
            Group 4BBB Matchplay
          </h2>

          {gmLoading && <Skeleton className="h-40 rounded-xl" />}

          {!gmLoading && (!groupMatches || groupMatches.length === 0) && (
            <div className="text-center py-10 bg-card border border-border rounded-xl">
              <Swords className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-1">No group matches yet.</p>
              <p className="text-xs text-muted-foreground">Matches are created when the admin locks pairs for a group.</p>
            </div>
          )}

          {groupMatches && groupMatches.map((match) => {
            const holeResults: ("A" | "B" | "H")[] = match.holeResultsParsed ?? [];
            const pairATeamName = match.pairATeamName ?? `${match.pairANames.join(" & ")}`;
            const pairBTeamName = match.pairBTeamName ?? `${match.pairBNames.join(" & ")}`;
            const { label: statusLabel, color: statusColor } = matchStatusLabel(match.matchStatus, holeResults.length, pairATeamName, pairBTeamName);
            const isComplete = match.winner !== "pending";
            const winnerLabel =
              match.winner === "halved" ? "Match Halved" :
              match.winner === "player1" ? `${pairATeamName} Win` :
              match.winner === "player2" ? `${pairBTeamName} Win` : null;

            return (
              <Card key={match.id} className="border-border mb-3">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="text-muted-foreground">Group Match</span>
                    {isComplete ? (
                      <Badge className="gap-1 bg-primary text-primary-foreground">
                        <Trophy className="w-3 h-3" /> {winnerLabel}
                      </Badge>
                    ) : (
                      <Badge variant={statusColor}>{statusLabel}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-4">
                  {/* Team name vs display — with inline edit for the current user's pair */}
                  {(() => {
                    const myPairSide =
                      user && (match.player1Id === user.id || match.player1PartnerId === user.id) ? "A" :
                      user && (match.player2Id === user.id || match.player2PartnerId === user.id) ? "B" : null;

                    // Curated emoji with searchable names
                    const GOLF_EMOJI_DATA: { em: string; name: string }[] = [
                      { em: "⛳", name: "golf hole flag" },
                      { em: "🏌️", name: "golfer golf player" },
                      { em: "🏌️‍♂️", name: "man golfer golf" },
                      { em: "🏌️‍♀️", name: "woman golfer golf" },
                      { em: "🎯", name: "target bullseye dart" },
                      { em: "🏆", name: "trophy winner champion" },
                      { em: "🥇", name: "gold medal first" },
                      { em: "🥈", name: "silver medal second" },
                      { em: "🥉", name: "bronze medal third" },
                      { em: "🦅", name: "eagle bird" },
                      { em: "🦆", name: "duck bird" },
                      { em: "🦉", name: "owl bird" },
                      { em: "🦁", name: "lion king fierce" },
                      { em: "🐯", name: "tiger fierce" },
                      { em: "🐻", name: "bear" },
                      { em: "🦊", name: "fox clever" },
                      { em: "🐺", name: "wolf pack" },
                      { em: "🦈", name: "shark" },
                      { em: "🦋", name: "butterfly" },
                      { em: "🐮", name: "cow bull" },
                      { em: "🐍", name: "snake" },
                      { em: "🐼", name: "panda bear" },
                      { em: "🐧", name: "penguin" },
                      { em: "🐢", name: "turtle" },
                      { em: "🦖", name: "T-rex dinosaur" },
                      { em: "🔥", name: "fire hot" },
                      { em: "⚡", name: "lightning bolt electric" },
                      { em: "💥", name: "explosion boom" },
                      { em: "🌪️", name: "tornado storm" },
                      { em: "❄️", name: "snowflake ice cold" },
                      { em: "🌊", name: "wave ocean water" },
                      { em: "🌟", name: "star glowing" },
                      { em: "✨", name: "sparkles magic" },
                      { em: "💫", name: "dizzy stars" },
                      { em: "🎖️", name: "medal military" },
                      { em: "🍀", name: "four leaf clover lucky" },
                      { em: "🌈", name: "rainbow" },
                      { em: "🎱", name: "billiards pool" },
                      { em: "🎳", name: "bowling" },
                      { em: "🎲", name: "dice game" },
                      { em: "🃏", name: "joker card" },
                      { em: "🚀", name: "rocket launch" },
                      { em: "💎", name: "gem diamond" },
                      { em: "👑", name: "crown king" },
                      { em: "💣", name: "bomb" },
                      { em: "🎉", name: "party celebration" },
                      { em: "🤯", name: "mind blown exploding" },
                      { em: "😈", name: "devil evil" },
                      { em: "👽", name: "alien" },
                      { em: "🤖", name: "robot" },
                      { em: "💀", name: "skull" },
                      { em: "🌞", name: "sun" },
                      { em: "🌕", name: "moon" },
                      { em: "☘️", name: "shamrock clover" },
                      { em: "🍎", name: "apple" },
                      { em: "🥑", name: "avocado" },
                    ];

                    const RANDOM_TEAMS: { name: string; emoji: string }[] = [
                      { name: "Eagle Hunters", emoji: "🦅" },
                      { name: "Birdie Boys", emoji: "🦆" },
                      { name: "The Bogey Men", emoji: "😈" },
                      { name: "Fairway Foxes", emoji: "🦊" },
                      { name: "Iron Wolves", emoji: "🐺" },
                      { name: "Sand Sharks", emoji: "🦈" },
                      { name: "Rough Riders", emoji: "🔥" },
                      { name: "Thunder Putts", emoji: "⚡" },
                      { name: "The Albatross", emoji: "🦅" },
                      { name: "Ace Chasers", emoji: "🎯" },
                      { name: "Bunker Kings", emoji: "👑" },
                      { name: "Green Machine", emoji: "🍀" },
                      { name: "Tee Rexes", emoji: "🦖" },
                      { name: "Hole Hunters", emoji: "⛳" },
                      { name: "Putter Pandas", emoji: "🐼" },
                      { name: "Birdie Bandits", emoji: "💥" },
                      { name: "Wedge Warriors", emoji: "🎖️" },
                      { name: "The Scratch Pack", emoji: "🏆" },
                      { name: "Bogey Busters", emoji: "💣" },
                      { name: "The Stableford", emoji: "🌟" },
                      { name: "Chip Shots", emoji: "🎉" },
                      { name: "Fringe Dwellers", emoji: "🌊" },
                      { name: "The Condors", emoji: "🦅" },
                      { name: "Penalty Pals", emoji: "🤯" },
                      { name: "Dormie Squad", emoji: "🚀" },
                    ];

                    function TeamNameCell({ side, teamName, teamEmoji, names, groupId }: {
                      side: "A" | "B"; teamName: string; teamEmoji: string | null; names: string[]; groupId: number;
                    }) {
                      const editKey = `${match.id}-${side}`;
                      const isEditing = editingTeamName === editKey;
                      const isMyPair = myPairSide === side;
                      const hasCustomName = side === "A" ? !!match.pairATeamName : !!match.pairBTeamName;
                      const displayEmoji = isEditing ? emojiDraft : (teamEmoji ?? "");
                      return (
                        <div className="space-y-1">
                          <Badge className={side === "A" ? "bg-blue-600 text-white text-xs" : "bg-orange-600 text-white text-xs"}>
                            Pair {side}
                          </Badge>
                          {isEditing ? (
                            <div
                              className="flex flex-col gap-1 items-center"
                              style={{ animation: "team-name-fade-in 180ms cubic-bezier(0.23,1,0.32,1) both" }}
                            >
                              {/* Emoji picker row + randomize */}
                              <div className="flex items-center gap-1 w-full">
                                {/* Randomize button */}
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-foreground hover:bg-muted w-8 h-8 flex items-center justify-center rounded-md border border-border transition-colors flex-shrink-0"
                                  title="Randomize team name & mascot"
                                  onClick={() => {
                                    const pick = RANDOM_TEAMS[Math.floor(Math.random() * RANDOM_TEAMS.length)];
                                    setTeamNameDraft(pick.name);
                                    setEmojiDraft(pick.emoji);
                                  }}
                                >
                                  <Shuffle className="w-3.5 h-3.5" />
                                </button>
                                <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                                  <PopoverTrigger asChild>
                                    <button
                                      className="text-xl leading-none w-8 h-8 flex items-center justify-center rounded-md border border-border hover:bg-muted transition-colors"
                                      title="Pick a team mascot emoji"
                                      type="button"
                                    >
                                      {emojiDraft || "😶"}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-72 p-2" align="start">
                                    <p className="text-[10px] text-muted-foreground mb-1.5 px-1">Pick a mascot emoji</p>
                                    {/* Search input */}
                                    <Input
                                      value={emojiSearch}
                                      onChange={(e) => setEmojiSearch(e.target.value)}
                                      placeholder="Search emoji…"
                                      className="h-7 text-xs mb-2"
                                      autoFocus
                                    />
                                    <div className="grid grid-cols-8 gap-0.5 max-h-40 overflow-y-auto">
                                      {/* Clear option — only show when not searching */}
                                      {!emojiSearch && (
                                        <button
                                          className="text-xs w-7 h-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground"
                                          onClick={() => { setEmojiDraft(""); setEmojiPickerOpen(false); }}
                                          title="No mascot"
                                          type="button"
                                        >✕</button>
                                      )}
                                      {(() => {
                                        const q = emojiSearch.toLowerCase().trim();
                                        const filtered = q
                                          ? GOLF_EMOJI_DATA.filter(d => d.em.includes(q) || d.name.includes(q))
                                          : GOLF_EMOJI_DATA;
                                        if (filtered.length === 0) {
                                          return (
                                            <div className="col-span-8 text-[10px] text-muted-foreground text-center py-2">
                                              No emoji found
                                            </div>
                                          );
                                        }
                                        return filtered.map((d) => (
                                          <button
                                            key={d.em}
                                            className={`text-lg w-7 h-7 flex items-center justify-center rounded hover:bg-muted transition-colors ${
                                              emojiDraft === d.em ? "bg-primary/20 ring-1 ring-primary" : ""
                                            }`}
                                            onClick={() => { setEmojiDraft(d.em); setEmojiPickerOpen(false); setEmojiSearch(""); }}
                                            type="button"
                                            title={d.name}
                                          >{d.em}</button>
                                        ));
                                      })()}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                <Input
                                  value={teamNameDraft}
                                  onChange={(e) => setTeamNameDraft(e.target.value.slice(0, 20))}
                                  placeholder={teamName}
                                  maxLength={20}
                                  className={`h-7 text-xs text-center flex-1 ${teamNameDraft.length > 20 ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && teamNameDraft.length <= 20 && !setTeamName.isPending) {
                                      e.preventDefault();
                                      setTeamName.mutate({ groupId, teamName: teamNameDraft, teamEmoji: emojiDraft });
                                    }
                                    if (e.key === "Escape") setEditingTeamName(null);
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-between w-full px-0.5">
                                <span className={`text-[10px] ${teamNameDraft.length === 20 ? "text-amber-400 font-medium" : teamNameDraft.length >= 16 ? "text-amber-400" : "text-muted-foreground"}`}>
                                  {teamNameDraft.length === 20 ? "20/20 — max" : `${teamNameDraft.length}/20`}
                                </span>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-6 w-6"
                                    onClick={() => setTeamName.mutate({ groupId, teamName: teamNameDraft, teamEmoji: emojiDraft })}
                                    disabled={setTeamName.isPending || teamNameDraft.length > 20}
                                    title="Save team name (Enter)">
                                    {setTeamName.isPending
                                      ? <Spinner className="w-3 h-3 text-muted-foreground" />
                                      : <Check className="w-3 h-3 text-green-400" />}
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6"
                                    onClick={() => setEditingTeamName(null)}
                                    disabled={setTeamName.isPending}>
                                    <X className="w-3 h-3 text-muted-foreground" />
                                  </Button>
                                </div>
                              </div>
                              {teamNameDraft.length === 0 && (
                                <p className="text-[10px] text-muted-foreground text-center">
                                  Saving empty will revert to auto-generated name
                                </p>
                              )}
                            </div>
                          ) : (
                            <div
                              className="flex flex-col items-center gap-0.5"
                              style={{ animation: "team-name-fade-in 180ms cubic-bezier(0.23,1,0.32,1) both" }}
                            >
                              <div className="flex items-center gap-1">
                                {displayEmoji && (() => {
                                  // Bounce when this pair is winning or has won
                                  const aWins = holeResults.filter(r => r === "A").length;
                                  const bWins = holeResults.filter(r => r === "B").length;
                                  const isLeading = side === "A" ? aWins > bWins : bWins > aWins;
                                  const hasWon = (side === "A" && match.winner === "player1") || (side === "B" && match.winner === "player2");
                                  return (
                                    <span
                                      className="text-lg leading-none"
                                      aria-hidden
                                      style={isLeading || hasWon ? { animation: "mascot-bounce 0.7s cubic-bezier(0.36,0.07,0.19,0.97) infinite" } : undefined}
                                    >{displayEmoji}</span>
                                  );
                                })()}
                                <p
                                  className={`text-sm font-bold text-foreground ${isMyPair ? "cursor-pointer select-none hover:text-primary transition-colors" : ""}`}
                                  onDoubleClick={isMyPair ? () => {
                                    setTeamNameDraft(hasCustomName ? teamName : "");
                                    setEmojiDraft(teamEmoji ?? "");
                                    setEditingTeamName(editKey);
                                  } : undefined}
                                  title={isMyPair ? "Double-click to edit team name" : undefined}
                                >
                                  {teamName}
                                </p>
                                {isMyPair && (
                                  <button
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => {
                                      setTeamNameDraft(hasCustomName ? teamName : "");
                                      setEmojiDraft(teamEmoji ?? "");
                                      setEditingTeamName(editKey);
                                    }}
                                    title="Edit team name"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              {hasCustomName && (
                                <p className="text-xs text-muted-foreground">{names.join(" & ")}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-center">
                        <TeamNameCell side="A" teamName={pairATeamName} teamEmoji={match.pairATeamEmoji ?? null} names={match.pairANames} groupId={match.groupId} />
                        <span className="text-muted-foreground font-bold text-lg">vs</span>
                        <TeamNameCell side="B" teamName={pairBTeamName} teamEmoji={match.pairBTeamEmoji ?? null} names={match.pairBNames} groupId={match.groupId} />
                      </div>
                    );
                  })()}

                  {holeResults.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Hole results ({holeResults.length} played)</p>
                      <div className="flex flex-wrap gap-1">
                        {holeResults.map((r, i) => (
                          <div key={i} className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                            {holeResultIcon(r)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {holeResults.length > 0 && (
                    <div className="grid grid-cols-3 text-center text-sm border-t border-border pt-3">
                      <div>
                        <p className="font-bold text-blue-400">{holeResults.filter((r) => r === "A").length}</p>
                        <p className="text-xs text-muted-foreground">Pair A</p>
                      </div>
                      <div>
                        <p className="font-bold text-muted-foreground">{holeResults.filter((r) => r === "H").length}</p>
                        <p className="text-xs text-muted-foreground">Halved</p>
                      </div>
                      <div>
                        <p className="font-bold text-orange-400">{holeResults.filter((r) => r === "B").length}</p>
                        <p className="text-xs text-muted-foreground">Pair B</p>
                      </div>
                    </div>
                  )}

                  {holeResults.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Waiting for scores to be entered...</p>
                  )}

                  {/* Hole-by-hole detail button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-xs"
                    onClick={() => setHoleByHoleMatchId(match.id)}
                  >
                    <ChevronRight className="w-3 h-3" />
                    View Hole-by-Hole Breakdown
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* ── Other Side Matches section ── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Other Side Matches
          </h2>

          {!sideMatches || sideMatches.length === 0 ? (
            <div className="text-center py-10 bg-card border border-border rounded-xl">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-4">No other side matches yet.</p>
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Create Side Match
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sideMatches.map((match) => {
                const group = groups?.find((g) => g.id === match.groupId);
                const typeLabel = SIDE_MATCH_TYPES.find((t) => t.value === match.type)?.label ?? match.type;
                return (
                  <div key={match.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{typeLabel}</Badge>
                        <Badge variant={match.status === "active" ? "default" : match.status === "completed" ? "secondary" : "outline"}>
                          {match.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{group?.name ?? `Group ${match.groupId}`}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {match.players.map((p) => (
                        <span key={p.id} className="text-xs bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                          {(p as any).displayName ?? `Player ${p.userId}`}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Rules info */}
        <div className="px-4 py-3 bg-muted/50 rounded-xl text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground flex items-center gap-1">
            <Swords className="w-3.5 h-3.5 text-primary" />
            4BBB Stableford Matchplay Rules
          </p>
          <p>• Each hole: the best Stableford score from each pair is compared.</p>
          <p>• Higher score wins the hole. Equal scores halve the hole.</p>
          <p>• The pair that wins the most holes wins the match.</p>
          <p>• This is a group side match — separate from the main round leaderboard.</p>
        </div>
      </div>

      {/* Hole-by-Hole Sheet */}
      <HoleByHoleSheet
        matchId={holeByHoleMatchId}
        onClose={() => setHoleByHoleMatchId(null)}
      />

      {/* Create Side Match Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Side Match</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Group</label>
              <Select value={selectedGroupId?.toString() ?? ""} onValueChange={(v) => setSelectedGroupId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group..." />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((g) => (
                    <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Match Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {SIDE_MATCH_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedGroupId || !selectedType || createMatch.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
