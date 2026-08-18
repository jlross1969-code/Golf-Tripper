import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { COLOR_SCHEME_OPTIONS } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { SEASONAL_APPEARANCE_TEMPLATES } from "../../../../shared/seasonalAppearanceTemplates";
import { getAppearanceDateKey, hasAppearanceScheduleConflict } from "../../../../shared/tripAppearanceCalendar";
import { ArrowLeft, CalendarDays, Palette, Save, Trash2 } from "lucide-react";
import { Link, useParams } from "wouter";
import { useMemo, useState } from "react";

function toDateInput(value: Date | string) {
  return getAppearanceDateKey(value);
}

function getCalendarCells(startDate: Date | string, endDate: Date | string) {
  const start = new Date(`${toDateInput(startDate)}T12:00:00`);
  const end = new Date(`${toDateInput(endDate)}T12:00:00`);
  const cells: (Date | null)[] = Array.from({ length: start.getDay() }, () => null);
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) cells.push(new Date(date));
  return cells;
}

export default function AdminTripAppearance() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const utils = trpc.useUtils();
  const { data: trip, isLoading } = trpc.trips.get.useQuery({ id });
  const { data: schedules = [] } = trpc.tripAppearance.list.useQuery({ tripId: id }, { enabled: !!id });
  const { data: templates = [] } = trpc.tripAppearance.listTemplates.useQuery({ tripId: id }, { enabled: !!id });
  const { data: trips = [] } = trpc.trips.list.useQuery();
  const [appearanceDate, setAppearanceDate] = useState("");
  const [colorScheme, setColorScheme] = useState("fairway");
  const [targetTripId, setTargetTripId] = useState("");
  const [templateName, setTemplateName] = useState("");

  const suggestedDate = useMemo(() => appearanceDate || (trip ? toDateInput(trip.startDate) : ""), [appearanceDate, trip]);
  const selectedScheme = COLOR_SCHEME_OPTIONS.find((option) => option.id === colorScheme) ?? COLOR_SCHEME_OPTIONS[0];
  const defaultScheme = COLOR_SCHEME_OPTIONS.find((option) => option.id === (trip as any)?.defaultColorScheme);
  const dateConflict = hasAppearanceScheduleConflict(schedules, suggestedDate) ? schedules.find((schedule) => toDateInput(schedule.appearanceDate) === suggestedDate) : undefined;
  const targetTrips = trips.filter((candidate) => candidate.id !== id);

  const setSchedule = trpc.tripAppearance.set.useMutation({
    onSuccess: () => { setAppearanceDate(""); void utils.tripAppearance.list.invalidate({ tripId: id }); },
  });
  const removeSchedule = trpc.tripAppearance.remove.useMutation({
    onSuccess: () => void utils.tripAppearance.list.invalidate({ tripId: id }),
  });
  const copySchedules = trpc.tripAppearance.copyToTrip.useMutation({
    onSuccess: () => setTargetTripId(""),
  });
  const createTemplate = trpc.tripAppearance.createTemplate.useMutation({
    onSuccess: () => { setTemplateName(""); void utils.tripAppearance.listTemplates.invalidate({ tripId: id }); },
  });
  const removeTemplate = trpc.tripAppearance.removeTemplate.useMutation({
    onSuccess: () => void utils.tripAppearance.listTemplates.invalidate({ tripId: id }),
  });

  if (isLoading) return <div className="p-6"><Skeleton className="h-8 w-56" /><Skeleton className="mt-5 h-56 max-w-xl" /></div>;
  if (!trip) return <div className="p-8 text-muted-foreground">Trip not found.</div>;

  const scheduleTheme = () => {
    if (!suggestedDate) return;
    if (dateConflict && !window.confirm(`Replace the ${COLOR_SCHEME_OPTIONS.find((option) => option.id === dateConflict.colorScheme)?.name ?? "existing"} theme already scheduled for this date?`)) return;
    setSchedule.mutate({
      tripId: id,
      appearanceDate: new Date(`${suggestedDate}T12:00:00.000Z`).toISOString(),
      colorScheme: colorScheme as any,
      replaceExisting: Boolean(dateConflict),
    });
  };

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
        <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="font-semibold">Event-day theme</h2><p className="mt-1 text-sm text-muted-foreground">Set a special scheme for a date during the trip. It overrides the trip default for players without a personal preference.</p></div></div>
        <div className="mt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seasonal templates</p><div className="grid grid-cols-2 gap-2">{SEASONAL_APPEARANCE_TEMPLATES.map((template) => { const option = COLOR_SCHEME_OPTIONS.find((entry) => entry.id === template.colorScheme); return <button key={template.id} type="button" className={`rounded-xl border p-3 text-left transition-colors ${colorScheme === template.colorScheme ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"}`} onClick={() => setColorScheme(template.colorScheme)}><div className="mb-2 h-6 rounded-md" style={{ background: option?.preview }} /><p className="text-sm font-medium">{template.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{template.description}</p></button>; })}</div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input type="date" min={toDateInput(trip.startDate)} max={toDateInput(trip.endDate)} value={suggestedDate} onChange={(event) => setAppearanceDate(event.target.value)} />
          <Select value={colorScheme} onValueChange={setColorScheme}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COLOR_SCHEME_OPTIONS.filter((option) => option.id !== "system").map((option) => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectContent></Select>
          <Button disabled={!suggestedDate || setSchedule.isPending} onClick={scheduleTheme}>{setSchedule.isPending ? "Saving…" : dateConflict ? "Replace" : "Schedule"}</Button>
        </div>
        {dateConflict && <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">A theme is already scheduled for this date. Replacing it requires confirmation.</p>}
        <div className="mt-3 h-12 rounded-lg border border-border" style={{ background: selectedScheme.preview }} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-semibold">Custom templates</h2><p className="mt-1 text-sm text-muted-foreground">Save a colour scheme to reuse for this trip’s event days.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><Input value={templateName} maxLength={64} placeholder="Template name, e.g. Finals Day" onChange={(event) => setTemplateName(event.target.value)} /><Button disabled={templateName.trim().length < 2 || createTemplate.isPending} onClick={() => createTemplate.mutate({ tripId: id, name: templateName.trim(), colorScheme: colorScheme as any })}><Save className="mr-2 h-4 w-4" />Save template</Button></div>
        {templates.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No custom templates saved yet.</p> : <div className="mt-4 grid grid-cols-2 gap-2">{templates.map((template) => { const option = COLOR_SCHEME_OPTIONS.find((entry) => entry.id === template.colorScheme); return <div key={template.id} className={`rounded-xl border p-3 ${colorScheme === template.colorScheme ? "border-primary" : "border-border"}`}><button type="button" className="w-full text-left" onClick={() => setColorScheme(template.colorScheme)}><div className="mb-2 h-6 rounded-md" style={{ background: option?.preview }} /><p className="text-sm font-medium">{template.name}</p><p className="text-xs text-muted-foreground">{option?.name}</p></button><Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-destructive" disabled={removeTemplate.isPending} onClick={() => removeTemplate.mutate({ tripId: id, id: template.id })}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button></div>; })}</div>}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-semibold">Scheduled themes</h2>
        {schedules.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No event-day themes scheduled.</p> : <div className="mt-3 space-y-2">{schedules.map((schedule) => { const scheme = COLOR_SCHEME_OPTIONS.find((option) => option.id === schedule.colorScheme); return <div key={schedule.id} className="flex items-center gap-3 rounded-xl border border-border p-3"><div className="h-9 w-9 rounded-lg border border-border" style={{ background: scheme?.preview }} /><div className="min-w-0 flex-1"><p className="font-medium">{new Date(schedule.appearanceDate).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</p><p className="text-xs text-muted-foreground">{scheme?.name ?? schedule.colorScheme}</p></div><Button variant="ghost" size="icon" aria-label="Remove scheduled theme" disabled={removeSchedule.isPending} onClick={() => removeSchedule.mutate({ tripId: id, id: schedule.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>; })}</div>}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Event-day calendar</h2><p className="text-sm text-muted-foreground">Planned colour themes during this trip.</p></div></div>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">{getCalendarCells(trip.startDate, trip.endDate).map((date, index) => { if (!date) return <div key={`blank-${index}`} className="min-h-14" />; const schedule = schedules.find((entry) => toDateInput(entry.appearanceDate) === toDateInput(date)); const scheme = COLOR_SCHEME_OPTIONS.find((option) => option.id === schedule?.colorScheme); return <button key={date.toISOString()} type="button" className="min-h-14 rounded-lg border border-border p-1 text-left transition-transform hover:scale-[1.02]" style={{ background: scheme?.preview }} onClick={() => setAppearanceDate(toDateInput(date))}><span className={scheme ? "text-xs font-bold text-white" : "text-xs font-semibold"}>{date.getDate()}</span>{schedule && <span className="mt-1 block truncate text-[9px] font-medium text-white">{scheme?.name}</span>}</button>; })}</div>
        <p className="mt-3 text-xs text-muted-foreground">Tap a date to prepare a theme for that event day.</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-semibold">Copy this schedule</h2><p className="mt-1 text-sm text-muted-foreground">Copy all event-day themes to another trip you administer. Each theme keeps the same relative trip day.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><Select value={targetTripId} onValueChange={setTargetTripId}><SelectTrigger><SelectValue placeholder="Choose target trip" /></SelectTrigger><SelectContent>{targetTrips.map((targetTrip) => <SelectItem key={targetTrip.id} value={String(targetTrip.id)}>{targetTrip.name}</SelectItem>)}</SelectContent></Select><Button disabled={!targetTripId || schedules.length === 0 || copySchedules.isPending} onClick={() => copySchedules.mutate({ sourceTripId: id, targetTripId: Number(targetTripId) })}>{copySchedules.isPending ? "Copying…" : "Copy schedule"}</Button></div>
        {schedules.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Schedule an event-day theme before copying it.</p>}{copySchedules.data && <p className="mt-3 text-sm text-primary">Copied {copySchedules.data.copied} scheduled {copySchedules.data.copied === 1 ? "theme" : "themes"}.</p>}
      </section>
    </main>
  </div>;
}
