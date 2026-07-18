import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link } from "wouter";
import { Plus, Flag, ChevronRight, Settings, Users, Calendar, BarChart2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminTrips() {
  const { user } = useAuth();
  const { data: trips, refetch } = trpc.trips.list.useQuery();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const createTrip = trpc.trips.create.useMutation({
    onSuccess: () => { toast.success("Trip created"); setOpen(false); refetch(); setName(""); setStartDate(""); setEndDate(""); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Flag className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Golf Trip Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/"><Button variant="ghost" size="sm">← Back to App</Button></Link>
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> New Trip
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">All Trips</h2>
          <Link href="/admin/courses">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="w-4 h-4" /> Manage Courses
            </Button>
          </Link>
        </div>

        {!trips || trips.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Flag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No trips created yet.</p>
            <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Create First Trip</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trips.map((trip) => (
              <div key={trip.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-foreground text-lg">{trip.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  {new Date(trip.startDate).toLocaleDateString()} – {new Date(trip.endDate).toLocaleDateString()}
                </p>
                <div className="grid grid-cols-1 gap-2 mt-4">
                  <div className="grid grid-cols-3 gap-2">
                    <Link href={`/admin/trips/${trip.id}/players`}>
                      <button className="w-full flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg bg-emerald-900/40 border border-emerald-700/50 hover:bg-emerald-800/50 active:scale-95 transition-all text-emerald-300">
                        <Users className="w-5 h-5" />
                        <span className="text-xs font-semibold">Players</span>
                      </button>
                    </Link>
                    <Link href={`/admin/trips/${trip.id}/rounds`}>
                      <button className="w-full flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg bg-emerald-900/40 border border-emerald-700/50 hover:bg-emerald-800/50 active:scale-95 transition-all text-emerald-300">
                        <Calendar className="w-5 h-5" />
                        <span className="text-xs font-semibold">Rounds</span>
                      </button>
                    </Link>
                    <Link href={`/admin/trips/${trip.id}/handicap`}>
                      <button className="w-full flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg bg-emerald-900/40 border border-emerald-700/50 hover:bg-emerald-800/50 active:scale-95 transition-all text-emerald-300">
                        <BarChart2 className="w-5 h-5" />
                        <span className="text-xs font-semibold">Handicap</span>
                      </button>
                    </Link>
                  </div>
                  <Link href={`/trip/${trip.id}`}>
                    <button className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white font-semibold text-sm">
                      View Trip <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Trip</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Trip Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Scotland 2025" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">End Date</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!name || !startDate || !endDate || createTrip.isPending}
              onClick={() => createTrip.mutate({ name, startDate, endDate })}
            >
              Create Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
