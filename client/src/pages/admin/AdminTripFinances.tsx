import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Banknote, CalendarClock, Check, Download, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const lineTypeLabels = { fixed_cost: "Fixed cost", per_person_cost: "Per-person cost", prize: "Prize", income: "Income / sponsorship" } as const;
type LineType = keyof typeof lineTypeLabels;

export default function AdminTripFinances() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const utils = trpc.useUtils();
  const { data: trip } = trpc.trips.get.useQuery({ id });
  const { data: access } = trpc.tripFinances.access.useQuery({ tripId: id }, { enabled: !!id });
  const { data: summary = [], refetch: refetchSummary } = trpc.tripFinances.summary.useQuery({ tripId: id }, { enabled: !!id && !!access?.canManage });
  const { data: plan, refetch: refetchPlan } = trpc.tripFinances.plan.useQuery({ tripId: id }, { enabled: !!id && !!access?.canManage });
  const { data: suppliers = [], refetch: refetchSuppliers } = trpc.tripFinances.suppliers.useQuery({ tripId: id }, { enabled: !!id && !!access?.canManage });
  const { data: reminderStages = [], refetch: refetchStages } = trpc.tripFinances.reminderStages.useQuery({ tripId: id }, { enabled: !!id && !!access?.canManage });
  const { data: players = [] } = trpc.players.tripPlayers.useQuery({ tripId: id }, { enabled: !!id });
  const [dueAt, setDueAt] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [stageLabel, setStageLabel] = useState("");
  const [stageAt, setStageAt] = useState("");
  const [contingency, setContingency] = useState("0");
  const [rollover, setRollover] = useState("0");
  const [approvalThreshold, setApprovalThreshold] = useState("0");
  const [lineType, setLineType] = useState<LineType>("fixed_cost");
  const [lineLabel, setLineLabel] = useState("");
  const [lineAmount, setLineAmount] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [actualLabel, setActualLabel] = useState("");
  const [actualAmount, setActualAmount] = useState("");
  const [actualCategory, setActualCategory] = useState("Other");
  const [actualSupplierId, setActualSupplierId] = useState("");
  const [actualNote, setActualNote] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [prices, setPrices] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!trip) return;
    setDueAt((trip as any).paymentDueAt ? new Date((trip as any).paymentDueAt).toISOString().slice(0, 16) : "");
    setReminderAt((trip as any).paymentReminderAt ? new Date((trip as any).paymentReminderAt).toISOString().slice(0, 16) : "");
  }, [trip]);
  useEffect(() => {
    if (!plan) return;
    setContingency(String(plan.settings.contingencyPercent));
    setRollover((plan.settings.rolloverCents / 100).toFixed(2));
    setApprovalThreshold((plan.settings.expenseApprovalThresholdCents / 100).toFixed(2));
  }, [plan]);
  const refresh = () => { void refetchPlan(); void refetchSummary(); };
  const mutationOptions = { onError: (error: any) => { toast.error(error.message); } };
  const setFinancialManager = trpc.tripFinances.setFinancialManager.useMutation({ ...mutationOptions, onSuccess: () => { toast.success("Financial access updated"); void utils.trips.get.invalidate({ id }); } });
  const saveSchedule = trpc.tripFinances.setPaymentSchedule.useMutation({ ...mutationOptions, onSuccess: () => { toast.success("Payment dates saved"); void utils.trips.get.invalidate({ id }); } });
  const addStage = trpc.tripFinances.scheduleReminderStage.useMutation({ ...mutationOptions, onSuccess: () => { toast.success("Reminder stage scheduled"); setStageLabel(""); setStageAt(""); void refetchStages(); } });
  const saveSettings = trpc.tripFinances.savePlanSettings.useMutation({ ...mutationOptions, onSuccess: () => { toast.success("Calculator settings saved"); void refetchPlan(); } });
  const addLine = trpc.tripFinances.addPlanLine.useMutation({ ...mutationOptions, onSuccess: () => { setLineLabel(""); setLineAmount(""); void refetchPlan(); } });
  const removeLine = trpc.tripFinances.removePlanLine.useMutation({ ...mutationOptions, onSuccess: () => void refetchPlan() });
  const addSupplier = trpc.tripFinances.addSupplier.useMutation({ ...mutationOptions, onSuccess: () => { toast.success("Supplier contact added"); setSupplierName(""); setSupplierContact(""); setSupplierEmail(""); setSupplierPhone(""); void refetchSuppliers(); } });
  const removeSupplier = trpc.tripFinances.removeSupplier.useMutation({ ...mutationOptions, onSuccess: () => void refetchSuppliers() });
  const updateSupplierPayment = trpc.tripFinances.updateSupplierPayment.useMutation({ ...mutationOptions, onSuccess: () => { toast.success("Supplier payment status updated"); void refetchSuppliers(); } });
  const addActual = trpc.tripFinances.addActualExpense.useMutation({ ...mutationOptions, onSuccess: () => { toast.success("Actual expense added"); setActualLabel(""); setActualAmount(""); setActualNote(""); setReceiptFile(null); void refetchPlan(); } });
  const scanReceipt = trpc.tripFinances.scanReceipt.useMutation({ ...mutationOptions, onSuccess: (extraction) => { setActualLabel(extraction.label); setActualAmount(extraction.amountCents ? (extraction.amountCents / 100).toFixed(2) : ""); setActualCategory(extraction.category || "Other"); setActualNote([extraction.supplierName ? `Receipt supplier: ${extraction.supplierName}` : "", extraction.purchaseDate ? `Date: ${extraction.purchaseDate}` : ""].filter(Boolean).join(" · ")); toast.success(`Receipt details extracted (${Math.round(extraction.confidence * 100)}% confidence). Review before adding.`); } });
  const approveActual = trpc.tripFinances.approveActualExpense.useMutation({ ...mutationOptions, onSuccess: () => { toast.success("Expense approved"); void refetchPlan(); } });
  const removeActual = trpc.tripFinances.removeActualExpense.useMutation({ ...mutationOptions, onSuccess: () => void refetchPlan() });
  const applyPrice = trpc.tripFinances.applySuggestedPrice.useMutation({ ...mutationOptions, onSuccess: () => { toast.success("Calculated price applied to every player"); refresh(); } });
  const setPrice = trpc.tripFinances.setPrice.useMutation({ ...mutationOptions, onSuccess: refresh });
  const recordPayment = trpc.tripFinances.recordPayment.useMutation({ ...mutationOptions, onSuccess: refresh });
  const reviewPayment = trpc.tripFinances.reviewPayment.useMutation({ ...mutationOptions, onSuccess: refresh });
  const pending = summary.flatMap((entry) => entry.payments.filter((payment) => payment.status === "submitted").map((payment) => ({ entry, payment })));
  const coAdmins = players.filter((player) => player.isCoAdmin);

  const submitActual = async () => {
    if (!actualLabel.trim() || Number(actualAmount) < 0) return;
    let receiptUrl: string | undefined;
    let receiptFileName: string | undefined;
    if (receiptFile) {
      const body = new FormData(); body.append("tripId", String(id)); body.append("receipt", receiptFile);
      const response = await fetch("/api/upload/trip-expense-receipt", { method: "POST", body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return toast.error(payload.error ?? "Receipt upload failed");
      receiptUrl = payload.url; receiptFileName = payload.fileName;
    }
    addActual.mutate({ tripId: id, label: actualLabel.trim(), category: actualCategory.trim() || "Other", amountCents: Math.round(Number(actualAmount) * 100), supplierId: actualSupplierId ? Number(actualSupplierId) : undefined, notes: actualNote.trim() || undefined, receiptUrl, receiptFileName });
  };
  const scanSelectedReceipt = async () => {
    if (!receiptFile) return toast.error("Choose a receipt image first");
    if (!receiptFile.type.startsWith("image/")) return toast.error("Receipt OCR supports JPEG, PNG, or WebP images. You can still attach a PDF manually.");
    const body = new FormData(); body.append("tripId", String(id)); body.append("receipt", receiptFile);
    const response = await fetch("/api/upload/trip-expense-receipt", { method: "POST", body });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error(payload.error ?? "Receipt upload failed");
    scanReceipt.mutate({ tripId: id, imageUrl: payload.url });
  };
  const updateSupplierFromPrompt = (supplier: typeof suppliers[number]) => {
    const due = Number(window.prompt(`Amount due for ${supplier.name}`, String(supplier.paymentDueCents / 100)) ?? "");
    const paid = Number(window.prompt(`Amount paid to ${supplier.name}`, String(supplier.paidCents / 100)) ?? "");
    if (!Number.isFinite(due) || !Number.isFinite(paid) || due < 0 || paid < 0) return;
    updateSupplierPayment.mutate({ tripId: id, supplierId: supplier.id, paymentDueCents: Math.round(due * 100), paidCents: Math.round(paid * 100) });
  };

  if (access && !access.canManage) return <div className="min-h-screen bg-background p-6"><Card className="mx-auto max-w-xl"><CardContent className="py-10 text-center text-muted-foreground">The trip organiser has not granted you financial access.</CardContent></Card></div>;
  return <div className="min-h-screen bg-background"><header className="border-b border-border px-5 py-4"><div className="mx-auto flex max-w-4xl items-center gap-3"><Link href={`/admin/trips/${id}`}><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link><Banknote className="h-5 w-5 text-primary" /><div className="min-w-0 flex-1"><h1 className="font-bold">Trip finances</h1><p className="truncate text-xs text-muted-foreground">{trip?.name}</p></div><a href={`/api/export/payment-ledger/${id}`}><Button size="sm" variant="outline"><Download className="mr-1 h-4 w-4" />CSV</Button></a></div></header><main className="mx-auto max-w-4xl space-y-5 px-5 py-7">
    {access?.isOwner && <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" /> Financial manager access</CardTitle></CardHeader><CardContent><p className="mb-3 text-sm text-muted-foreground">Trip owners have financial permission by default and may delegate it to one co-admin.</p><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={(trip as any)?.financialManagerUserId ?? ""} onChange={(event) => setFinancialManager.mutate({ tripId: id, userId: event.target.value ? Number(event.target.value) : null })}><option value="">Owner only</option>{coAdmins.map((player) => <option key={player.userId} value={player.userId}>{player.nickname ?? player.user?.name ?? `Player ${player.userId}`}</option>)}</select></CardContent></Card>}
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4 text-primary" /> Payment reminders</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid gap-2 sm:grid-cols-2"><Input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /><Input type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} /></div><Button size="sm" onClick={() => saveSchedule.mutate({ tripId: id, dueAt: dueAt ? new Date(dueAt).toISOString() : undefined, reminderAt: reminderAt ? new Date(reminderAt).toISOString() : undefined })}>Save payment dates</Button><div className="grid gap-2 sm:grid-cols-[1fr_220px_auto]"><Input value={stageLabel} onChange={(event) => setStageLabel(event.target.value)} placeholder="Reminder label" /><Input type="datetime-local" value={stageAt} onChange={(event) => setStageAt(event.target.value)} /><Button disabled={!stageLabel || !stageAt} onClick={() => addStage.mutate({ tripId: id, label: stageLabel, reminderAt: new Date(stageAt).toISOString() })}><Plus className="h-4 w-4" /></Button></div>{reminderStages.map((stage) => <p key={stage.id} className="text-xs text-muted-foreground">{stage.label} · {new Date(stage.reminderAt).toLocaleString()} · {stage.status}</p>)}</CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Supplier contacts and payments</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid gap-2 sm:grid-cols-2"><Input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="Supplier name" /><Input value={supplierContact} onChange={(event) => setSupplierContact(event.target.value)} placeholder="Contact person" /><Input value={supplierEmail} onChange={(event) => setSupplierEmail(event.target.value)} placeholder="Email" /><Input value={supplierPhone} onChange={(event) => setSupplierPhone(event.target.value)} placeholder="Phone" /></div><Button disabled={!supplierName.trim()} onClick={() => addSupplier.mutate({ tripId: id, name: supplierName.trim(), contactName: supplierContact.trim() || undefined, email: supplierEmail.trim() || undefined, phone: supplierPhone.trim() || undefined })}>Add supplier</Button>{suppliers.map((supplier) => <div key={supplier.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm"><div><p className="font-semibold">{supplier.name} <span className="text-xs font-normal text-muted-foreground">{supplier.paymentStatus.replace("_", " ")}</span></p><p className="text-xs text-muted-foreground">Due {money(supplier.paymentDueCents)} · Paid {money(supplier.paidCents)}{supplier.contactName ? ` · ${supplier.contactName}` : ""}</p></div><div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => updateSupplierFromPrompt(supplier)}>Payment</Button><Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeSupplier.mutate({ tripId: id, supplierId: supplier.id })}><Trash2 className="h-4 w-4" /></Button></div></div>)}</CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Budget, actuals, and category report</CardTitle></CardHeader><CardContent className="space-y-4">{plan && <><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Budget</p><p className="font-bold">{money(plan.totalCostsCents)}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Actual approved</p><p className="font-bold">{money(plan.actualExpensesCents)}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Pending</p><p className="font-bold text-amber-600">{plan.pendingActualExpenses.length}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Variance</p><p className="font-bold">{money(plan.actualVarianceCents)}</p></div></div><div className="grid gap-2 sm:grid-cols-3"><Input type="number" value={contingency} onChange={(event) => setContingency(event.target.value)} placeholder="Contingency %" /><Input type="number" value={rollover} onChange={(event) => setRollover(event.target.value)} placeholder="Rollover funds" /><Input type="number" value={approvalThreshold} onChange={(event) => setApprovalThreshold(event.target.value)} placeholder="Approval threshold" /></div><Button variant="outline" onClick={() => saveSettings.mutate({ tripId: id, contingencyPercent: Number(contingency || 0), rolloverCents: Math.round(Number(rollover || 0) * 100), expenseApprovalThresholdCents: Math.round(Number(approvalThreshold || 0) * 100) })}>Save settings</Button><div className="rounded-lg border border-border p-3"><p className="mb-2 text-sm font-medium">Budget lines</p><div className="grid gap-2 sm:grid-cols-[150px_1fr_120px_auto]"><select value={lineType} onChange={(event) => setLineType(event.target.value as LineType)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{Object.entries(lineTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><Input value={lineLabel} onChange={(event) => setLineLabel(event.target.value)} placeholder="Bus hire, prizes, sponsor…" /><Input type="number" value={lineAmount} onChange={(event) => setLineAmount(event.target.value)} placeholder="$0.00" /><Button disabled={!lineLabel.trim()} onClick={() => addLine.mutate({ tripId: id, type: lineType, label: lineLabel.trim(), amountCents: Math.round(Number(lineAmount || 0) * 100) })}><Plus className="h-4 w-4" /></Button></div>{plan.lines.map((line) => <div key={line.id} className="mt-2 flex justify-between border-t border-border pt-2 text-sm"><span>{line.label} <span className="text-xs text-muted-foreground">{lineTypeLabels[line.type]}</span></span><span>{money(line.amountCents)} <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeLine.mutate({ tripId: id, lineId: line.id })}><Trash2 className="h-3.5 w-3.5" /></Button></span></div>)}</div><div className="rounded-lg border border-border p-3"><p className="mb-2 text-sm font-medium">Record actual expense</p><div className="grid gap-2 sm:grid-cols-2"><Input value={actualLabel} onChange={(event) => setActualLabel(event.target.value)} placeholder="Expense description" /><Input type="number" value={actualAmount} onChange={(event) => setActualAmount(event.target.value)} placeholder="$0.00" /><Input value={actualCategory} onChange={(event) => setActualCategory(event.target.value)} placeholder="Category, e.g. Transport" /><select value={actualSupplierId} onChange={(event) => setActualSupplierId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">No supplier linked</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div><Input className="mt-2" value={actualNote} onChange={(event) => setActualNote(event.target.value)} placeholder="Optional payment note" /><Input className="mt-2" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)} /><Button className="mt-2" disabled={!actualLabel.trim()} onClick={() => void submitActual()}><Plus className="mr-1 h-4 w-4" />Add expense</Button>{plan.actualExpenses.map((expense) => <div key={expense.id} className="mt-2 flex flex-wrap justify-between gap-2 border-t border-border pt-2 text-sm"><div><strong>{expense.label}</strong> <span className="text-xs text-muted-foreground">{expense.category}</span>{expense.approvalStatus === "pending" && <span className="ml-2 text-xs text-amber-600">Pending approval</span>}{expense.receiptUrl && <a className="ml-2 text-xs text-primary underline" href={expense.receiptUrl} target="_blank" rel="noreferrer">Receipt</a>}</div><div>{money(expense.amountCents)} {expense.approvalStatus === "pending" && <Button size="sm" onClick={() => approveActual.mutate({ tripId: id, expenseId: expense.id })}>Approve</Button>}<Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeActual.mutate({ tripId: id, expenseId: expense.id })}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>)}</div><div className="rounded-lg bg-primary/10 p-3"><p className="mb-2 text-sm font-medium">Approved spend by category</p>{plan.categoryTotals.length === 0 ? <p className="text-sm text-muted-foreground">No approved actual expenses yet.</p> : plan.categoryTotals.map((total) => <div key={total.category} className="flex justify-between border-b border-primary/10 py-1 text-sm"><span>{total.category}</span><strong>{money(total.amountCents)}</strong></div>)}</div><Button onClick={() => applyPrice.mutate({ tripId: id })}>Apply calculated price of {money(plan.suggestedPricePerPersonCents)} to all players</Button></>}</CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Player balances</CardTitle></CardHeader><CardContent className="space-y-3">{summary.map((entry) => { const price = prices[entry.userId] ?? (entry.priceCents / 100).toFixed(2); return <div key={entry.userId} className="rounded-lg border border-border p-3"><div className="flex flex-wrap justify-between gap-2"><div><strong>{entry.displayName}</strong><p className="text-xs text-muted-foreground">Confirmed {money(entry.confirmedCents)} · Outstanding {money(entry.outstandingCents)}</p></div><div className="flex gap-1"><Input className="h-8 w-24" value={price} onChange={(event) => setPrices((current) => ({ ...current, [entry.userId]: event.target.value }))} /><Button size="sm" variant="outline" onClick={() => setPrice.mutate({ tripId: id, userId: entry.userId, priceCents: Math.round(Number(price || 0) * 100) })}>Set</Button></div></div>{entry.outstandingCents > 0 && <div className="mt-2"><Button size="sm" onClick={() => recordPayment.mutate({ tripId: id, userId: entry.userId, amountCents: entry.outstandingCents, note: "Marked paid in full by organiser" })}>Mark paid in full</Button></div>}</div>; })}</CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Player payment submissions</CardTitle></CardHeader><CardContent className="space-y-2">{pending.length === 0 ? <p className="text-sm text-muted-foreground">No payment claims are awaiting review.</p> : pending.map(({ entry, payment }) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2"><span className="text-sm"><strong>{entry.displayName}</strong> · {money(payment.amountCents)}</span><span className="flex gap-1"><Button size="sm" onClick={() => reviewPayment.mutate({ tripId: id, paymentId: payment.id, status: "confirmed" })}><Check className="mr-1 h-4 w-4" />Confirm</Button><Button size="sm" variant="destructive" onClick={() => reviewPayment.mutate({ tripId: id, paymentId: payment.id, status: "rejected" })}><X className="mr-1 h-4 w-4" />Reject</Button></span></div>)}</CardContent></Card>
  </main></div>;
}
