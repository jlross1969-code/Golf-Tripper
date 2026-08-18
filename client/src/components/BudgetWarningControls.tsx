import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function BudgetWarningControls({ tripId }: { tripId: number }) {
  const { data: plan, refetch } = trpc.tripFinances.plan.useQuery({ tripId }, { enabled: !!tripId });
  const [threshold, setThreshold] = useState("0");
  useEffect(() => setThreshold(String((plan?.settings as any)?.budgetWarningThresholdPercent ?? 0)), [plan]);
  const save = trpc.tripFinances.setBudgetWarningThreshold.useMutation({ onSuccess: () => { toast.success("Budget warning threshold saved"); void refetch(); }, onError: (error) => toast.error(error.message) });
  return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><BellRing className="h-4 w-4 text-primary" />Budget threshold warning</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">When approved spending reaches this percentage of planned budget, the organiser and financial manager receive one automatic alert. Use 0 to turn it off.</p><div className="flex gap-2"><Input className="max-w-36" type="number" min="0" max="500" value={threshold} onChange={(event) => setThreshold(event.target.value)} /><span className="self-center text-sm text-muted-foreground">% of budget</span></div><Button disabled={save.isPending} onClick={() => save.mutate({ tripId, thresholdPercent: Math.max(0, Math.min(500, Number(threshold || 0))) })}>Save warning threshold</Button></CardContent></Card>;
}
