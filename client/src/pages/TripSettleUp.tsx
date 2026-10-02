import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useParams } from "wouter";
import { ArrowLeft, Wallet, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function TripSettleUp() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const utils = trpc.useUtils();
  const { data: me } = trpc.auth.me.useQuery();
  const { data: players } = trpc.players.tripPlayers.useQuery({ tripId: id });
  const { data } = trpc.settleUp.summary.useQuery({ tripId: id });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const nameOf = (userId: number) => {
    const p = players?.find((tp) => tp.userId === userId);
    return p?.nickname ?? p?.user?.name ?? `Player ${userId}`;
  };
  const refresh = () => utils.settleUp.summary.invalidate({ tripId: id });
  const onError = (e: { message: string }) => toast.error(e.message);
  const add = trpc.settleUp.add.useMutation({
    onSuccess: () => { refresh(); setAmount(""); setReason(""); toast.success("Added"); },
    onError,
  });
  const markPaid = trpc.settleUp.markPaid.useMutation({ onSuccess: refresh, onError });
  const remove = trpc.settleUp.remove.useMutation({ onSuccess: refresh, onError });

  const cents = Math.round(parseFloat(amount) * 100);
  const canAdd = from && to && from !== to && cents > 0 && reason.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4 flex items-center gap-3">
        <Link href={`/trip/${id}`}><Button variant="ghost" size="icon" aria-label="Back to trip"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <Wallet className="w-5 h-5 text-primary" />
        <h1 className="font-bold">Settle up</h1>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        <section>
          <h2 className="text-lg font-bold mb-3">Who pays whom</h2>
          {!data?.payments.length && <p className="text-sm text-muted-foreground">Everyone is square.</p>}
          <ul className="space-y-2">
            {data?.payments.map((p, i) => (
              <li key={i} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2 text-sm">
                <span className="font-medium">{nameOf(p.fromUserId)}</span><ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium flex-1">{nameOf(p.toUserId)}</span>
                <b>{dollars(p.amountCents)}</b>
              </li>
            ))}
          </ul>
        </section>
        <section className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="font-bold">Record a side bet</h2>
          <div className="grid grid-cols-2 gap-2">
            <Select value={from} onValueChange={setFrom}><SelectTrigger aria-label="Who owes"><SelectValue placeholder="Who owes" /></SelectTrigger>
              <SelectContent>{players?.map((p) => <SelectItem key={p.userId} value={String(p.userId)}>{nameOf(p.userId)}</SelectItem>)}</SelectContent></Select>
            <Select value={to} onValueChange={setTo}><SelectTrigger aria-label="Who is owed"><SelectValue placeholder="Owed to" /></SelectTrigger>
              <SelectContent>{players?.map((p) => <SelectItem key={p.userId} value={String(p.userId)}>{nameOf(p.userId)}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="flex gap-2">
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount ($)" className="w-32" aria-label="Amount in dollars" />
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Day 2 skins" maxLength={200} aria-label="Reason" />
          </div>
          <Button disabled={!canAdd || add.isPending} onClick={() => add.mutate({ tripId: id, fromUserId: Number(from), toUserId: Number(to), amountCents: cents, reason })}>Add</Button>
        </section>
        <section>
          <h2 className="text-lg font-bold mb-3">Ledger</h2>
          <ul className="divide-y divide-border bg-card border border-border rounded-xl">
            {data?.entries.map((e) => (
              <li key={e.id} className="p-3 text-sm flex flex-wrap items-center gap-2">
                <span className="flex-1 min-w-48">{nameOf(e.fromUserId)} owes {nameOf(e.toUserId)} <b>{dollars(e.amountCents)}</b> · {e.reason}</span>
                {e.settledAt ? <Badge variant="secondary">paid</Badge> : <Badge variant="outline">open</Badge>}
                {(e.toUserId === me?.id || me?.role === "admin") && (
                  <Button size="sm" variant="outline" onClick={() => markPaid.mutate({ tripId: id, id: e.id, paid: !e.settledAt })}>{e.settledAt ? "Reopen" : "Mark paid"}</Button>
                )}
                {(e.createdBy === me?.id || me?.role === "admin") && (
                  <Button size="icon" variant="ghost" aria-label="Delete entry" onClick={() => remove.mutate({ tripId: id, id: e.id })}><Trash2 className="w-4 h-4" /></Button>
                )}
              </li>
            ))}
            {!data?.entries.length && <li className="p-3 text-sm text-muted-foreground">No entries yet.</li>}
          </ul>
        </section>
      </main>
    </div>
  );
}
