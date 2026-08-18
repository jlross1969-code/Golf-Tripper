import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, CheckCircle2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function TripPayments() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const { data: trip } = trpc.trips.get.useQuery({ id });
  const { data: balance, refetch } = trpc.tripFinances.myBalance.useQuery({ tripId: id }, { enabled: !!id });
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const submitPayment = trpc.tripFinances.submitPayment.useMutation({ onSuccess: () => { toast.success("Payment marked as sent for organiser review"); setAmount(""); setNote(""); refetch(); }, onError: (error) => toast.error(error.message) });
  const amountCents = Math.round(Number(amount || 0) * 100);

  return <div className="min-h-screen bg-background"><header className="border-b border-border px-6 py-4"><div className="mx-auto flex max-w-xl items-center gap-3"><Link href={`/trip/${id}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link><Wallet className="h-5 w-5 text-primary" /><div><h1 className="font-bold text-foreground">Trip payment</h1><p className="text-xs text-muted-foreground">{trip?.name}</p></div></div></header><main className="mx-auto max-w-xl space-y-4 px-6 py-8">{balance && <><Card><CardHeader><CardTitle className="text-base">Your balance</CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-3 text-center"><div><p className="text-xs text-muted-foreground">Trip price</p><p className="font-bold text-foreground">{money(balance.priceCents)}</p></div><div><p className="text-xs text-muted-foreground">Confirmed</p><p className="font-bold text-primary">{money(balance.confirmedCents)}</p></div><div><p className="text-xs text-muted-foreground">Outstanding</p><p className="font-bold text-amber-500">{money(balance.outstandingCents)}</p></div></CardContent></Card>{balance.outstandingCents > 0 && <Card><CardHeader><CardTitle className="text-base">Mark payment as sent</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">This records your payment claim for the trip organiser to confirm. It does not process a card payment.</p><Input type="number" min="0.01" max={(balance.outstandingCents / 100).toFixed(2)} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={`Up to ${money(balance.outstandingCents)}`} /><Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional reference or note" maxLength={240} /><Button className="w-full" disabled={amountCents < 1 || amountCents > balance.outstandingCents || submitPayment.isPending} onClick={() => submitPayment.mutate({ tripId: id, amountCents, note: note.trim() || undefined })}>{submitPayment.isPending ? "Submitting…" : "Mark payment as sent"}</Button></CardContent></Card>}<Card><CardHeader><CardTitle className="text-base">Payment history</CardTitle></CardHeader><CardContent className="space-y-2">{balance.payments.length === 0 ? <p className="text-sm text-muted-foreground">No payments recorded yet.</p> : balance.payments.map((payment) => <div key={payment.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"><span>{money(payment.amountCents)}{payment.note ? <span className="block text-xs text-muted-foreground">{payment.note}</span> : null}</span><span className={`inline-flex items-center gap-1 text-xs font-semibold ${payment.status === "confirmed" || payment.status === "manual_confirmed" ? "text-primary" : payment.status === "rejected" ? "text-destructive" : "text-amber-500"}`}><CheckCircle2 className="h-3.5 w-3.5" />{payment.status.replace("_", " ")}</span></div>)}</CardContent></Card></>}</main></div>;
}
