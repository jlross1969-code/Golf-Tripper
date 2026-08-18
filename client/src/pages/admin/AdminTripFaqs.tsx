import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { TRIP_FAQ_CATEGORIES, tripFaqCategoryLabel, type TripFaqCategory } from "../../../../shared/tripFaq";
import { ArrowLeft, Bot, Edit3, Pin, PinOff, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";

const DEFAULT_CATEGORY: TripFaqCategory = "general";

export default function AdminTripFaqs() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const utils = trpc.useUtils();
  const { data: trip } = trpc.trips.get.useQuery({ id });
  const { data: faqs = [] } = trpc.tripFaqs.list.useQuery({ tripId: id });
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState<TripFaqCategory>(DEFAULT_CATEGORY);
  const [isPinned, setIsPinned] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | TripFaqCategory>("all");

  const refresh = () => utils.tripFaqs.list.invalidate({ tripId: id });
  const resetForm = () => { setQuestion(""); setAnswer(""); setCategory(DEFAULT_CATEGORY); setIsPinned(false); setEditingId(null); };
  const createFaq = trpc.tripFaqs.create.useMutation({ onSuccess: () => { resetForm(); void refresh(); } });
  const updateFaq = trpc.tripFaqs.update.useMutation({ onSuccess: () => { resetForm(); void refresh(); } });
  const deleteFaq = trpc.tripFaqs.delete.useMutation({ onSuccess: () => void refresh() });

  const submit = () => {
    if (!question.trim() || !answer.trim()) return;
    const values = { category, isPinned, question: question.trim(), answer: answer.trim() };
    if (editingId) updateFaq.mutate({ id: editingId, ...values });
    else createFaq.mutate({ tripId: id, ...values });
  };

  const filteredFaqs = useMemo(
    () => filter === "all" ? faqs : faqs.filter((faq) => (faq.category ?? DEFAULT_CATEGORY) === filter),
    [faqs, filter]
  );
  const editing = editingId !== null;
  const saving = createFaq.isPending || updateFaq.isPending;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href={`/admin/trips/${id}`}><Button variant="ghost" size="icon" aria-label="Back to trip admin"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15"><Bot className="h-5 w-5 text-primary" /></div>
          <div><h1 className="font-bold text-foreground">Trip FAQs</h1><p className="text-xs text-muted-foreground">{trip?.name ?? "Trip"} · used by the Golf Trip AI Assistant</p></div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
          <h2 className="font-semibold text-foreground">{editing ? "Edit FAQ" : "Add a trip FAQ"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pinned FAQs are placed first in assistant context. Use categories so players and admins can find details quickly.</p>
          <div className="mt-4 space-y-3">
            <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Question, e.g. Which tees are we playing?" maxLength={300} />
            <Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Answer shown to players through the assistant" className="min-h-28" maxLength={4000} />
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-medium text-muted-foreground">Category
                <select value={category} onChange={(event) => setCategory(event.target.value as TripFaqCategory)} className="ml-2 h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground">
                  {TRIP_FAQ_CATEGORIES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
                </select>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} className="accent-primary" /><Pin className="h-3.5 w-3.5 text-primary" />Pin as important</label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={submit} disabled={saving || !question.trim() || !answer.trim()} className="gap-2"><Save className="h-4 w-4" />{editing ? "Save FAQ" : "Add FAQ"}</Button>
              {editing && <Button variant="outline" onClick={resetForm} className="gap-2"><X className="h-4 w-4" />Cancel</Button>}
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Saved FAQs</h2><div className="flex flex-wrap gap-1">{([{ value: "all", label: "All" }, ...TRIP_FAQ_CATEGORIES] as { value: "all" | TripFaqCategory; label: string }[]).map((entry) => <Button key={entry.value} variant={filter === entry.value ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setFilter(entry.value)}>{entry.label}</Button>)}</div></div>
          {filteredFaqs.length === 0 ? <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No FAQs in this category.</div> : filteredFaqs.map((faq) => (
            <article key={faq.id} className={`rounded-xl border bg-card p-4 ${faq.isPinned ? "border-primary/45" : "border-border"}`}>
              <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-foreground">{faq.question}</h3>{faq.isPinned && <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"><Pin className="h-3 w-3" />Pinned</span>}<span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{tripFaqCategoryLabel(faq.category ?? DEFAULT_CATEGORY)}</span></div><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{faq.answer}</p></div>
                <div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" className="text-primary hover:text-primary" onClick={() => updateFaq.mutate({ id: faq.id, isPinned: !faq.isPinned })} aria-label={faq.isPinned ? "Unpin FAQ" : "Pin FAQ"}>{faq.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}</Button><Button variant="ghost" size="icon" onClick={() => { setEditingId(faq.id); setQuestion(faq.question); setAnswer(faq.answer); setCategory((faq.category ?? DEFAULT_CATEGORY) as TripFaqCategory); setIsPinned(faq.isPinned); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label={`Edit ${faq.question}`}><Edit3 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteFaq.mutate({ id: faq.id })} aria-label={`Delete ${faq.question}`}><Trash2 className="h-4 w-4" /></Button></div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
