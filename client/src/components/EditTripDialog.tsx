import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface EditTripDialogProps {
  tripId: number;
  /** Pass the trip object so the dialog pre-fills correctly */
  trip: {
    id: number;
    name: string;
    startDate: Date | string | number;
    endDate: Date | string | number;
    location?: string | null;
    description?: string | null;
    rules?: string | null;
    logoUrl?: string | null;
  } | null | undefined;
  onSuccess?: () => void;
}

export function EditTripDialog({ tripId, trip, onSuccess }: EditTripDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

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
    setLocation(trip.location ?? "");
    setDescription(trip.description ?? "");
    setRules((trip as any).rules ?? "");
    setLogoUrl((trip as any).logoUrl ?? "");
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
