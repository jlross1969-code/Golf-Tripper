import { useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function DocumentExpiryReminderControl({ tripId, documentId, expiresAt, reminderAt }: { tripId: number; documentId: number; expiresAt: Date | string | null; reminderAt: Date | string | null }) {
  const initial = reminderAt ? new Date(reminderAt).toISOString().slice(0, 16) : "";
  const [value, setValue] = useState(initial);
  const mutation = trpc.tripDocuments.setExpiryReminder.useMutation({ onSuccess: () => toast.success("Expiry reminder updated"), onError: (error) => toast.error(error.message) });
  if (!expiresAt) return <p className="mt-2 text-xs text-muted-foreground">Set an expiry before scheduling a reminder.</p>;
  return <div className="mt-2 flex flex-wrap items-center gap-2"><BellRing className="h-3.5 w-3.5 text-primary" /><Input className="h-9 max-w-60" type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} /><Button size="sm" variant="outline" onClick={() => mutation.mutate({ tripId, documentId, reminderAt: value ? new Date(value).toISOString() : null })}>Save reminder</Button></div>;
}
