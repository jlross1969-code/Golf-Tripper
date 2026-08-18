import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bot, Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";

export default function AdminTripFaqs() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const utils = trpc.useUtils();
  const { data: trip } = trpc.trips.get.useQuery({ id });
  const { data: faqs = [] } = trpc.tripFaqs.list.useQuery({ tripId: id });
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const refresh = () => utils.tripFaqs.list.invalidate({ tripId: id });
  const createFaq = trpc.tripFaqs.create.useMutation({ onSuccess: () => { setQuestion(""); setAnswer(""); void refresh(); } });
  const updateFaq = trpc.tripFaqs.update.useMutation({ onSuccess: () => { setQuestion(""); setAnswer(""); setEditingId(null); void refresh(); } });
  const deleteFaq = trpc.tripFaqs.delete.useMutation({ onSuccess: () => void refresh() });

  const submit = () => {
    if (!question.trim() || !answer.trim()) return;
    if (editingId) updateFaq.mutate({ id: editingId, question: question.trim(), answer: answer.trim() });
    else createFaq.mutate({ tripId: id, question: question.trim(), answer: answer.trim() });
  };
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
          <p className="mt-1 text-sm text-muted-foreground">Use FAQs for trip-specific details such as tee times, dress rules, accommodation, or local rules.</p>
          <div className="mt-4 space-y-3">
            <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Question, e.g. Which tees are we playing?" maxLength={300} />
            <Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Answer shown to players through the assistant" className="min-h-28" maxLength={4000} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={submit} disabled={saving || !question.trim() || !answer.trim()} className="gap-2"><Save className="h-4 w-4" />{editing ? "Save FAQ" : "Add FAQ"}</Button>
              {editing && <Button variant="outline" onClick={() => { setEditingId(null); setQuestion(""); setAnswer(""); }} className="gap-2"><X className="h-4 w-4" />Cancel</Button>}
            </div>
          </div>
        </section>
        <section className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Saved FAQs</h2>
          {faqs.length === 0 ? <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No trip FAQs yet.</div> : faqs.map((faq) => (
            <article key={faq.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h3 className="font-semibold text-foreground">{faq.question}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{faq.answer}</p></div>
                <div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditingId(faq.id); setQuestion(faq.question); setAnswer(faq.answer); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label={`Edit ${faq.question}`}><Edit3 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteFaq.mutate({ id: faq.id })} aria-label={`Delete ${faq.question}`}><Trash2 className="h-4 w-4" /></Button></div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
