import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, CalendarClock, Download, FileText, ReceiptText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FinancialDashboardChart } from "@/components/FinancialDashboardChart";
import { SupplierInvoiceReviewHistory } from "@/components/SupplierInvoiceReviewHistory";
import { BudgetWarningControls } from "@/components/BudgetWarningControls";
import { SupplierPaymentCalendar } from "@/components/SupplierPaymentCalendar";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminFinancialReports() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const { data: trip, refetch: refetchTrip } = trpc.trips.get.useQuery({ id });
  const { data: access } = trpc.tripFinances.access.useQuery({ tripId: id }, { enabled: !!id });
  const { data: suppliers = [], refetch } = trpc.tripFinances.suppliers.useQuery({ tripId: id }, { enabled: !!id && !!access?.canManage });
  const [dueDates, setDueDates] = useState<Record<number, string>>({});
  const [reminderDates, setReminderDates] = useState<Record<number, string>>({});
  const [invoiceFiles, setInvoiceFiles] = useState<Record<number, File | null>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestHour, setDigestHour] = useState("8");
  useEffect(() => { if (trip) { setDigestEnabled(Boolean((trip as any).financialDigestEnabled)); setDigestHour(String((trip as any).financialDigestHourUtc ?? 8)); } }, [trip]);
  const schedule = trpc.tripFinances.scheduleSupplierInvoiceReminder.useMutation({ onSuccess: () => { toast.success("Supplier invoice reminder saved"); void refetch(); }, onError: (error) => toast.error(error.message) });
  const attachInvoice = trpc.tripFinances.attachSupplierInvoice.useMutation({ onSuccess: () => { toast.success("Supplier invoice attached"); void refetch(); }, onError: (error) => toast.error(error.message) });
  const reviewInvoice = trpc.tripFinances.reviewSupplierInvoice.useMutation({ onSuccess: () => { toast.success("Supplier invoice review saved"); void refetch(); }, onError: (error) => toast.error(error.message) });
  const setDigest = trpc.tripFinances.setDailyFinancialDigest.useMutation({ onSuccess: () => { toast.success("Daily financial digest updated"); void refetchTrip(); }, onError: (error) => toast.error(error.message) });
  const formatInputDate = (date: Date | string | null) => date ? new Date(date).toISOString().slice(0, 16) : "";
  const uploadInvoice = async (supplierId: number) => {
    const file = invoiceFiles[supplierId];
    if (!file) return;
    const body = new FormData(); body.append("tripId", String(id)); body.append("invoice", file);
    const response = await fetch("/api/upload/supplier-invoice", { method: "POST", body });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error(payload.error ?? "Invoice upload failed");
    attachInvoice.mutate({ tripId: id, supplierId, fileKey: payload.key, fileUrl: payload.url, fileName: payload.fileName });
  };
  if (access && !access.canManage) return <div className="min-h-screen bg-background p-6"><Card className="mx-auto max-w-xl"><CardContent className="py-10 text-center text-muted-foreground">Financial manager access is required.</CardContent></Card></div>;
  return <div className="min-h-screen bg-background">
    <header className="border-b border-border px-5 py-4"><div className="mx-auto flex max-w-3xl items-center gap-3"><Link href={`/admin/trips/${id}`}><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link><ReceiptText className="h-5 w-5 text-primary" /><div><h1 className="font-bold">Financial reports</h1><p className="text-xs text-muted-foreground">{trip?.name}</p></div></div></header>
    <main className="mx-auto max-w-3xl space-y-4 px-5 py-7">
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Download className="h-4 w-4 text-primary" />Downloadable finance reports</CardTitle></CardHeader><CardContent><p className="mb-3 text-sm text-muted-foreground">Download approved spending categories, the full supplier invoice audit, or an offline-ready trip finance summary.</p><div className="flex flex-wrap gap-2"><a href={`/api/export/expense-categories/${id}`}><Button variant="outline">Categories CSV</Button></a><a href={`/api/pdf/expense-categories/${id}`} target="_blank" rel="noreferrer"><Button>Categories PDF</Button></a><a href={`/api/export/supplier-invoice-audit/${id}`}><Button variant="outline">Invoice audit CSV</Button></a><a href={`/api/pdf/trip-finance-summary/${id}`} target="_blank" rel="noreferrer"><Button>Finance summary PDF</Button></a></div></CardContent></Card>
      <FinancialDashboardChart tripId={id} />
      <BudgetWarningControls tripId={id} />
      <SupplierPaymentCalendar suppliers={suppliers} />
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4 text-primary" />Daily organiser financial digest</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Send the organiser and financial manager a daily push summary. Times use UTC.</p><div className="flex items-center gap-3"><Switch checked={digestEnabled} onCheckedChange={setDigestEnabled} /><span className="text-sm">{digestEnabled ? "Enabled" : "Disabled"}</span><Input className="ml-auto w-28" type="number" min="0" max="23" value={digestHour} onChange={(event) => setDigestHour(event.target.value)} /></div><Button disabled={setDigest.isPending} onClick={() => setDigest.mutate({ tripId: id, enabled: digestEnabled, hourUtc: Math.max(0, Math.min(23, Number(digestHour || 8))) })}>Save daily digest</Button>{(trip as any)?.financialDigestLastSentAt && <p className="text-xs text-primary">Last sent {new Date((trip as any).financialDigestLastSentAt).toLocaleString()}</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4 text-primary" />Supplier invoice due-date reminders</CardTitle></CardHeader><CardContent className="space-y-3">{suppliers.length === 0 ? <p className="text-sm text-muted-foreground">Add suppliers in Trip Finances before scheduling invoice reminders.</p> : suppliers.map((supplier) => { const dueAt = dueDates[supplier.id] ?? formatInputDate(supplier.invoiceDueAt); const reminderAt = reminderDates[supplier.id] ?? formatInputDate(supplier.invoiceReminderAt); const note = reviewNotes[supplier.id] ?? ""; return <div key={supplier.id} className="rounded-lg border border-border p-3"><div className="mb-2"><p className="font-medium">{supplier.name}</p><p className="text-xs text-muted-foreground">{supplier.paymentStatus.replace("_", " ")} · Due ${(supplier.paymentDueCents / 100).toFixed(2)} · Paid ${(supplier.paidCents / 100).toFixed(2)}</p></div><div className="grid gap-2 sm:grid-cols-2"><Input type="datetime-local" value={dueAt} onChange={(event) => setDueDates((current) => ({ ...current, [supplier.id]: event.target.value }))} /><Input type="datetime-local" value={reminderAt} onChange={(event) => setReminderDates((current) => ({ ...current, [supplier.id]: event.target.value }))} /></div><div className="mt-2 flex flex-wrap gap-2"><Button size="sm" disabled={schedule.isPending} onClick={() => schedule.mutate({ tripId: id, supplierId: supplier.id, invoiceDueAt: dueAt ? new Date(dueAt).toISOString() : undefined, reminderAt: reminderAt ? new Date(reminderAt).toISOString() : undefined })}>Save reminder</Button>{supplier.invoiceAttachmentUrl && <a href={supplier.invoiceAttachmentUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">View invoice</Button></a>}<Input className="h-9 max-w-52" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setInvoiceFiles((current) => ({ ...current, [supplier.id]: event.target.files?.[0] ?? null }))} /><Button size="sm" variant="outline" disabled={!invoiceFiles[supplier.id] || attachInvoice.isPending} onClick={() => void uploadInvoice(supplier.id)}><Upload className="mr-1 h-3.5 w-3.5" />Attach invoice</Button>{supplier.invoiceAttachmentUrl && <span className={`rounded-md px-2 py-1 text-xs font-medium ${supplier.invoiceApprovalStatus === "approved" ? "bg-primary/15 text-primary" : supplier.invoiceApprovalStatus === "rejected" ? "bg-destructive/10 text-destructive" : "bg-amber-500/15 text-amber-500"}`}>Invoice {supplier.invoiceApprovalStatus}</span>}</div>{supplier.invoiceAttachmentUrl && <div className="mt-2 flex flex-wrap gap-2"><Input className="h-9 max-w-60" value={note} onChange={(event) => setReviewNotes((current) => ({ ...current, [supplier.id]: event.target.value }))} placeholder="Approval comment (optional)" />{supplier.invoiceApprovalStatus !== "approved" && <Button size="sm" onClick={() => reviewInvoice.mutate({ tripId: id, supplierId: supplier.id, status: "approved", note: note || undefined })}>Approve</Button>}{supplier.invoiceApprovalStatus !== "rejected" && <Button size="sm" variant="outline" onClick={() => reviewInvoice.mutate({ tripId: id, supplierId: supplier.id, status: "rejected", note: note || undefined })}>Reject</Button>}</div>}{supplier.invoiceApprovalNote && <p className="mt-2 text-xs text-muted-foreground">Latest review: {supplier.invoiceApprovalNote}</p>}{supplier.invoiceAttachmentUrl && <SupplierInvoiceReviewHistory tripId={id} supplierId={supplier.id} />}{supplier.invoiceReminderSentAt && <p className="mt-2 text-xs text-primary">Reminder sent {new Date(supplier.invoiceReminderSentAt).toLocaleString()}</p>}</div>; })}</CardContent></Card>
      <Link href={`/trip/${id}/documents`}><Card className="cursor-pointer transition-colors hover:border-primary/50"><CardContent className="flex items-center gap-3 py-4"><FileText className="h-5 w-5 text-primary" /><div><p className="font-medium">Trip document vault</p><p className="text-xs text-muted-foreground">Upload, tag, and organise documents shared with all players.</p></div></CardContent></Card></Link>
    </main>
  </div>;
}
