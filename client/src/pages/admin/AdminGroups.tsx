import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, Users, UserPlus, Lock, Swords, X, Shuffle, Clock, Flag, Pencil, Copy, ClipboardList, GripVertical } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

type GroupPlayer = {
  id: number;
  userId: number;
  groupId: number;
  partnerId: number | null;
  pairId: number | null;
  scorerId: number | null;
  user?: { id: number; name: string | null } | undefined;
  nickname?: string | null;
  currentHandicap?: number | null;
  photoUrl?: string | null;
};

export default function AdminGroups() {
  const { tripId, roundId } = useParams<{ tripId: string; roundId: string }>();
  const tId = Number(tripId);
  const rId = Number(roundId);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: tripList } = trpc.trips.list.useQuery();

  // Scope guard: must be global admin, trip owner, or co-admin for this trip
  const isGlobalAdmin = user?.role === "admin";
  const tripEntry = tripList?.find((t) => t.id === tId);
  const isAuthorized = isGlobalAdmin || (tripEntry && (tripEntry.createdBy === user?.id || (tripEntry as any).isCoAdmin));

  useEffect(() => {
    if (tripList && user && !isAuthorized) navigate("/");
  }, [tripList, user, isAuthorized, navigate]);

  const { data: roundData } = trpc.rounds.get.useQuery({ id: rId });
  const { data: groups, refetch } = trpc.groups.list.useQuery({ roundId: rId, tripId: tId });
  const { data: players } = trpc.players.tripPlayers.useQuery({ tripId: tId });

  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [playerOpen, setPlayerOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [addUserId, setAddUserId] = useState("");

  // Pair assignment state
  const [pairOpen, setPairOpen] = useState(false);
  const [pairGroupId, setPairGroupId] = useState<number | null>(null);
  const [pairPlayer1, setPairPlayer1] = useState("");
  const [pairPlayer2, setPairPlayer2] = useState("");
  const [pairId, setPairId] = useState<"1" | "2">("1");

  // Auto-group state
  const [autoGroupOpen, setAutoGroupOpen] = useState(false);
  const [autoGroupCount, setAutoGroupCount] = useState("");

  // Copy / Re-seed state
  const [reseedOpen, setReseedOpen] = useState(false);
  const [reseedMode, setReseedMode] = useState<"copy" | "4bbb" | "individual">("copy");
  const [reseedSourceRoundId, setReseedSourceRoundId] = useState("");
  const [reseedGroupSize, setReseedGroupSize] = useState("4");
  const [reseedStep, setReseedStep] = useState<"configure" | "preview">("configure");
  const [reseedPreviewEnabled, setReseedPreviewEnabled] = useState(false);
  // Drag-to-edit preview state
  type PreviewPlayer = { userId: number; displayName: string; handicap: number; partnerId?: number | null };
  type PreviewGroup = { name: string; players: PreviewPlayer[] };
  const [editableGroups, setEditableGroups] = useState<PreviewGroup[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const applyCustom = trpc.groups.applyCustom.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.groupsCreated} groups applied successfully`);
      setReseedOpen(false);
      setReseedStep("configure");
      setReseedPreviewEnabled(false);
      setEditableGroups([]);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // Admin scorecard drawer state
  const [scorecardPlayer, setScorecardPlayer] = useState<GroupPlayer | null>(null);
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const { data: scorecardData, refetch: refetchScorecard } = trpc.scores.getPlayerScorecard.useQuery(
    { roundId: rId, userId: scorecardPlayer?.userId ?? 0 },
    { enabled: scorecardOpen && !!scorecardPlayer }
  );

  // Score correction state
  const [correctOpen, setCorrectOpen] = useState(false);
  const [correctPlayer, setCorrectPlayer] = useState<GroupPlayer | null>(null);
  const [correctHoleId, setCorrectHoleId] = useState("");
  const [correctGross, setCorrectGross] = useState("");

  // Achievement verification state (for admin-corrected scores)
  type PendingAchievement = {
    type: "hole_in_one" | "eagle" | "birdie";
    holeId: number;
    holeNumber: number;
    par: number;
    grossScore: number;
    userId: number;
    playerName: string;
  };
  const [pendingAchievement, setPendingAchievement] = useState<PendingAchievement | null>(null);
  const [pendingAchievementId, setPendingAchievementId] = useState<number | null>(null);

  // Compute set of userIds already assigned to any group in this round
  const assignedUserIds = new Set<number>(
    (groups ?? []).flatMap((g) => g.players.map((p) => p.userId))
  );

  const createGroup = trpc.groups.create.useMutation({
    onSuccess: () => { toast.success("Group created"); setGroupOpen(false); refetch(); setGroupName(""); },
    onError: (e) => toast.error(e.message),
  });

  const addPlayer = trpc.groups.addPlayer.useMutation({
    onSuccess: () => { toast.success("Player added to group"); setPlayerOpen(false); refetch(); setAddUserId(""); },
    onError: (e) => toast.error(e.message),
  });

  const removePlayer = trpc.groups.removePlayer.useMutation({
    onSuccess: () => { toast.success("Player removed from group"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteGroup = trpc.groups.delete.useMutation({
    onSuccess: () => { toast.success("Group deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const setPair = trpc.groups.setPair.useMutation({
    onSuccess: () => {
      toast.success("Pair assigned");
      setPairOpen(false);
      refetch();
      setPairPlayer1(""); setPairPlayer2(""); setPairId("1");
    },
    onError: (e) => toast.error(e.message),
  });

  const lockPairs = trpc.groups.lockPairs.useMutation({
    onSuccess: (data) => {
      toast.success(data.matchId ? "Pairs locked — group match created!" : "Pairs locked");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const unlockPairs = trpc.groups.unlockPairs.useMutation({
    onSuccess: () => { toast.success("Pairs unlocked — you can now reassign players"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Tee time / starting hole inline edit state per group
  const [teeTimeEdits, setTeeTimeEdits] = useState<Record<number, string>>({});
  const [startingHoleEdits, setStartingHoleEdits] = useState<Record<number, string>>({});

  const updateSettings = trpc.groups.updateSettings.useMutation({
    onSuccess: () => { toast.success("Group settings saved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const autoGroup = trpc.groups.autoGroup.useMutation({
    onSuccess: (data) => {
      toast.success(`Auto-grouped ${data.totalPlayers} players into ${data.groupIds.length} groups with pairs assigned`);
      setAutoGroupOpen(false);
      setAutoGroupCount("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const copyToRound = trpc.groups.copyToRound.useMutation({
    onSuccess: (d) => { toast.success(`Copied ${d.groupsCreated} groups to this round`); setReseedOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const reseedBy4BBB = trpc.groups.reseedBy4BBB.useMutation({
    onSuccess: (d) => { toast.success(`Re-seeded into ${d.groupsCreated} groups by 4BBB standings`); setReseedOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const reseedByIndividual = trpc.groups.reseedByIndividual.useMutation({
    onSuccess: (d) => { toast.success(`Re-seeded into ${d.groupsCreated} groups by individual standings`); setReseedOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Other rounds in this trip (for copy/re-seed source selection)
  const { data: tripRounds } = trpc.rounds.list.useQuery({ tripId: tId });
  const otherRounds = (tripRounds ?? []).filter((r) => r.id !== rId);

  // Preview queries (dry-run, only enabled when user clicks Preview)
  const srcId = Number(reseedSourceRoundId) || 0;
  const gSize = Number(reseedGroupSize) || 4;
  const { data: previewCopyData, isFetching: previewCopyFetching } = trpc.groups.previewCopy.useQuery(
    { sourceRoundId: srcId, tripId: tId },
    { enabled: reseedPreviewEnabled && reseedMode === "copy" && srcId > 0 }
  );
  const { data: preview4BBBData, isFetching: preview4BBBFetching } = trpc.groups.previewBy4BBB.useQuery(
    { sourceRoundId: srcId, tripId: tId, groupSize: gSize },
    { enabled: reseedPreviewEnabled && reseedMode === "4bbb" && srcId > 0 }
  );
  const { data: previewIndivData, isFetching: previewIndivFetching } = trpc.groups.previewByIndividual.useQuery(
    { tripId: tId, groupSize: gSize },
    { enabled: reseedPreviewEnabled && reseedMode === "individual" }
  );
  const previewGroups = reseedMode === "copy" ? previewCopyData?.groups
    : reseedMode === "4bbb" ? preview4BBBData?.groups
    : previewIndivData?.groups;
  const previewFetching = previewCopyFetching || preview4BBBFetching || previewIndivFetching;

  // Sync preview data into editable groups when it arrives
  useEffect(() => {
    if (previewGroups && previewGroups.length > 0) {
      setEditableGroups(previewGroups.map((g) => ({ name: g.name, players: g.players })));
    }
  }, [previewGroups]);

  // DnD handlers for preview drag-to-edit
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id); // "groupIdx-userId"
    const overId = String(over.id);
    const [activeGi] = activeId.split("-").map(Number);
    const [overGi] = overId.split("-").map(Number);
    if (activeGi === overGi) return; // same group — no action needed on over
    setEditableGroups((prev) => {
      const next = prev.map((g) => ({ ...g, players: [...g.players] }));
      const activeUserId = parseInt(activeId.split("-")[1]);
      const player = next[activeGi]?.players.find((p) => p.userId === activeUserId);
      if (!player) return prev;
      next[activeGi].players = next[activeGi].players.filter((p) => p.userId !== activeUserId);
      if (!next[overGi].players.find((p) => p.userId === activeUserId)) {
        next[overGi].players.push(player);
      }
      return next;
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const [activeGi] = activeId.split("-").map(Number);
    const [overGi] = overId.split("-").map(Number);
    if (activeGi === overGi) return;
    setEditableGroups((prev) => {
      const next = prev.map((g) => ({ ...g, players: [...g.players] }));
      const activeUserId = parseInt(activeId.split("-")[1]);
      const player = next[activeGi]?.players.find((p) => p.userId === activeUserId);
      if (!player) return prev;
      next[activeGi].players = next[activeGi].players.filter((p) => p.userId !== activeUserId);
      if (!next[overGi].players.find((p) => p.userId === activeUserId)) {
        next[overGi].players.push(player);
      }
      return next;
    });
  }, []);

  const createAchievement = trpc.achievements.create.useMutation();
  const confirmAchievement = trpc.achievements.confirm.useMutation();

  const adminCorrect = trpc.scores.adminCorrect.useMutation({
    onSuccess: async (d, variables) => {
      toast.success(`Score corrected — Net: ${d.netScore}, Pts: ${d.stablefordPoints}`);
      setCorrectOpen(false);
      if (scorecardOpen) refetchScorecard();
      const correctedPlayer = correctPlayer;
      setCorrectPlayer(null);
      setCorrectHoleId("");
      setCorrectGross("");
      // Trigger achievement verification if the corrected score qualifies
      if (d.achievementType) {
        try {
          const achResult = await createAchievement.mutateAsync({
            roundId: variables.roundId,
            userId: variables.userId,
            holeId: variables.holeId,
            holeNumber: variables.holeNumber,
            par: variables.par,
            grossScore: variables.grossScore,
            type: d.achievementType,
          });
          setPendingAchievementId(achResult.achievementId);
          setPendingAchievement({
            type: d.achievementType,
            holeId: variables.holeId,
            holeNumber: variables.holeNumber,
            par: variables.par,
            grossScore: variables.grossScore,
            userId: variables.userId,
            playerName: correctedPlayer?.nickname ?? correctedPlayer?.user?.name ?? "Player",
          });
        } catch {
          // Achievement creation failed silently — score is still saved
        }
      }
    },
    onError: (e) => toast.error(e.message),
  });

  function playerName(p: GroupPlayer) {
    return p.nickname ?? p.user?.name ?? `User ${p.userId}`;
  }

  function playerInitials(p: GroupPlayer) {
    return (playerName(p))
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  // Players not yet assigned to any group (available for selection)
  const availablePlayers = (players ?? []).filter((p) => !assignedUserIds.has(p.userId));

  function openCorrect(p: GroupPlayer) {
    setCorrectPlayer(p);
    setCorrectHoleId("");
    setCorrectGross("");
    setCorrectOpen(true);
  }

  function openScorecard(p: GroupPlayer) {
    setScorecardPlayer(p);
    setScorecardOpen(true);
  }

  function renderGroupPlayers(group: { id: number; name: string; pairsLocked: boolean; players: GroupPlayer[] }) {
    const pairA = group.players.filter((p) => p.pairId === 1);
    const pairB = group.players.filter((p) => p.pairId === 2);
    const unpaired = group.players.filter((p) => !p.pairId);

    function PlayerChip({ p, color }: { p: GroupPlayer; color: string }) {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full pl-1 pr-2 py-0.5 text-xs ${color}`}>
          <Avatar className="w-5 h-5 flex-shrink-0">
            {p.photoUrl && <AvatarImage src={p.photoUrl} alt={playerName(p)} />}
            <AvatarFallback className="text-[9px] font-bold bg-black/20">
              {playerInitials(p)}
            </AvatarFallback>
          </Avatar>
          {playerName(p)}
          {p.currentHandicap != null && (
            <span className="opacity-60 font-normal">{p.currentHandicap}</span>
          )}
          <button
            className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
            title="View scorecard"
            onClick={() => openScorecard(p)}
          >
            <ClipboardList className="w-3 h-3" />
          </button>
          <button
            className="opacity-60 hover:opacity-100 transition-opacity"
            title="Correct score"
            onClick={() => openCorrect(p)}
          >
            <Pencil className="w-3 h-3" />
          </button>
          {!group.pairsLocked && (
            <button
              className="opacity-60 hover:opacity-100 transition-opacity"
              title="Remove from group"
              onClick={() => removePlayer.mutate({ groupId: group.id, userId: p.userId })}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      );
    }

    return (
      <div className="space-y-3">
        {pairA.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge className="text-xs bg-blue-600 text-white shrink-0">Pair A</Badge>
            <div className="flex flex-wrap gap-1">
              {pairA.map((p) => (
                <PlayerChip key={p.userId} p={p} color="bg-blue-600/20 text-blue-300 border border-blue-600/30" />
              ))}
            </div>
          </div>
        )}
        {pairB.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge className="text-xs bg-orange-600 text-white shrink-0">Pair B</Badge>
            <div className="flex flex-wrap gap-1">
              {pairB.map((p) => (
                <PlayerChip key={p.userId} p={p} color="bg-orange-600/20 text-orange-300 border border-orange-600/30" />
              ))}
            </div>
          </div>
        )}
        {unpaired.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs shrink-0">Unpaired</Badge>
            <div className="flex flex-wrap gap-1">
              {unpaired.map((p) => (
                <PlayerChip key={p.userId} p={p} color="bg-muted text-muted-foreground" />
              ))}
            </div>
          </div>
        )}
        {group.players.length === 0 && (
          <p className="text-xs text-muted-foreground">No players in this group.</p>
        )}
      </div>
    );
  }

  // Selected hole info for score correction
  const selectedHole = roundData?.holes.find((h) => h.id.toString() === correctHoleId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/trips/${tId}/rounds`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <Users className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">Groups</h1>
            <p className="text-xs text-muted-foreground">{roundData?.round.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/trip/${tId}/round/${rId}/teesheet`}>
            <Button size="sm" variant="outline" className="gap-2">
              <Flag className="w-4 h-4" /> Tee Sheet
            </Button>
          </Link>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setAutoGroupOpen(true)}>
            <Shuffle className="w-4 h-4" /> Auto-Group
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setReseedOpen(true)}>
            <Copy className="w-4 h-4" /> Copy / Re-seed
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setGroupOpen(true)}>
            <Plus className="w-4 h-4" /> New Group
          </Button>
        </div>
      </header>

      {/* Unassigned players banner */}
      {availablePlayers.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-amber-400 font-medium shrink-0">{availablePlayers.length} unassigned:</span>
          {availablePlayers.map((p) => (
            <span key={p.userId} className="text-xs text-amber-300 bg-amber-500/10 rounded-full px-2 py-0.5">
              {p.nickname ?? p.user?.name ?? `Player ${p.userId}`} (HCP {p.currentHandicap})
            </span>
          ))}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        {!groups || groups.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No groups yet.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setAutoGroupOpen(true)} className="gap-2">
                <Shuffle className="w-4 h-4" /> Auto-Group All
              </Button>
              <Button onClick={() => setGroupOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Create Group
              </Button>
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{group.name}</h3>
                  {group.pairsLocked && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Lock className="w-3 h-3" /> Pairs Locked
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{group.players.length} players</span>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {!group.pairsLocked && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => { setSelectedGroup(group.id); setAddUserId(""); setPlayerOpen(true); }}>
                      <UserPlus className="w-3 h-3" /> Add
                    </Button>
                  )}
                  {group.players.length >= 2 && !group.pairsLocked && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => { setPairGroupId(group.id); setPairOpen(true); }}>
                      <Swords className="w-3 h-3" /> Set Pair
                    </Button>
                  )}
                  {group.players.length >= 2 && !group.pairsLocked && (
                    <Button size="sm" variant="default" className="gap-1 text-xs bg-primary"
                      disabled={lockPairs.isPending}
                      onClick={() => lockPairs.mutate({ groupId: group.id, roundId: rId })}>
                      <Lock className="w-3 h-3" /> Lock
                    </Button>
                  )}
                  {group.pairsLocked && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
                      disabled={unlockPairs.isPending}
                      onClick={() => unlockPairs.mutate({ groupId: group.id })}>
                      <Lock className="w-3 h-3" /> Unlock
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    onClick={() => deleteGroup.mutate({ groupId: group.id })}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {renderGroupPlayers(group as any)}

              {/* Tee time & starting hole */}
              <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Tee Time
                  </label>
                  <input
                    type="time"
                    className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground w-28 focus:outline-none focus:ring-1 focus:ring-primary"
                    value={teeTimeEdits[group.id] ?? (group as any).teeTime ?? ""}
                    onChange={(e) => setTeeTimeEdits((prev) => ({ ...prev, [group.id]: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Flag className="w-3 h-3" /> Starting Hole
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={18}
                    className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground w-20 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="1–18"
                    value={startingHoleEdits[group.id] ?? ((group as any).startingHole != null ? String((group as any).startingHole) : "")}
                    onChange={(e) => setStartingHoleEdits((prev) => ({ ...prev, [group.id]: e.target.value }))}
                  />
                </div>
                <button
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                  disabled={updateSettings.isPending}
                  onClick={() => {
                    const tt = teeTimeEdits[group.id] ?? (group as any).teeTime ?? null;
                    const sh = startingHoleEdits[group.id] !== undefined
                      ? (startingHoleEdits[group.id] === "" ? null : Number(startingHoleEdits[group.id]))
                      : ((group as any).startingHole ?? null);
                    updateSettings.mutate({ groupId: group.id, teeTime: tt || null, startingHole: sh });
                  }}
                >
                  Save
                </button>
                {((group as any).teeTime || (group as any).startingHole) && (
                  <span className="text-xs text-muted-foreground">
                    {(group as any).teeTime && <span className="mr-2">⏰ {(group as any).teeTime}</span>}
                    {(group as any).startingHole && <span>Hole {(group as any).startingHole}</span>}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Group</DialogTitle></DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-1 block">Group Name</label>
            <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Group A" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupOpen(false)}>Cancel</Button>
            <Button
              disabled={!groupName || createGroup.isPending}
              onClick={() => createGroup.mutate({ roundId: rId, tripId: tId, name: groupName })}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Player to Group Dialog — only shows unassigned players */}
      <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Player to Group</DialogTitle>
            <DialogDescription>
              Only players not yet assigned to a group are shown.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-1 block">Player</label>
            <Select value={addUserId} onValueChange={setAddUserId}>
              <SelectTrigger><SelectValue placeholder="Select player..." /></SelectTrigger>
              <SelectContent>
                {availablePlayers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">All players are already assigned.</div>
                ) : (
                  availablePlayers.map((p) => (
                    <SelectItem key={p.userId} value={p.userId.toString()}>
                      {p.nickname ?? p.user?.name ?? `User ${p.userId}`} (HCP {p.currentHandicap})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlayerOpen(false)}>Cancel</Button>
            <Button
              disabled={!addUserId || !selectedGroup || addPlayer.isPending || availablePlayers.length === 0}
              onClick={() => addPlayer.mutate({ groupId: selectedGroup!, userId: Number(addUserId) })}
            >
              Add Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Pair Dialog */}
      <Dialog open={pairOpen} onOpenChange={setPairOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-primary" />
              Assign Pair
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Select two players and assign them as Pair A or Pair B. Pair A will play a 4BBB Stableford Matchplay against Pair B.
            </p>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Pair</label>
              <Select value={pairId} onValueChange={(v) => setPairId(v as "1" | "2")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Pair A (blue)</SelectItem>
                  <SelectItem value="2">Pair B (orange)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Player 1</label>
              <Select value={pairPlayer1} onValueChange={setPairPlayer1}>
                <SelectTrigger><SelectValue placeholder="Select player..." /></SelectTrigger>
                <SelectContent>
                  {groups?.find((g) => g.id === pairGroupId)?.players
                    .filter((p) => p.userId.toString() !== pairPlayer2)
                    .map((p) => (
                      <SelectItem key={p.userId} value={p.userId.toString()}>
                        {p.nickname ?? p.user?.name ?? `User ${p.userId}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Player 2 (partner)</label>
              <Select value={pairPlayer2} onValueChange={setPairPlayer2}>
                <SelectTrigger><SelectValue placeholder="Select partner..." /></SelectTrigger>
                <SelectContent>
                  {groups?.find((g) => g.id === pairGroupId)?.players
                    .filter((p) => p.userId.toString() !== pairPlayer1)
                    .map((p) => (
                      <SelectItem key={p.userId} value={p.userId.toString()}>
                        {p.nickname ?? p.user?.name ?? `User ${p.userId}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPairOpen(false)}>Cancel</Button>
            <Button
              disabled={!pairPlayer1 || !pairPlayer2 || !pairGroupId || setPair.isPending}
              onClick={() => setPair.mutate({
                groupId: pairGroupId!,
                player1UserId: Number(pairPlayer1),
                player2UserId: Number(pairPlayer2),
                pairId: Number(pairId) as 1 | 2,
              })}
            >
              Assign Pair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Group Dialog */}
      <Dialog open={autoGroupOpen} onOpenChange={setAutoGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-primary" />
              Auto-Group Players
            </DialogTitle>
            <DialogDescription>
              Automatically creates groups and pairs all {players?.length ?? 0} trip players. Pairs are formed by matching lowest handicaps with highest (snake draft), so each group has a balanced match.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
              ⚠️ This will delete all existing groups for this round and recreate them.
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Number of Groups <span className="text-muted-foreground font-normal">(optional — default: auto)</span>
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={autoGroupCount}
                onChange={(e) => setAutoGroupCount(e.target.value)}
                placeholder={`Auto (${Math.ceil((players?.length ?? 0) / 4)} groups)`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to auto-calculate based on {players?.length ?? 0} players (4 per group).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoGroupOpen(false)}>Cancel</Button>
            <Button
              disabled={autoGroup.isPending}
              onClick={() => autoGroup.mutate({
                roundId: rId,
                tripId: tId,
                groupCount: autoGroupCount ? Number(autoGroupCount) : undefined,
              })}
            >
              {autoGroup.isPending ? "Grouping..." : "Auto-Group Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Score Correction Dialog */}
      <Dialog open={correctOpen} onOpenChange={(open) => { if (!open) { setCorrectOpen(false); setCorrectPlayer(null); setCorrectHoleId(""); setCorrectGross(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Correct Score
            </DialogTitle>
            <DialogDescription>
              Overwrite any hole score for{" "}
              <span className="font-semibold text-foreground">
                {correctPlayer ? playerName(correctPlayer) : ""}
              </span>
              . Net score and Stableford points will be recalculated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Hole</label>
              <Select value={correctHoleId} onValueChange={setCorrectHoleId}>
                <SelectTrigger><SelectValue placeholder="Select hole..." /></SelectTrigger>
                <SelectContent>
                  {(roundData?.holes ?? []).map((h) => (
                    <SelectItem key={h.id} value={h.id.toString()}>
                      Hole {h.holeNumber} — Par {h.par} (SI {h.strokeIndex})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Gross Score
                {selectedHole && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    Par {selectedHole.par} · SI {selectedHole.strokeIndex}
                  </span>
                )}
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={correctGross}
                onChange={(e) => setCorrectGross(e.target.value)}
                placeholder="e.g. 5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCorrectOpen(false); setCorrectPlayer(null); setCorrectHoleId(""); setCorrectGross(""); }}>Cancel</Button>
            <Button
              disabled={!correctHoleId || !correctGross || !correctPlayer || adminCorrect.isPending || !selectedHole}
              onClick={() => {
                if (!correctPlayer || !selectedHole) return;
                adminCorrect.mutate({
                  roundId: rId,
                  userId: correctPlayer.userId,
                  holeId: selectedHole.id,
                  holeNumber: selectedHole.holeNumber,
                  par: selectedHole.par,
                  strokeIndex: selectedHole.strokeIndex,
                  grossScore: Number(correctGross),
                  handicap: correctPlayer.currentHandicap ?? 0,
                });
              }}
            >
              {adminCorrect.isPending ? "Saving..." : "Save Correction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy / Re-seed Groupings Dialog */}
      <Dialog open={reseedOpen} onOpenChange={(open) => { if (!open) { setReseedOpen(false); setReseedStep("configure"); setReseedPreviewEnabled(false); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-primary" />
              {reseedStep === "preview" ? "Preview Proposed Groups" : "Copy / Re-seed Groupings"}
            </DialogTitle>
            <DialogDescription>
              {reseedStep === "preview"
                ? "Review the proposed groups below. Click Apply to commit, or Back to change settings."
                : "Import groupings from another round into this one. Existing groups will be cleared first."}
            </DialogDescription>
          </DialogHeader>

          {reseedStep === "configure" ? (
            <div className="space-y-5 py-2">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
                ⚠️ This will delete all existing groups for this round and replace them.
              </div>

              {/* Mode selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Method</label>
                <div className="grid grid-cols-1 gap-2">
                  {([
                    { value: "copy", label: "Copy exact groupings & pairings", desc: "Same groups, same partners — ideal when partnerships carry over unchanged." },
                    { value: "4bbb", label: "Re-seed by 4BBB pair standings", desc: "Best pair from the source round goes into Group 1, second pair into Group 2, etc." },
                    { value: "individual", label: "Re-seed by individual trip standings", desc: "Snake draft by cumulative net score — top and bottom players in the same group for competitive balance." },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setReseedMode(opt.value)}
                      className={`text-left rounded-lg border px-4 py-3 transition-colors ${
                        reseedMode === opt.value
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs mt-0.5 opacity-75">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Source round selector (copy + 4bbb) */}
              {(reseedMode === "copy" || reseedMode === "4bbb") && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Source Round</label>
                  <Select value={reseedSourceRoundId} onValueChange={setReseedSourceRoundId}>
                    <SelectTrigger><SelectValue placeholder="Select source round..." /></SelectTrigger>
                    <SelectContent>
                      {otherRounds.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No other rounds in this trip.</div>
                      ) : (
                        otherRounds.map((r) => (
                          <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Group size (4bbb + individual) */}
              {(reseedMode === "4bbb" || reseedMode === "individual") && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Players per Group</label>
                  <Select value={reseedGroupSize} onValueChange={setReseedGroupSize}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 players (pairs only)</SelectItem>
                      <SelectItem value="4">4 players (standard)</SelectItem>
                      <SelectItem value="6">6 players</SelectItem>
                      <SelectItem value="8">8 players</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            /* Preview step — drag-to-edit */
            <div className="py-2 space-y-3">
              {previewFetching ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading preview...</div>
              ) : editableGroups.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground">Drag players between groups to adjust before applying.</p>
                  <DndContext
                    sensors={dndSensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                    {editableGroups.map((g, gi) => (
                      <div key={gi} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-foreground">{g.name}</p>
                          <span className="text-xs text-muted-foreground">{g.players.length} players</span>
                        </div>
                        <SortableContext
                          items={g.players.map((p) => `${gi}-${p.userId}`)}
                          strategy={rectSortingStrategy}
                        >
                          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                            {g.players.map((p) => (
                              <DraggablePlayerChip
                                key={`${gi}-${p.userId}`}
                                id={`${gi}-${p.userId}`}
                                displayName={p.displayName}
                                handicap={p.handicap}
                                isDragging={activeDragId === `${gi}-${p.userId}`}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </div>
                    ))}
                    <DragOverlay>
                      {activeDragId ? (() => {
                        const [gi, uid] = activeDragId.split("-").map(Number);
                        const p = editableGroups[gi]?.players.find((pl) => pl.userId === uid);
                        return p ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary border border-primary/40 text-primary-foreground px-2 py-0.5 text-xs shadow-lg cursor-grabbing">
                            <GripVertical className="w-3 h-3 opacity-60" />
                            <span className="font-medium">{p.displayName}</span>
                            <span className="opacity-70">HC:{p.handicap}</span>
                          </span>
                        ) : null;
                      })() : null}
                    </DragOverlay>
                  </DndContext>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">No groups to preview.</div>
              )}
            </div>
          )}

          <DialogFooter>
            {reseedStep === "configure" ? (
              <>
                <Button variant="outline" onClick={() => setReseedOpen(false)}>Cancel</Button>
                <Button
                  disabled={(reseedMode !== "individual" && !reseedSourceRoundId)}
                  onClick={() => {
                    setReseedPreviewEnabled(true);
                    setReseedStep("preview");
                  }}
                >
                  Preview
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setReseedStep("configure"); setReseedPreviewEnabled(false); }}>← Back</Button>
                <Button
                  disabled={previewFetching || applyCustom.isPending}
                  onClick={() => {
                    // Always apply the current editableGroups state (which may have been drag-edited)
                    applyCustom.mutate({
                      targetRoundId: rId,
                      tripId: tId,
                      groups: editableGroups.map((g) => ({
                        name: g.name,
                        userIds: g.players.map((p) => p.userId),
                      })),
                    });
                  }}
                >
                  {applyCustom.isPending ? "Applying..." : "Apply Groupings"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Achievement Verification Dialog (for admin-corrected scores) */}
      <Dialog open={!!pendingAchievement} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              {pendingAchievement?.type === "hole_in_one" ? "🏆" : pendingAchievement?.type === "eagle" ? "🦅" : "🐦"}
              {pendingAchievement?.type === "hole_in_one" ? "Hole-in-One!" : pendingAchievement?.type === "eagle" ? "Eagle!" : "Birdie!"}
            </DialogTitle>
            <DialogDescription>
              <strong>{pendingAchievement?.playerName}</strong> scored a{" "}
              {pendingAchievement?.type === "hole_in_one" ? "hole-in-one" : pendingAchievement?.type === "eagle" ? "eagle" : "birdie"}{" "}
              ({pendingAchievement?.grossScore} on Par {pendingAchievement?.par}) on Hole {pendingAchievement?.holeNumber}.
              Please verify this score is correct before broadcasting to all players.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                // Dismiss without broadcasting
                setPendingAchievement(null);
                setPendingAchievementId(null);
              }}
            >
              Score is Wrong
            </Button>
            <Button
              onClick={() => {
                if (pendingAchievementId && pendingAchievement) {
                  confirmAchievement.mutate(
                    {
                      achievementId: pendingAchievementId,
                      tripId: tId,
                      playerName: pendingAchievement.playerName,
                    },
                    {
                      onSuccess: () => toast.success("Achievement confirmed & broadcast!", { duration: 6000 }),
                      onError: (e) => toast.error(e.message),
                    }
                  );
                }
                setPendingAchievement(null);
                setPendingAchievementId(null);
              }}
              disabled={confirmAchievement.isPending}
              className="gap-2"
            >
              Confirm &amp; Broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Admin Per-Player Scorecard Drawer */}
      <Sheet open={scorecardOpen} onOpenChange={(open) => { setScorecardOpen(open); if (!open) setScorecardPlayer(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              {scorecardPlayer ? (scorecardPlayer.nickname ?? scorecardPlayer.user?.name ?? `Player ${scorecardPlayer.userId}`) : "Scorecard"}
            </SheetTitle>
            <SheetDescription>
              Full 18-hole scorecard · HC: {scorecardPlayer?.currentHandicap ?? "—"}
            </SheetDescription>
          </SheetHeader>

          {!scorecardData ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading scorecard...</div>
          ) : (
            <div className="space-y-1">
              {/* Header row */}
              <div className="grid grid-cols-[2rem_3rem_3rem_3rem_3rem_3rem_2.5rem] gap-1 text-xs font-semibold text-muted-foreground px-2 pb-1 border-b border-border">
                <span>Hole</span>
                <span className="text-center">Par</span>
                <span className="text-center">SI</span>
                <span className="text-center">Gross</span>
                <span className="text-center">Net</span>
                <span className="text-center">Pts</span>
                <span className="text-center">Fix</span>
              </div>
              {scorecardData.map(({ hole, score }) => (
                <div
                  key={hole.id}
                  className={`grid grid-cols-[2rem_3rem_3rem_3rem_3rem_3rem_2.5rem] gap-1 items-center text-sm px-2 py-1.5 rounded ${
                    score ? "bg-card" : "bg-muted/30"
                  }`}
                >
                  <span className="font-bold text-foreground">{hole.holeNumber}</span>
                  <span className="text-center text-muted-foreground">{hole.par}</span>
                  <span className="text-center text-muted-foreground">{hole.strokeIndex}</span>
                  {score ? (
                    <>
                      <span className={`text-center font-semibold ${
                        score.grossScore <= hole.par - 2 ? "text-yellow-400" :
                        score.grossScore === hole.par - 1 ? "text-green-400" :
                        score.grossScore === hole.par ? "text-foreground" :
                        "text-red-400"
                      }`}>{score.grossScore}</span>
                      <span className="text-center text-muted-foreground">{score.netScore ?? "—"}</span>
                      <span className={`text-center font-medium ${
                        (score.stablefordPoints ?? 0) >= 3 ? "text-green-400" :
                        (score.stablefordPoints ?? 0) === 2 ? "text-foreground" :
                        "text-muted-foreground"
                      }`}>{score.stablefordPoints ?? 0}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-center text-muted-foreground/40">—</span>
                      <span className="text-center text-muted-foreground/40">—</span>
                      <span className="text-center text-muted-foreground/40">—</span>
                    </>
                  )}
                  <div className="flex justify-center">
                    <button
                      title="Correct this score"
                      className="opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded"
                      onClick={() => {
                        if (!scorecardPlayer) return;
                        setCorrectPlayer(scorecardPlayer);
                        setCorrectHoleId(hole.id.toString());
                        setCorrectGross(score?.grossScore?.toString() ?? "");
                        setCorrectOpen(true);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Totals row */}
              {(() => {
                const saved = scorecardData.filter((r) => r.score);
                const totalGross = saved.reduce((s, r) => s + (r.score?.grossScore ?? 0), 0);
                const totalPts = saved.reduce((s, r) => s + (r.score?.stablefordPoints ?? 0), 0);
                return saved.length > 0 ? (
                  <div className="grid grid-cols-[2rem_3rem_3rem_3rem_3rem_3rem_2.5rem] gap-1 items-center text-sm px-2 py-2 border-t border-border mt-2 font-semibold">
                    <span className="text-muted-foreground text-xs">Total</span>
                    <span /><span />
                    <span className="text-center">{totalGross}</span>
                    <span />
                    <span className="text-center text-primary">{totalPts}</span>
                    <span />
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Draggable player chip for the reseed preview drag-to-edit
function DraggablePlayerChip({
  id,
  displayName,
  handicap,
  isDragging,
}: {
  id: string;
  displayName: string;
  handicap: number;
  isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };
  return (
    <span
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 text-xs cursor-grab active:cursor-grabbing select-none"
    >
      <GripVertical className="w-3 h-3 opacity-40" />
      <span className="font-medium">{displayName}</span>
      <span className="opacity-60">HC:{handicap}</span>
    </span>
  );
}
