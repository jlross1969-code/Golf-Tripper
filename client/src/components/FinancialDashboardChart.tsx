import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export function FinancialDashboardChart({ tripId }: { tripId: number }) {
  const { data: plan } = trpc.tripFinances.plan.useQuery({ tripId }, { enabled: !!tripId });
  const [view, setView] = useState<"overview" | "categories">("overview");
  const data = useMemo(() => view === "overview"
    ? [{ name: "Planned budget", amount: ((plan?.totalCostsCents ?? 0) / 100) }, { name: "Approved actual", amount: ((plan?.actualExpensesCents ?? 0) / 100) }, { name: "Variance", amount: Math.abs((plan?.actualVarianceCents ?? 0) / 100) }]
    : (plan?.categoryTotals ?? []).map((entry) => ({ name: entry.category, amount: entry.amountCents / 100 })), [plan, view]);
  const variance = plan?.actualVarianceCents ?? 0;
  const hasChartData = data.some((entry) => entry.amount !== 0);
  return <Card><CardHeader><CardTitle className="flex flex-wrap items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-primary" /> Financial dashboard <span className="ml-auto flex gap-1"><Button size="sm" variant={view === "overview" ? "default" : "outline"} onClick={() => setView("overview")}>Overview</Button><Button size="sm" variant={view === "categories" ? "default" : "outline"} onClick={() => setView("categories")}>Categories</Button></span></CardTitle></CardHeader><CardContent><div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-md bg-muted p-2"><p className="text-muted-foreground">Budget</p><p className="font-semibold">${((plan?.totalCostsCents ?? 0) / 100).toFixed(2)}</p></div><div className="rounded-md bg-muted p-2"><p className="text-muted-foreground">Actual</p><p className="font-semibold">${((plan?.actualExpensesCents ?? 0) / 100).toFixed(2)}</p></div><div className="rounded-md bg-muted p-2"><p className="text-muted-foreground">Variance</p><p className={variance > 0 ? "font-semibold text-destructive" : "font-semibold text-primary"}>{variance > 0 ? "+" : ""}${(variance / 100).toFixed(2)}</p></div></div>{!hasChartData ? <p className="py-8 text-center text-sm text-muted-foreground">Add planned costs or approved actual expenses to populate this chart.</p> : <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={data.length > 3 ? -24 : 0} textAnchor={data.length > 3 ? "end" : "middle"} height={data.length > 3 ? 58 : 30} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `$${value}`} /><Tooltip formatter={(value: number) => [`$${Number(value).toFixed(2)}`, "Amount"]} /><Legend /><Bar dataKey="amount" name={view === "overview" ? "Amount" : "Approved spend"} fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>}</CardContent></Card>;
}
