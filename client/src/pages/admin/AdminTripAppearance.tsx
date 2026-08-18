import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { COLOR_SCHEME_OPTIONS } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CalendarDays, Palette, Trash2 } from "lucide-react";
import { Link, useParams } from "wouter";
import { useMemo, useState } from "react";

function toDateInput(value: Date | string) {
  return new Date(value).toLocaleDateString("en-CA");
}

export default function AdminTripAppearance() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const utils = trpc.useUtils();
  const { data: trip, isLoading } = trpc.trips.get.useQuery({ id });
  const { data: schedules = [] } = trpc.tripAppearance.list.useQuery({ tripId: id }, { enabled: !!id });
  const [appearanceDate, setAppearanceDate] = useState("");
  const [colorScheme, setColorScheme] = useState("fairway");

  const suggestedDate = useMemo(() => appearanceDate || (trip ? toDateInput(trip.startDate) : ""), [appearanceDate, trip]);
  const selectedScheme = COLOR_SCHEME_OPTIONS.find((option) => option.id === colorScheme) ?? COLOR_SCHEME_OPTIONS[1];
  const defaultScheme = COLOR_SCHEME_OPTIONS.find((option) => option.id === (trip as any)?.defaultColorScheme);

  const setSchedule = trpc.tripAppearance.set.useMutation({
    onSuccess: () => { setAppearanceDate(""); void utils.tripAppearance.list.invalidate({ tripId: id }); },
  });
  const removeSchedule = trpc.tripAppearance.remove.useMutation({
    onSuccess: () => void utils.tripAppearance.list.invalidate({ tripId: id }),
  });

  if (isLoading) return <div className="p-6"><Skeleton className="h-8 w-56" /><Skeleton className="mt-5 h-56 max-w-xl" /></div>;
  if (!trip) return <div className="p-8 text-muted-foreground">Trip not found.</div>;

  return <div className="min-h-screen bg-background text-foreground">
    <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
      <Link href={`/admin/trips/${id}`}><Button variant="ghost" size="icon" aria-label="Back to trip"><ArrowLeft className="h-5 w-5" /></Button></Link>
      <Palette className="h-5 w-5 text-primary" />
      <div><h1 className="font-semibold">Trip Appearance</h1><p className="text-xs text-muted-foreground">Preview and schedule player-facing colour schemes</p></div>
    </header>
    <main className="mx-auto max-w-2xl space-y-5 p-4 pb-32 sm:pt-8">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-semibold">Trip default preview</h2>
        <p className="mt-1 text-sm text-muted-foreground">{defaultScheme ? `${defaultScheme.name} is applied when a player has no personal appearance preference.` : "No trip default is set. Edit Trip to choose one."}</p>
        <div className="mt-4 rounded-xl border border-border p-4" style={{ background: defaultScheme?.preview ?? "linear-gradient(135deg, #15201c, #24342c)" }}>
          <div className="rounded-lg bg-black/25 p-3 text-white shadow-sm"><p className="font-semibold">{trip.name}</p><p className="mt-0.5 text-xs text-white/75">Player dashboard preview</p></div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="font-semibold">Event-day theme</h2><p className="mt-1 text-sm text-muted-foreground">Set a special scheme for a date during the trip. It automatically overrides the trip default for players without a personal preference.</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input type="date" min={toDateInput(trip.startDate)} max={toDateInput(trip.endDate)} value={suggestedDate} onChange={(event) => setAppearanceDate(event.target.value)} />
          <Select value={colorScheme} onValueChange={setColorScheme}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COLOR_SCHEME_OPTIONS.filter((option) => option.id !== "system").map((option) => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectContent></Select>
          <Button disabled={!suggestedDate || setSchedule.isPending} onClick={() => setSchedule.mutate({ tripId: id, appearanceDate: new Date(`${suggestedDate}T12:00:00.000Z`).toISOString(), colorScheme: colorScheme as any })}>{setSchedule.isPending ? "Saving…" : "Schedule"}</Button>
        </div>
        <div className="mt-3 h-12 rounded-lg border border-border" style={{ background: selectedScheme.preview }} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-semibold">Scheduled themes</h2>
        {schedules.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No event-day themes scheduled.</p> : <div className="mt-3 space-y-2">{schedules.map((schedule) => {
          const scheme = COLOR_SCHEME_OPTIONS.find((option) => option.id === schedule.colorScheme);
          return <div key={schedule.id} className="flex items-center gap-3 rounded-xl border border-border p-3"><div className="h-9 w-9 rounded-lg border border-border" style={{ background: scheme?.preview }} /><div className="min-w-0 flex-1"><p className="font-medium">{new Date(schedule.appearanceDate).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</p><p className="text-xs text-muted-foreground">{scheme?.name ?? schedule.colorScheme}</p></div><Button variant="ghost" size="icon" aria-label="Remove scheduled theme" disabled={removeSchedule.isPending} onClick={() => removeSchedule.mutate({ tripId: id, id: schedule.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>;
        })}</div>}
      </section>
    </main>
  </div>;
}
