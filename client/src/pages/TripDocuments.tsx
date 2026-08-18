import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Download, FileText, FolderOpen, Tag, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function TripDocuments() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const { data: trip } = trpc.trips.get.useQuery({ id });
  const { data: access } = trpc.tripFinances.access.useQuery({ tripId: id }, { enabled: !!id });
  const { data: documents = [], refetch } = trpc.tripDocuments.list.useQuery({ tripId: id }, { enabled: !!id });
  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState("General");
  const [tags, setTags] = useState("");
  const [filter, setFilter] = useState("All folders");
  const [file, setFile] = useState<File | null>(null);
  const create = trpc.tripDocuments.create.useMutation({ onSuccess: () => { toast.success("Trip document uploaded"); setTitle(""); setFolder("General"); setTags(""); setFile(null); void refetch(); }, onError: (error) => toast.error(error.message) });
  const remove = trpc.tripDocuments.remove.useMutation({ onSuccess: () => { toast.success("Document removed"); void refetch(); }, onError: (error) => toast.error(error.message) });
  const folders = useMemo(() => [...new Set(documents.map((document) => document.folder || "General"))].sort(), [documents]);
  const visibleDocuments = useMemo(() => documents.filter((document) => filter === "All folders" || (document.folder || "General") === filter), [documents, filter]);
  const upload = async () => {
    if (!file) return;
    const body = new FormData(); body.append("tripId", String(id)); body.append("document", file);
    const response = await fetch("/api/upload/trip-document", { method: "POST", body });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error(payload.error ?? "Document upload failed");
    create.mutate({ tripId: id, title: title.trim() || file.name, folder: folder.trim() || "General", tags: tags.trim() || undefined, fileKey: payload.key, fileUrl: payload.url, fileName: payload.fileName, mimeType: payload.mimeType, sizeBytes: payload.sizeBytes });
  };
  const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return <div className="min-h-screen bg-background"><header className="border-b border-border px-5 py-4"><div className="mx-auto flex max-w-3xl items-center gap-3"><Link href={`/trip/${id}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link><FileText className="h-5 w-5 text-primary" /><div className="min-w-0 flex-1"><h1 className="font-bold">Trip documents</h1><p className="truncate text-xs text-muted-foreground">{trip?.name}</p></div></div></header><main className="mx-auto max-w-3xl space-y-4 px-5 py-7">{access?.canManage && <Card><CardHeader><CardTitle className="text-base">Upload a player document</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Financial managers can organise PDFs, DOCX, XLSX, JPEG, and PNG files for all trip players.</p><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Document title (optional)" /><div className="grid gap-2 sm:grid-cols-2"><Input value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="Folder, e.g. Travel" /><Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Tags, comma separated" /></div><Input type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><Button disabled={!file || create.isPending} onClick={() => void upload()}><Upload className="mr-1 h-4 w-4" />Upload document</Button></CardContent></Card>}<Card><CardHeader><CardTitle className="flex flex-wrap items-center gap-2 text-base"><FolderOpen className="h-4 w-4 text-primary" /> Shared with the trip <select value={filter} onChange={(event) => setFilter(event.target.value)} className="ml-auto h-8 rounded-md border border-input bg-background px-2 text-xs"><option>All folders</option>{folders.map((item) => <option key={item}>{item}</option>)}</select></CardTitle></CardHeader><CardContent className="space-y-2">{visibleDocuments.length === 0 ? <p className="py-5 text-center text-sm text-muted-foreground">No documents match this folder.</p> : visibleDocuments.map((document) => <div key={document.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><div className="min-w-0"><p className="truncate font-medium text-foreground">{document.title}</p><p className="truncate text-xs text-muted-foreground">{document.folder || "General"} · {document.fileName} · {formatBytes(document.sizeBytes)}</p>{document.tags && <p className="mt-1 flex items-center gap-1 truncate text-xs text-primary"><Tag className="h-3 w-3" />{document.tags}</p>}</div><div className="flex shrink-0 gap-1"><a href={document.fileUrl} target="_blank" rel="noreferrer"><Button size="icon" variant="outline"><Download className="h-4 w-4" /></Button></a>{access?.canManage && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove.mutate({ tripId: id, documentId: document.id })}><Trash2 className="h-4 w-4" /></Button>}</div></div>)}</CardContent></Card></main></div>;
}
