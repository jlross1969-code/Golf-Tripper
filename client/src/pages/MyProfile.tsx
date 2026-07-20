import { useState, useRef, useEffect } from "react";
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
  Camera, Bell, BellOff, Flag, Hash, Star,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── Web Push helpers ─────────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    });
    return sub;
  } catch {
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MyProfile() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const { user } = useAuth();

  const { data: trip } = trpc.trips.get.useQuery({ id });
  const { data: players, isLoading: playersLoading } = trpc.players.tripPlayers.useQuery({ tripId: id });
  const { data: history, isLoading: historyLoading } = trpc.players.handicapHistory.useQuery(
    { tripId: id, userId: user?.id },
    { enabled: !!user?.id }
  );
  const { data: rounds } = trpc.rounds.list.useQuery({ tripId: id });
  const { data: roundSummaries, isLoading: summariesLoading } = trpc.players.getMyRoundSummaries.useQuery(
    { tripId: id },
    { enabled: !!user?.id }
  );
  const { data: myAchievements, isLoading: achievementsLoading } = trpc.achievements.listByPlayer.useQuery(
    {},
    { enabled: !!user?.id }
  );

  const me = players?.find((p) => p.userId === user?.id);
  const displayName = me ? (me.nickname ?? me.user?.name ?? "You") : "You";

  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  // Sync photoUrl from server data
  useEffect(() => {
    if (me?.photoUrl) setPhotoUrl(me.photoUrl);
  }, [me?.photoUrl]);

  // Check current push permission
  useEffect(() => {
    if (!("Notification" in window)) return;
    setPushEnabled(Notification.permission === "granted");
  }, []);

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

  // ─── Photo upload ──────────────────────────────────────────────────────────
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5 MB");
      return;
    }
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("tripId", String(id));
      const res = await fetch("/api/upload/profile-photo", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json() as { url: string };
      setPhotoUrl(url);
      utils.players.tripPlayers.invalidate();
      toast.success("Photo updated!");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ─── Push notifications ────────────────────────────────────────────────────
  async function handleEnablePush() {
    if (!("serviceWorker" in navigator)) {
      toast.error("Push notifications are not supported in this browser");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      toast.error("Notification permission denied");
      return;
    }
    const sub = await subscribeToPush();
    if (!sub) {
      toast.error("Failed to subscribe to push notifications");
      return;
    }
    const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subJson),
    });
    if (res.ok) {
      setPushEnabled(true);
      toast.success("Achievement notifications enabled!");
    } else {
      toast.error("Failed to save push subscription");
    }
  }

  async function handleDisablePush() {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/unsubscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    setPushEnabled(false);
    toast.success("Notifications disabled");
  }

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
                {/* Avatar with photo upload */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-black text-primary overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => fileInputRef.current?.click()}
                    title="Tap to change photo"
                  >
                    {photoUrl ? (
                      <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  {/* Achievement count badge */}
                  {myAchievements && myAchievements.length > 0 && (
                    <div
                      className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center text-xs font-black shadow-md"
                      title={`${myAchievements.length} achievement${myAchievements.length !== 1 ? "s" : ""}`}
                    >
                      {myAchievements.length}
                    </div>
                  )}
                  <button
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/80 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    title="Upload photo"
                  >
                    {uploadingPhoto ? (
                      <span className="animate-spin text-xs">⟳</span>
                    ) : (
                      <Camera className="w-3 h-3" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
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

        {/* Push notification toggle */}
        {"Notification" in window && (
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {pushEnabled ? (
                  <Bell className="w-5 h-5 text-primary" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">Achievement Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    {pushEnabled ? "You'll be notified of eagles, birdies & HIOs" : "Get push alerts for eagles, birdies & HIOs"}
                  </p>
                </div>
              </div>
              {pushEnabled ? (
                <Button size="sm" variant="outline" onClick={handleDisablePush}>
                  Turn off
                </Button>
              ) : (
                <Button size="sm" onClick={handleEnablePush}>
                  Enable
                </Button>
              )}
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

        {/* Round-by-round score summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary" /> My Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {summariesLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg mb-2" />)
            ) : !roundSummaries || roundSummaries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No rounds yet. Scores will appear here after each round.
              </p>
            ) : (
              <div className="space-y-2">
                {roundSummaries.map((s) => (
                  <div key={s.roundId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.roundName}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.roundDate ? new Date(s.roundDate).toLocaleDateString() : ""} · {s.holesScored}/18 holes
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground">Gross</p>
                        <p className="text-sm font-bold text-foreground">{s.holesScored > 0 ? s.totalGross : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Net</p>
                        <p className="text-sm font-bold text-foreground">{s.holesScored > 0 ? s.totalNet : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pts</p>
                        <p className="text-sm font-bold text-primary">{s.holesScored > 0 ? s.totalPoints : "—"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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

        {/* Achievement history */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" /> My Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {achievementsLoading ? (
              [1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg mb-2" />)
            ) : !myAchievements || myAchievements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No achievements yet. Eagles, birdies and hole-in-ones will appear here.
              </p>
            ) : (
              <div className="space-y-2">
                {myAchievements.map((a) => {
                  const emoji = a.type === "hole_in_one" ? "🏆" : a.type === "eagle" ? "🦅" : "🐦";
                  const label = a.type === "hole_in_one" ? "Hole-in-One" : a.type === "eagle" ? "Eagle" : "Birdie";
                  return (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                      <span className="text-2xl flex-shrink-0">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {label} — Hole {a.holeNumber} (Par {a.par})
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.roundName ?? "Round"}{a.tripName ? ` · ${a.tripName}` : ""}
                          {a.createdAt ? ` · ${new Date(a.createdAt).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {a.grossScore} shots
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
