import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Plus, Calendar, Users, PlayCircle, CheckCircle, Target, Pencil, Trash2, AlertTriangle, RefreshCw, Zap, Upload, ImageIcon, Lock } from "lucide-react";
import { PremiumFeatureBadge } from "@/components/PremiumFeatureBadge";
import { EditTripDialog } from "@/components/EditTripDialog";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

type Round = {
  id: number;
  name: string;
  status: string;
  roundDate?: Date | null;
  courseId?: number | null;
  strokePlayEnabled: boolean;
  fourBBBEnabled: boolean;
  skinsEnabled: boolean;
  matchPlayEnabled?: boolean;
  alternateShotEnabled?: boolean;
  ambroseEnabled?: boolean;
  ambroseTeamSize?: number;
  mercyRuleEnabled?: boolean;
  mercyRuleStrokes?: number;
  individualScoringMode?: "stableford" | "net_stroke";
  logoUrl?: string;
};

// Specialty tournament types that lock round format toggles
const SPECIALTY_TYPES = ["matchplay", "ambrose", "alternate_shot"] as const;
type SpecialtyType = typeof SPECIALTY_TYPES[number];

function isSpecialtyTrip(tournamentType: string | undefined): tournamentType is SpecialtyType {
  return SPECIALTY_TYPES.includes(tournamentType as SpecialtyType);
}

function specialtyFormatLabel(tournamentType: string): string {
  const labels: Record<string, string> = {
    matchplay: "Match Play",
    ambrose: "Ambrose",
    alternate_shot: "Alternate Shot",
  };
  return labels[tournamentType] ?? tournamentType;
}

// Format badge component for round cards
function RoundFormatBadges({ round, tournamentType }: { round: any; tournamentType?: string }) {
  const isInherited = (flag: boolean, expectedType: string) =>
    flag && tournamentType === expectedType;

  return (
    <div className="flex gap-1.5 flex-wrap">
      {/* Individual scoring mode */}
      {round.individualScoringMode === "net_stroke" ? (
        <Badge variant="outline" className="text-xs text-blue-300 border-blue-700 bg-blue-950/30">🏌️ Net Stroke</Badge>
      ) : (
        <Badge variant="outline" className="text-xs text-yellow-300 border-yellow-700 bg-yellow-950/30">⭐ Stableford</Badge>
      )}
      {/* 4BBB */}
      {round.fourBBBEnabled && (
        <Badge variant="outline" className="text-xs text-cyan-300 border-cyan-700 bg-cyan-950/30">4BBB</Badge>
      )}
      {/* Skins */}
      {round.skinsEnabled && (
        <Badge variant="outline" className="text-xs text-green-300 border-green-700 bg-green-950/30">Skins</Badge>
      )}
      {/* Match Play */}
      {round.matchPlayEnabled && (
        <Badge
          variant="outline"
          className={`text-xs ${isInherited(round.matchPlayEnabled, "matchplay") ? "text-blue-300 border-blue-600 bg-blue-950/40" : "text-blue-300 border-blue-700"}`}
        >
          {isInherited(round.matchPlayEnabled, "matchplay") ? "🏆 Match Play" : "Match Play"}
        </Badge>
      )}
      {/* Alternate Shot */}
      {round.alternateShotEnabled && (
        <Badge
          variant="outline"
          className={`text-xs ${isInherited(round.alternateShotEnabled, "alternate_shot") ? "text-orange-300 border-orange-600 bg-orange-950/40" : "text-orange-300 border-orange-700"}`}
        >
          {isInherited(round.alternateShotEnabled, "alternate_shot") ? "🔄 Alt Shot" : "Alt Shot"}
        </Badge>
      )}
      {/* Ambrose */}
      {round.ambroseEnabled && (
        <Badge
          variant="outline"
          className={`text-xs ${isInherited(round.ambroseEnabled, "ambrose") ? "text-purple-300 border-purple-600 bg-purple-950/40" : "text-purple-300 border-purple-700"}`}
        >
          {isInherited(round.ambroseEnabled, "ambrose") ? "🏌️ Ambrose" : "🏌️ Ambrose"}
        </Badge>
      )}
    </div>
  );
}

export default function AdminRounds() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: tripList } = trpc.trips.list.useQuery();
  const { data: trip } = trpc.trips.get.useQuery({ id });
  const tournamentType = (trip as any)?.tournamentType as string | undefined;
  const isSpecialty = isSpecialtyTrip(tournamentType);

  // Scope guard: must be global admin, trip owner, or co-admin for this trip
  const isGlobalAdmin = user?.role === "admin";
  const tripEntry = tripList?.find((t) => t.id === id);
  const isAuthorized = isGlobalAdmin || (tripEntry && (tripEntry.createdBy === user?.id || (tripEntry as any).isCoAdmin));

  useEffect(() => {
    if (tripList && user && !isAuthorized) navigate("/");
  }, [tripList, user, isAuthorized, navigate]);
  const { data: courses } = trpc.courses.list.useQuery();
  const { data: rounds, refetch } = trpc.rounds.list.useQuery({ tripId: id });
  const { data: existingRounds } = trpc.rounds.list.useQuery({ tripId: id });

  // Create
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [roundDate, setRoundDate] = useState("");
  const [strokePlay, setStrokePlay] = useState(true);
  const [fourBBB, setFourBBB] = useState(false);
  const [skins, setSkins] = useState(false);
  const [matchPlay, setMatchPlay] = useState(false);
  const [alternateShot, setAlternateShot] = useState(false);
  // Individual scoring mode: default from trip.handicapMode
  const [scoringMode, setScoringMode] = useState<"stableford" | "net_stroke">("stableford");
  // Exclusivity helper: team formats (matchPlay/alternateShot/ambrose) cannot combine with 4BBB/Skins or each other
  function setExclusiveTeamFormat(format: "matchPlay" | "alternateShot" | "ambrose", val: boolean) {
    if (val) {
      setMatchPlay(format === "matchPlay");
      setAlternateShot(format === "alternateShot");
      setAmbrose(format === "ambrose");
      setFourBBB(false);
      setSkins(false);
    } else {
      if (format === "matchPlay") setMatchPlay(false);
      if (format === "alternateShot") setAlternateShot(false);
      if (format === "ambrose") setAmbrose(false);
    }
  }

  // Auto-seed state for Create Round dialog
  const [autoSeedEnabled, setAutoSeedEnabled] = useState(false);
  const [autoSeedMethod, setAutoSeedMethod] = useState<"random" | "handicap_mix" | "top_together" | "previous_round">("handicap_mix");
  const [autoSeedPairing, setAutoSeedPairing] = useState<"random" | "keep_last" | "seed_4bbb">("random");
  const [autoSeedTeeOrder, setAutoSeedTeeOrder] = useState<"top_first" | "bottom_first">("top_first");
  const [autoSeedGroupSize, setAutoSeedGroupSize] = useState("4");
  const [autoSeedSourceRoundId, setAutoSeedSourceRoundId] = useState("");

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editRound, setEditRound] = useState<Round | null>(null);
  const [editName, setEditName] = useState("");
  const [editCourseId, setEditCourseId] = useState("");
  const [editRoundDate, setEditRoundDate] = useState("");
  const [editStroke, setEditStroke] = useState(true);
  const [editFourBBB, setEditFourBBB] = useState(false);
  const [editSkins, setEditSkins] = useState(false);
  const [editMatchPlay, setEditMatchPlay] = useState(false);
  const [editAltShot, setEditAltShot] = useState(false);
  const [editMercyEnabled, setEditMercyEnabled] = useState(false);
  const [editMercyStrokes, setEditMercyStrokes] = useState(5);
  const [editAmbroseEnabled, setEditAmbroseEnabled] = useState(false);
  const [editAmbroseTeamSize, setEditAmbroseTeamSize] = useState(4);
  // Create dialog Ambrose state
  const [ambrose, setAmbrose] = useState(false);
  const [ambroseTeamSize, setAmbroseTeamSize] = useState(4);
  // Edit scoring mode
  const [editScoringMode, setEditScoringMode] = useState<"stableford" | "net_stroke">("stableford");
  // Logo upload
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRound, setDeleteRoundState] = useState<Round | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // Complete round confirmation
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeRound, setCompleteRound] = useState<Round | null>(null);
  const [runRecalc, setRunRecalc] = useState(true);

  const applySmartSeed = trpc.groups.applySmartSeed.useMutation({
    onSuccess: (d) => toast.success(`Auto-seeded ${d.groupsCreated} groups`),
    onError: (e) => toast.error(`Auto-seed failed: ${e.message}`),
  });

  const createRound = trpc.rounds.create.useMutation({
    onSuccess: async (data) => {
      toast.success("Round created");
      setOpen(false);
      refetch();
      // Auto-seed groups if enabled
      if (autoSeedEnabled && data.roundId) {
        applySmartSeed.mutate({
          targetRoundId: data.roundId,
          tripId: id,
          seedMethod: autoSeedMethod,
          pairingMethod: autoSeedPairing,
          teeOrder: autoSeedTeeOrder,
          groupSize: Number(autoSeedGroupSize),
          sourceRoundId: autoSeedSourceRoundId ? Number(autoSeedSourceRoundId) : null,
        });
      }
      setName(""); setCourseId(""); setRoundDate("");
      setAutoSeedEnabled(false); setAutoSeedSourceRoundId("");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRound = trpc.rounds.update.useMutation({
    onSuccess: () => { toast.success("Round updated"); setEditOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteRoundMutation = trpc.rounds.delete.useMutation({
    onSuccess: () => { toast.success("Round deleted"); setDeleteOpen(false); setDeleteRoundState(null); setDeleteConfirm(""); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const recalcHandicap = trpc.handicap.recalculateAfterRound.useMutation({
    onSuccess: (d) => toast.success(`Handicaps recalculated — ${d.updated} players updated`),
    onError: (e) => toast.error(e.message),
  });

  async function confirmComplete() {
    if (!completeRound) return;
    await updateRound.mutateAsync({ id: completeRound.id, status: "completed" });
    if (runRecalc) {
      recalcHandicap.mutate({ roundId: completeRound.id, tripId: id });
    }
    setCompleteOpen(false);
    setCompleteRound(null);
    refetch();
  }

  // Edit exclusivity helper
  function setEditExclusiveTeamFormat(format: "matchPlay" | "alternateShot" | "ambrose", val: boolean) {
    if (val) {
      setEditMatchPlay(format === "matchPlay");
      setEditAltShot(format === "alternateShot");
      setEditAmbroseEnabled(format === "ambrose");
      setEditFourBBB(false);
      setEditSkins(false);
    } else {
      if (format === "matchPlay") setEditMatchPlay(false);
      if (format === "alternateShot") setEditAltShot(false);
      if (format === "ambrose") setEditAmbroseEnabled(false);
    }
  }

  function openEdit(round: Round) {
    setEditRound(round);
    setEditName(round.name);
    setEditCourseId(round.courseId?.toString() ?? "");
    setEditRoundDate(round.roundDate ? new Date(round.roundDate).toISOString().split("T")[0] : "");
    setEditStroke(round.strokePlayEnabled);
    setEditFourBBB(round.fourBBBEnabled);
    setEditSkins(round.skinsEnabled);
    setEditMatchPlay(round.matchPlayEnabled ?? false);
    setEditAltShot(round.alternateShotEnabled ?? false);
    setEditMercyEnabled(round.mercyRuleEnabled ?? false);
    setEditMercyStrokes(round.mercyRuleStrokes ?? 5);
    setEditAmbroseEnabled(round.ambroseEnabled ?? false);
    setEditAmbroseTeamSize(round.ambroseTeamSize ?? 4);
    setEditLogoUrl(round.logoUrl ?? "");
    setEditScoringMode(round.individualScoringMode ?? (trip as any)?.handicapMode === "net_stroke" ? "net_stroke" : "stableford");
    setEditOpen(true);
  }

  async function uploadRoundLogo(roundId: number, file: File) {
    setLogoUploading(true);
    try {
      const form = new FormData();
      form.append("logo", file);
      form.append("roundId", String(roundId));
      const res = await fetch("/api/upload/round-logo", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setEditLogoUrl(json.url);
      toast.success("Round logo uploaded");
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  }

  function openDelete(round: Round) {
    setDeleteRoundState(round);
    setDeleteConfirm("");
    setDeleteOpen(true);
  }

  function openComplete(round: Round) {
    setCompleteRound(round);
    setRunRecalc(true);
    setCompleteOpen(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <Calendar className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">Rounds</h1>
            <p className="text-xs text-muted-foreground">{trip?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <EditTripDialog tripId={id} trip={trip} />
          <Button size="sm" className="gap-2" onClick={() => {
            // Seed scoring mode from trip's handicapMode
            setScoringMode((trip as any)?.handicapMode === "net_stroke" ? "net_stroke" : "stableford");
            // Pre-set format toggles from trip tournament type
            if (isSpecialty && tournamentType) {
              const flags = {
                matchplay: { matchPlay: true, alternateShot: false, ambrose: false },
                alternate_shot: { matchPlay: false, alternateShot: true, ambrose: false },
                ambrose: { matchPlay: false, alternateShot: false, ambrose: true },
              }[tournamentType as SpecialtyType] ?? { matchPlay: false, alternateShot: false, ambrose: false };
              setMatchPlay(flags.matchPlay);
              setAlternateShot(flags.alternateShot);
              setAmbrose(flags.ambrose);
              setFourBBB(false);
              setSkins(false);
            }
            setOpen(true);
          }}>
            <Plus className="w-4 h-4" /> New Round
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        {!rounds || rounds.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No rounds yet.</p>
            <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Create First Round</Button>
          </div>
        ) : (
          rounds.map((round) => (
            <div key={round.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-foreground">{round.name}</span>
                    <Badge variant={round.status === "active" ? "default" : round.status === "completed" ? "secondary" : "outline"}>
                      {round.status}
                    </Badge>
                  </div>
                  {(round as any).roundDate && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date((round as any).roundDate).toLocaleDateString()}
                    </p>
                  )}
                  <RoundFormatBadges round={round} tournamentType={tournamentType} />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {round.status === "scheduled" && (
                  <Button size="sm" variant="outline" className="gap-1 text-xs"
                    onClick={() => updateRound.mutate({ id: round.id, status: "active" })}>
                    <PlayCircle className="w-3 h-3" /> Start
                  </Button>
                )}
                {round.status === "active" && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => openComplete(round as Round)}>
                      <CheckCircle className="w-3 h-3" /> Complete
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => recalcHandicap.mutate({ roundId: round.id, tripId: id })}>
                      <RefreshCw className="w-3 h-3" /> Recalc HCP
                    </Button>
                  </>
                )}
                {round.status === "completed" && (
                  <Button size="sm" variant="outline" className="gap-1 text-xs"
                    onClick={() => recalcHandicap.mutate({ roundId: round.id, tripId: id })}>
                    <RefreshCw className="w-3 h-3" /> Recalc HCP
                  </Button>
                )}
                <Link href={`/admin/trips/${id}/rounds/${round.id}/groups`}>
                  <Button size="sm" variant="outline" className="gap-1 text-xs">
                    <Users className="w-3 h-3" /> Groups
                  </Button>
                </Link>
                <Link href={`/admin/trips/${id}/rounds/${round.id}/ntp`}>
                  <Button size="sm" variant="outline" className="gap-1 text-xs">
                    <Target className="w-3 h-3" /> NTP
                  </Button>
                </Link>
                <Link href={`/admin/trips/${id}/rounds/${round.id}/long-drive`}>
                  <Button size="sm" variant="outline" className="gap-1 text-xs">
                    <Zap className="w-3 h-3" /> Long Drive
                    <PremiumFeatureBadge tier="tripPass" label="" tooltip="Long Drive will require a Trip Pass when billing is enabled" className="ml-0.5" />
                  </Button>
                </Link>
                {(round as any).ambroseEnabled && (
                  <Link href={`/round/${round.id}/ambrose`}>
                    <Button size="sm" variant="outline" className="gap-1 text-xs text-purple-300 border-purple-700">
                      🏌️ Ambrose Scores
                    </Button>
                  </Link>
                )}
                {(round as any).matchPlayEnabled && (
                  <Link href={`/admin/trips/${id}/rounds/${round.id}/pennant`}>
                    <Button size="sm" variant="outline" className="gap-1 text-xs text-blue-300 border-blue-700">
                      🏆 Match Play Setup
                    </Button>
                  </Link>
                )}
                <Button size="sm" variant="outline" className="gap-1 text-xs"
                  onClick={() => openEdit(round as Round)}>
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
                {round.status !== "active" && (
                  <Button size="sm" variant="outline" className="gap-1 text-xs text-red-400 border-red-800 hover:bg-red-900/30"
                    onClick={() => openDelete(round as Round)}>
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Round Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Round</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Round Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Day 1 — St Andrews" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Course</label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
                <SelectContent>
                  {courses?.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Date</label>
              <Input type="date" value={roundDate} onChange={(e) => setRoundDate(e.target.value)} />
            </div>
            {/* Individual Scoring Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">Individual Scoring Mode</label>
              <div className="flex gap-2">
                {(["stableford", "net_stroke"] as const).map((m) => (
                  <button key={m} type="button"
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      scoringMode === m
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                    }`}
                    onClick={() => setScoringMode(m)}>
                    {m === "stableford" ? "⭐ Stableford" : "🏌️ Net Stroke"}
                  </button>
                ))}
              </div>
            </div>

            {/* Format section — locked for specialty trips */}
            {isSpecialty ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
                <Lock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Format locked: {specialtyFormatLabel(tournamentType!)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This trip's tournament type automatically sets the round format. Edit the trip settings to change it.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground block">Additional Formats</label>
                {/* 4BBB and Skins — only when no exclusive team format is active */}
                {!matchPlay && !alternateShot && !ambrose && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">4BBB (Best Ball)</span>
                      <Switch checked={fourBBB} onCheckedChange={setFourBBB} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Skins</span>
                      <Switch checked={skins} onCheckedChange={setSkins} />
                    </div>
                  </>
                )}
                {/* Exclusive team formats */}
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground mb-2">Team formats (mutually exclusive — cannot combine with 4BBB/Skins or each other)</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Match Play</span>
                    <Switch checked={matchPlay} onCheckedChange={(v) => setExclusiveTeamFormat("matchPlay", v)} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-foreground">Alternate Shot</span>
                    <Switch checked={alternateShot} onCheckedChange={(v) => setExclusiveTeamFormat("alternateShot", v)} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-foreground">🏌️ Ambrose</span>
                    <Switch checked={ambrose} onCheckedChange={(v) => setExclusiveTeamFormat("ambrose", v)} />
                  </div>
                  {ambrose && (
                    <div className="flex items-center justify-between pl-4 mt-2">
                      <span className="text-sm text-muted-foreground">Team size</span>
                      <div className="flex items-center gap-2">
                        {[2, 3, 4].map((n) => (
                          <Button key={n} size="sm" variant={ambroseTeamSize === n ? "default" : "outline"} className="h-7 w-7 p-0 text-xs" onClick={() => setAmbroseTeamSize(n)}>{n}</Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Auto-Seed Groups section */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-seed groups after creating</p>
                  <p className="text-xs text-muted-foreground">Automatically create and seed groups using Smart Seed</p>
                </div>
                <Switch checked={autoSeedEnabled} onCheckedChange={setAutoSeedEnabled} />
              </div>
              {autoSeedEnabled && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
                  {/* Grouping method */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Grouping Method</label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {([
                        { value: "handicap_mix", label: "Handicap Mix", desc: "Balanced groups — low HCP paired with high HCP." },
                        { value: "top_together", label: "Top Together", desc: "Best players grouped together." },
                        { value: "previous_round", label: "Seed from Previous Round", desc: "Snake-draft by last round's leaderboard." },
                        { value: "random", label: "Random", desc: "Completely random distribution." },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAutoSeedMethod(opt.value)}
                          className={`text-left rounded-md border px-3 py-2 transition-colors text-sm ${
                            autoSeedMethod === opt.value
                              ? "border-primary bg-primary/15 text-foreground"
                              : "border-border/50 bg-card/50 text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-xs opacity-70 ml-2">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Source round selector for previous_round */}
                  {autoSeedMethod === "previous_round" && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Reference Round <span className="text-muted-foreground font-normal">(optional)</span></label>
                      <Select value={autoSeedSourceRoundId} onValueChange={setAutoSeedSourceRoundId}>
                        <SelectTrigger><SelectValue placeholder="Most recent completed round" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Most recent completed round</SelectItem>
                          {(existingRounds ?? []).map((r) => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {/* 4BBB Pairing method */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">4BBB Pairing Within Groups</label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {([
                        { value: "random", label: "Random", desc: "New random partners within each group." },
                        { value: "keep_last", label: "Keep Last Round's Partners", desc: "Same 4BBB partners as the previous round." },
                        { value: "seed_4bbb", label: "Seed by 4BBB Leaderboard", desc: "Best 4BBB pair stays together." },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAutoSeedPairing(opt.value)}
                          className={`text-left rounded-md border px-3 py-2 transition-colors text-sm ${
                            autoSeedPairing === opt.value
                              ? "border-primary bg-primary/15 text-foreground"
                              : "border-border/50 bg-card/50 text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-xs opacity-70 ml-2">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Tee order */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Tee Order</label>
                    <div className="flex gap-2">
                      {([
                        { value: "top_first", label: "Top seed tees first" },
                        { value: "bottom_first", label: "Bottom seed tees first" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAutoSeedTeeOrder(opt.value)}
                          className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                            autoSeedTeeOrder === opt.value
                              ? "border-primary bg-primary/15 text-foreground font-medium"
                              : "border-border/50 bg-card/50 text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Group size */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Players per Group</label>
                    <Select value={autoSeedGroupSize} onValueChange={setAutoSeedGroupSize}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 players (pairs only)</SelectItem>
                        <SelectItem value="4">4 players (standard)</SelectItem>
                        <SelectItem value="6">6 players</SelectItem>
                        <SelectItem value="8">8 players</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!name || !courseId || !roundDate || createRound.isPending}
              onClick={() => createRound.mutate({
                tripId: id, courseId: Number(courseId), name, roundDate,
                strokePlayEnabled: strokePlay, fourBBBEnabled: fourBBB, skinsEnabled: skins,
                matchPlayEnabled: matchPlay, alternateShotEnabled: alternateShot,
                ambroseEnabled: ambrose, ambroseTeamSize,
                individualScoringMode: scoringMode,
              })}
            >
              {createRound.isPending ? "Creating..." : "Create Round"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Round Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Round</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Round Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Round name" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Course</label>
              <Select value={editCourseId} onValueChange={setEditCourseId}>
                <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
                <SelectContent>
                  {courses?.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Date</label>
              <Input type="date" value={editRoundDate} onChange={(e) => setEditRoundDate(e.target.value)} />
            </div>
            {/* Individual Scoring Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">Individual Scoring Mode</label>
              <div className="flex gap-2">
                {(["stableford", "net_stroke"] as const).map((m) => (
                  <button key={m} type="button"
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      editScoringMode === m
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                    }`}
                    onClick={() => setEditScoringMode(m)}>
                    {m === "stableford" ? "⭐ Stableford" : "🏌️ Net Stroke"}
                  </button>
                ))}
              </div>
            </div>

            {/* Format section — locked for specialty trips */}
            {isSpecialty ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
                <Lock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Format locked: {specialtyFormatLabel(tournamentType!)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This trip's tournament type automatically sets the round format. Edit the trip settings to change it.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground block">Additional Formats</label>
                {!editMatchPlay && !editAltShot && !editAmbroseEnabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">4BBB (Best Ball)</span>
                      <Switch checked={editFourBBB} onCheckedChange={setEditFourBBB} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Skins</span>
                      <Switch checked={editSkins} onCheckedChange={setEditSkins} />
                    </div>
                  </>
                )}
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground mb-2">Team formats (mutually exclusive)</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Match Play</span>
                    <Switch checked={editMatchPlay} onCheckedChange={(v) => setEditExclusiveTeamFormat("matchPlay", v)} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-foreground">Alternate Shot</span>
                    <Switch checked={editAltShot} onCheckedChange={(v) => setEditExclusiveTeamFormat("alternateShot", v)} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-foreground">🏌️ Ambrose</span>
                    <Switch checked={editAmbroseEnabled} onCheckedChange={(v) => setEditExclusiveTeamFormat("ambrose", v)} />
                  </div>
                  {editAmbroseEnabled && (
                    <div className="flex items-center justify-between pl-4 mt-2">
                      <span className="text-sm text-muted-foreground">Team size</span>
                      <div className="flex items-center gap-2">
                        {[2, 3, 4].map((n) => (
                          <Button key={n} size="sm" variant={editAmbroseTeamSize === n ? "default" : "outline"} className="h-7 w-7 p-0 text-xs" onClick={() => setEditAmbroseTeamSize(n)}>{n}</Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Round Logo */}
            <div className="space-y-2 border-t border-border pt-3">
              <label className="text-sm font-medium text-foreground block">Round Logo <span className="text-xs text-muted-foreground font-normal">(optional — falls back to trip logo)</span></label>
              {editLogoUrl ? (
                <div className="flex items-center gap-3">
                  <img src={editLogoUrl} alt="Round logo" className="w-14 h-14 rounded-lg object-contain border border-border bg-card" />
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setEditLogoUrl(""); (updateRound.mutate as any)({ id: editRound!.id, logoUrl: "" }); }}>Remove</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 border border-dashed border-border rounded-lg text-muted-foreground">
                  <ImageIcon className="w-4 h-4" /><span className="text-xs">No logo — will use trip logo</span>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <Button size="sm" variant="outline" className="gap-1 text-xs pointer-events-none" disabled={logoUploading}>
                  <Upload className="w-3 h-3" /> {logoUploading ? "Uploading..." : "Upload Logo"}
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f && editRound) uploadRoundLogo(editRound.id, f); e.target.value = ""; }} />
              </label>
            </div>

            {/* Mercy Rule */}
            <div className="space-y-3 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-foreground">Mercy Rule</span>
                  <p className="text-xs text-muted-foreground">Cap max score at par + N strokes</p>
                </div>
                <Switch checked={editMercyEnabled} onCheckedChange={setEditMercyEnabled} />
              </div>
              {editMercyEnabled && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground flex-1">Max over par</span>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-7 w-7" disabled={editMercyStrokes <= 4} onClick={() => setEditMercyStrokes((v) => Math.max(4, v - 1))}>-</Button>
                    <span className="w-6 text-center font-bold text-foreground text-sm">{editMercyStrokes}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" disabled={editMercyStrokes >= 6} onClick={() => setEditMercyStrokes((v) => Math.min(6, v + 1))}>+</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              disabled={!editName || updateRound.isPending}
              onClick={() => editRound && updateRound.mutate({
                id: editRound.id,
                name: editName,
                ...(editCourseId ? { courseId: Number(editCourseId) } : {}),
                ...(editRoundDate ? { roundDate: editRoundDate } : {}),
                strokePlayEnabled: editStroke,
                fourBBBEnabled: editFourBBB,
                skinsEnabled: editSkins,
                matchPlayEnabled: editMatchPlay,
                alternateShotEnabled: editAltShot,
                mercyRuleEnabled: editMercyEnabled,
                mercyRuleStrokes: editMercyStrokes,
                ambroseEnabled: editAmbroseEnabled,
                ambroseTeamSize: editAmbroseTeamSize,
                individualScoringMode: editScoringMode,
              } as any)}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Round Dialog */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteConfirm(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" /> Delete Round
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This will permanently delete <strong className="text-foreground">{deleteRound?.name}</strong> and all its scores, groups, and NTP data. This cannot be undone.
            </p>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Type <span className="font-mono text-red-400">DELETE</span> to confirm
              </label>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="border-red-800 focus-visible:ring-red-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== "DELETE" || deleteRoundMutation.isPending}
              onClick={() => deleteRound && deleteRoundMutation.mutate({ id: deleteRound.id })}
            >
              {deleteRoundMutation.isPending ? "Deleting..." : "Delete Round"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Round Confirmation Dialog */}
      <Dialog open={completeOpen} onOpenChange={(o) => { if (!o) { setCompleteOpen(false); setCompleteRound(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Complete Round
            </DialogTitle>
            <DialogDescription>
              Mark <strong>{completeRound?.name}</strong> as completed. You can optionally run handicap recalculation now so players' handicaps are updated for the next round.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Run handicap recalculation now</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Updates all players' handicaps based on their scores in this round.
                </p>
              </div>
              <Switch checked={runRecalc} onCheckedChange={setRunRecalc} />
            </div>
            {!runRecalc && (
              <p className="text-xs text-amber-400 mt-2">
                ⚠️ You can run handicap recalculation later from the round's "Recalc HCP" button.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCompleteOpen(false); setCompleteRound(null); }}>Cancel</Button>
            <Button
              disabled={updateRound.isPending || recalcHandicap.isPending}
              onClick={confirmComplete}
            >
              {updateRound.isPending ? "Completing..." : runRecalc ? "Complete & Recalc HCP" : "Complete Round"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
