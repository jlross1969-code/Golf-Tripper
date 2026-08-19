import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, ScanLine, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminReceiptOcr() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const { data: trip } = trpc.trips.get.useQuery({ id });
  const { data: access } = trpc.tripFinances.access.useQuery({ tripId: id }, { enabled: !!id });
  const { data: suppliers = [] } = trpc.tripFinances.suppliers.useQuery({ tripId: id }, { enabled: !!id && !!access?.canManage });
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<{ url: string; fileName: string } | null>(null);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [note, setNote] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const scan = trpc.tripFinances.scanReceipt.useMutation({ onSuccess: (value) => { setLabel(value.label); setAmount(value.amountCents ? (value.amountCents / 100).toFixed(2) : ""); setCategory(value.category || "Other"); setNote([value.supplierName ? `Receipt supplier: ${value.supplierName}` : "", value.purchaseDate ? `Date: ${value.purchaseDate}` : ""].filter(Boolean).join(" · ")); toast.success(`OCR extraction ready (${Math.round(value.confidence * 100)}% confidence). Review before saving.`); }, onError: (error) => toast.error(error.message) });
  const addExpense = trpc.tripFinances.addActualExpense.useMutation({ onSuccess: () => { toast.success("Expense saved"); setFile(null); setUploaded(null); setLabel(""); setAmount(""); setCategory("Other"); setNote(""); }, onError: (error) => toast.error(error.message) });
  const uploadAndScan = async () => {
    if (!file) return toast.error("Choose a receipt image");
    if (!file.type.startsWith("image/")) return toast.error("OCR supports JPEG, PNG, or WebP receipt images. PDFs can still be attached manually from Trip Finances.");
    const body = new FormData(); body.append("tripId", String(id)); body.append("receipt", file);
    const response = await fetch("/api/upload/trip-expense-receipt", { method: "POST", body });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error(payload.error ?? "Receipt upload failed");
    setUploaded({ url: payload.url, fileName: payload.fileName });
    scan.mutate({ tripId: id, imageUrl: payload.url });
  };
  if (access && !access.canManage) return <div className="min-h-screen bg-background p-6"><Card className="mx-auto max-w-xl"><CardContent className="py-10 text-center text-muted-foreground">Financial manager access is required.</CardContent></Card></div>;
  return <div className="min-h-screen bg-background"><header className="border-b border-border px-5 py-4"><div className="mx-auto flex max-w-xl items-center gap-3"><Link href={`/admin/trips/${id}/finances`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link><ScanLine className="h-5 w-5 text-primary" /><div><h1 className="font-bold">Receipt OCR</h1><p className="text-xs text-muted-foreground">{trip?.name}</p></div></div></header><main className="mx-auto max-w-xl space-y-4 px-5 py-7"><Card><CardHeader><CardTitle className="text-base">Upload and extract receipt data</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Upload an image, then review every extracted field before creating the expense.</p><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><Button disabled={!file || scan.isPending} onClick={() => void uploadAndScan()}><Upload className="mr-1 h-4 w-4" />Scan receipt</Button></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-4 w-4 text-primary" />Review expense before saving</CardTitle></CardHeader><CardContent className="space-y-3"><Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Expense description" /><div className="grid gap-2 sm:grid-cols-2"><Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="$0.00" /><Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category" /></div><select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">No supplier linked</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" /><Button disabled={!uploaded || !label.trim() || !amount || addExpense.isPending} onClick={() => addExpense.mutate({ tripId: id, label: label.trim(), category: category.trim() || "Other", amountCents: Math.round(Number(amount) * 100), supplierId: supplierId ? Number(supplierId) : undefined, notes: note.trim() || undefined, receiptUrl: uploaded?.url, receiptFileName: uploaded?.fileName })}>Save reviewed expense</Button></CardContent></Card></main></div>;
}
