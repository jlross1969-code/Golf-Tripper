import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Upload, ImageIcon, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type TournamentType =
  | "stableford"
  | "stableford_4bbb"
  | "stroke"
  | "stroke_4bbb"
  | "matchplay"
  | "ambrose"
  | "alternate_shot";

const TOURNAMENT_OPTIONS: { value: TournamentType; label: string; description: string; badge: string }[] = [
  {
    value: "stableford",
    label: "Stableford",
    description: "Individual Stableford points. Trip leaderboard ranks players by total points.",
    badge: "Individual",
  },
  {
    value: "stableford_4bbb",
    label: "Stableford + 4BBB",
    description: "Individual Stableford points plus a 4BBB pairs leaderboard. Both contribute to trip standings.",
    badge: "Individual + Pairs",
  },
  {
    value: "stroke",
    label: "Stroke Play",
    description: "Net stroke play. Trip leaderboard ranks players by total net strokes (lowest wins).",
    badge: "Individual",
  },
  {
    value: "stroke_4bbb",
    label: "Stroke + 4BBB",
    description: "Net stroke play plus a 4BBB pairs leaderboard. Both contribute to trip standings.",
    badge: "Individual + Pairs",
  },
  {
    value: "matchplay",
    label: "Match Play (Pennant)",
    description: "Team-based pennant match play. Trip leaderboard shows team wins, halves, and losses.",
    badge: "Team",
  },
  {
    value: "ambrose",
    label: "Ambrose (Scramble)",
    description: "Team scramble format. Results shown on daily round leaderboard only — no trip total.",
    badge: "Specialty",
  },
  {
    value: "alternate_shot",
    label: "Alternate Shot (Foursomes)",
    description: "Pairs alternate hitting the same ball. Results shown on daily round leaderboard only — no trip total.",
    badge: "Specialty",
  },
];

const BADGE_COLOURS: Record<string, string> = {
  Individual: "bg-blue-500/15 text-blue-400",
  "Individual + Pairs": "bg-emerald-500/15 text-emerald-400",
  Team: "bg-purple-500/15 text-purple-400",
  Specialty: "bg-amber-500/15 text-amber-400",
};

interface EditTripDialogProps {
  tripId: number;
  trip: {
    id: number;
    name: string;
    startDate: Date | string | number;
    endDate: Date | string | number;
    tournamentType?: string | null;
    location?: string | null;
    description?: string | null;
    rules?: string | null;
    logoUrl?: string | null;
  } | null | undefined;
  onSuccess?: () => void;
  /** If true, the tournament type selector is shown as a required field (used in create flow) */
  showTournamentType?: boolean;
}

export function EditTripDialog({ tripId, trip, onSuccess, showTournamentType = true }: EditTripDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tournamentType, setTournamentType] = useState<TournamentType>("stableford");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [tripHasStarted, setTripHasStarted] = useState(false);

  const utils = trpc.useUtils();
  const updateTrip = trpc.trips.update.useMutation({
    onSuccess: () => {
      toast.success("Trip updated");
      setOpen(false);
      utils.trips.get.invalidate({ id: tripId });
      utils.trips.list.invalidate();
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  function openDialog() {
    if (!trip) return;
    setName(trip.name);
    setStartDate(new Date(trip.startDate).toISOString().split("T")[0]);
    setEndDate(new Date(trip.endDate).toISOString().split("T")[0]);
    setTournamentType((trip.tournamentType as TournamentType) ?? "stableford");
    setLocation(trip.location ?? "");
    setDescription(trip.description ?? "");
    setRules((trip as any).rules ?? "");
    setLogoUrl((trip as any).logoUrl ?? "");
    // Detect if trip has started by checking if startDate is in the past
    // The backend will also enforce this — this is just a UI hint
    const now = Date.now();
    const start = new Date(trip.startDate).getTime();
    setTripHasStarted(start <= now);
    setOpen(true);
  }

  async function uploadLogo(file: File) {
    setLogoUploading(true);
    try {
      const form = new FormData();
      form.append("logo", file);
      form.append("tripId", String(tripId));
      const res = await fetch("/api/upload/trip-logo", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setLogoUrl(json.url);
      toast.success("Logo uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  }

  const selectedOption = TOURNAMENT_OPTIONS.find((o) => o.value === tournamentType);
  const originalTournamentType = (trip?.tournamentType as TournamentType) ?? "stableford";
  const tournamentTypeChanged = tournamentType !== originalTournamentType;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={openDialog}
        disabled={!trip}
      >
        <Pencil className="w-3.5 h-3.5" /> Edit Trip
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Trip Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Trip name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Start Date *</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">End Date *</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {showTournamentType && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Tournament Type *
                </label>
                {tripHasStarted ? (
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-300">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Tournament type cannot be changed after the trip has started.</span>
                  </div>
                ) : (
                  <>
                    <Select value={tournamentType} onValueChange={(v) => setTournamentType(v as TournamentType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TOURNAMENT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <span>{opt.label}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${BADGE_COLOURS[opt.badge]}`}>
                                {opt.badge}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedOption && (
                      <p className="text-xs text-muted-foreground mt-1.5">{selectedOption.description}</p>
                    )}
                    {tournamentTypeChanged && (
                      <div className="flex items-start gap-2 p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-300 mt-2">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>Changing the tournament type will update all scheduled rounds to match the new format.</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. St Andrews, Scotland" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional trip notes or details..." rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Trip Rules</label>
              <Textarea value={rules} onChange={(e) => setRules(e.target.value)} placeholder="e.g. Handicap allowance 75%, nearest to pin on par 3s..." rows={4} />
              <p className="text-xs text-muted-foreground mt-1">Rules appear on the trip page and in invite emails.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Trip Logo</label>
              {logoUrl ? (
                <div className="flex items-center gap-3 mb-2">
                  <img src={logoUrl} alt="Trip logo" className="w-16 h-16 rounded-lg object-contain border border-border bg-card" />
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setLogoUrl("")}>
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 border border-dashed border-border rounded-lg text-muted-foreground mb-2">
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-xs">No logo set</span>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <Button size="sm" variant="outline" className="gap-1 text-xs pointer-events-none" disabled={logoUploading}>
                  <Upload className="w-3 h-3" /> {logoUploading ? "Uploading..." : "Upload Logo"}
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!name || !startDate || !endDate || updateTrip.isPending}
              onClick={() => updateTrip.mutate({
                id: tripId,
                name,
                startDate,
                endDate,
                tournamentType: tripHasStarted ? undefined : tournamentType,
                location: location || undefined,
                description: description || undefined,
                rules: rules || undefined,
                logoUrl: logoUrl || undefined,
              })}
            >
              {updateTrip.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
