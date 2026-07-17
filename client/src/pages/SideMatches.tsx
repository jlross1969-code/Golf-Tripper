import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link, useParams } from "wouter";
import { ArrowLeft, Plus, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";

const SIDE_MATCH_TYPES = [
  { value: "match_play", label: "Match Play" },
  { value: "nassau", label: "Nassau" },
  { value: "skins", label: "Skins" },
  { value: "stableford", label: "Stableford" },
  { value: "stroke", label: "Stroke Play" },
];

export default function SideMatches() {
  const { roundId } = useParams<{ roundId: string }>();
  const id = Number(roundId);
  const { user } = useAuth();

  const { data: roundData, isLoading } = trpc.rounds.get.useQuery({ id });
  const { data: groups } = trpc.groups.list.useQuery({ roundId: id });
  const { data: sideMatches, refetch } = trpc.sideMatches.list.useQuery({ roundId: id });

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");

  const createMatch = trpc.sideMatches.create.useMutation({
    onSuccess: () => {
      toast.success("Side match created");
      setCreateOpen(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = async () => {
    if (!selectedGroupId || !selectedType) return;
    const group = groups?.find((g) => g.id === selectedGroupId);
    if (!group) return;
    await createMatch.mutateAsync({
      groupId: selectedGroupId,
      roundId: id,
      type: selectedType as any,
      players: group.players.map((p) => ({ userId: p.userId, partnerId: p.partnerId ?? undefined })),
    });
  };

  if (isLoading) return <div className="p-8"><Skeleton className="h-8 w-64" /></div>;
  if (!roundData) return <div className="p-8 text-muted-foreground">Round not found.</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/trip/${roundData.round.tripId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <Users className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">Side Matches</h1>
            <p className="text-xs text-muted-foreground">{roundData.round.name}</p>
          </div>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> New Side Match
        </Button>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {!sideMatches || sideMatches.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No side matches set up yet.</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Create Side Match
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sideMatches.map((match) => {
              const group = groups?.find((g) => g.id === match.groupId);
              const typeLabel = SIDE_MATCH_TYPES.find((t) => t.value === match.type)?.label ?? match.type;
              return (
                <div key={match.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{typeLabel}</Badge>
                      <Badge variant={match.status === "active" ? "default" : match.status === "completed" ? "secondary" : "outline"}>
                        {match.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{group?.name ?? `Group ${match.groupId}`}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {match.players.map((p) => (
                      <span key={p.id} className="text-xs bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                        Player {p.userId}
                        {p.partnerId ? ` + ${p.partnerId}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Side Match Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Side Match</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Group</label>
              <Select value={selectedGroupId?.toString() ?? ""} onValueChange={(v) => setSelectedGroupId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group..." />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((g) => (
                    <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Match Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {SIDE_MATCH_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedGroupId || !selectedType || createMatch.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
