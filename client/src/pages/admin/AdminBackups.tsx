import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Summary = { tableCount?: number; rowCount?: number; objectCount?: number; failedObjectCount?: number; failedObjects?: { source: string; recordId: number; key: string; error: string }[]; objectPartKeys?: string[] };

export default function AdminBackups() {
  const utils = trpc.useUtils();
  const { data } = trpc.backup.status.useQuery();
  const verify = trpc.backup.verify.useMutation({ onError: (e) => toast.error(e.message) });
  const runNow = trpc.backup.runNow.useMutation({
    onSuccess: () => { toast.success("Backup complete"); utils.backup.status.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const summary = (data?.summary ?? {}) as Summary;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4 flex items-center gap-3">
        <Link href="/admin/trips"><Button variant="ghost" size="icon" aria-label="Back"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h1 className="font-bold">Backups</h1>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-card border border-border rounded-xl p-4 space-y-2 text-sm">
          <p>Last backup: <b>{data?.lastBackupAt ? new Date(data.lastBackupAt).toLocaleString("en-AU") : "never"}</b> <Badge variant={data?.monthlyEnabled ? "secondary" : "outline"}>{data?.monthlyEnabled ? "monthly on" : "monthly off"}</Badge></p>
          <p>{summary.tableCount ?? 0} tables · {summary.rowCount ?? 0} rows · {summary.objectCount ?? 0} files in {summary.objectPartKeys?.length ?? 0} part(s)</p>
          {!!summary.failedObjectCount && (
            <div className="text-amber-400">
              <p>{summary.failedObjectCount} file(s) could not be included:</p>
              <ul className="list-disc ml-5 text-xs">{summary.failedObjects?.map((f, i) => <li key={i}>{f.source} #{f.recordId}: {f.error}</li>)}</ul>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => verify.mutate()} disabled={verify.isPending || !data?.lastBackupAt}>Verify latest backup</Button>
            <Button size="sm" variant="outline" onClick={() => runNow.mutate()} disabled={runNow.isPending}>{runNow.isPending ? "Backing up…" : "Back up now"}</Button>
          </div>
          {verify.data && (verify.data.ok
            ? <p className="text-emerald-400">Decrypted OK: {verify.data.tables} tables, {verify.data.rows} rows, {verify.data.objects} files.</p>
            : <p className="text-red-400">Verification failed: {verify.data.error}</p>)}
        </section>
        <p className="text-xs text-muted-foreground">Restore with <code>tsx tools/decrypt-private-backup.ts &lt;file&gt;</code>. Keep BACKUP_ENCRYPTION_KEY somewhere safe: without it backups cannot be read.</p>
      </main>
    </div>
  );
}
