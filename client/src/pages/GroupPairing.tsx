import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link, useParams } from "wouter";
import { ArrowLeft, Users, Swords, CheckCircle, Lock, Pencil, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function GroupPairing() {
  const { tripId, roundId } = useParams<{ tripId: string; roundId: string }>();
  const tId = Number(tripId);
  const rId = Number(roundId);
  const { user } = useAuth();

  const { data: myGroup, isLoading, refetch } = trpc.groups.getMyGroup.useQuery(
    { roundId: rId },
    { enabled: !!user }
  );

  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [teamNameInput, setTeamNameInput] = useState<string>("");
  const [editingTeamName, setEditingTeamName] = useState(false);

  const selfPair = trpc.groups.selfPair.useMutation({
    onSuccess: () => {
      toast.success("Partner selected! You will score each other's round.");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const setTeamName = trpc.groups.setTeamName.useMutation({
    onSuccess: () => {
      toast.success("Team name saved!");
      setEditingTeamName(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  if (!myGroup) {
    return (
      <div className="min-h-screen bg-background p-8 text-center">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">You are not assigned to a group for this round.</p>
        <p className="text-xs text-muted-foreground mt-2">Ask the admin to add you to a group.</p>
        <Link href={`/trip/${tId}`}>
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Trip
          </Button>
        </Link>
      </div>
    );
  }

  const isLocked = myGroup.pairsLocked;
  const hasPartner = !!myGroup.partner;
  const myPairId = myGroup.myEntry?.pairId ?? null;

  // Current team name: from myEntry or partner's entry
  const currentTeamName = (myGroup.myEntry as any)?.teamName as string | null | undefined;

  // Default team name fallback: "Team [lowest handicap player's name]"
  function getDefaultTeamName() {
    if (!hasPartner || !myGroup) return null;
    const me = myGroup.myEntry;
    const partner = myGroup.partner;
    const myHcp = (me as any)?.currentHandicap ?? 99;
    const partnerHcp = (partner as any)?.currentHandicap ?? 99;
    const lowestMarker = myHcp <= partnerHcp ? me : partner;
    const name = (lowestMarker as any)?.nickname ?? (lowestMarker as any)?.user?.name ?? "Team";
    return `Team ${name}`;
  }

  // Other players in the group (excluding current user)
  const otherPlayers = myGroup.allMembers.filter((p: any) => p.userId !== user?.id);

  function playerDisplayName(p: any) {
    return p.nickname ?? p.user?.name ?? `Player ${p.userId}`;
  }

  const displayedTeamName = currentTeamName || getDefaultTeamName();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Link href={`/trip/${tId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <Swords className="w-5 h-5 text-primary" />
        <div>
          <h1 className="font-bold text-foreground">Group Pairing</h1>
          <p className="text-xs text-muted-foreground">{myGroup.groupName}</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-6">

        {/* Status banner */}
        {isLocked ? (
          <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl">
            <Lock className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Pairs are locked</p>
              <p className="text-xs text-muted-foreground">The admin has locked all pairs for this round.</p>
            </div>
          </div>
        ) : hasPartner ? (
          <div className="flex items-center gap-3 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                You're paired with{" "}
                <span className="text-primary">{playerDisplayName(myGroup.partner)}</span>
              </p>
              <p className="text-xs text-muted-foreground">You will score each other's round.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Users className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Choose your partner</p>
              <p className="text-xs text-muted-foreground">
                Select a partner from your group. You will score each other's round and compete as a pair in the 4BBB Matchplay.
              </p>
            </div>
          </div>
        )}

        {/* Team name section — only show when paired */}
        {hasPartner && (
          <div className="px-4 py-4 bg-card border border-border rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Team Name</p>
            </div>

            {editingTeamName ? (
              <div className="flex gap-2">
                <Input
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  placeholder={getDefaultTeamName() ?? "Enter team name…"}
                  maxLength={64}
                  className="flex-1 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setTeamName.mutate({ groupId: myGroup.groupId, teamName: teamNameInput });
                    } else if (e.key === "Escape") {
                      setEditingTeamName(false);
                    }
                  }}
                />
                <Button
                  size="sm"
                  disabled={setTeamName.isPending}
                  onClick={() => setTeamName.mutate({ groupId: myGroup.groupId, teamName: teamNameInput })}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingTeamName(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{displayedTeamName}</p>
                  {!currentTeamName && (
                    <p className="text-xs text-muted-foreground">Auto-generated from lowest handicap player</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    setTeamNameInput(currentTeamName ?? "");
                    setEditingTeamName(true);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                  {currentTeamName ? "Edit" : "Set Name"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Group members */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Your Group — {myGroup.groupName}
          </h2>
          <div className="space-y-2">
            {myGroup.allMembers.map((p: any) => {
              const isMe = p.userId === user?.id;
              const isMyPartner = myGroup.partner?.userId === p.userId;
              const pairLabel = p.pairId === 1 ? "Pair A" : p.pairId === 2 ? "Pair B" : null;
              const isSelected = selectedPartnerId === p.userId;

              return (
                <Card
                  key={p.userId}
                  className={`cursor-pointer transition-all border ${
                    isMe
                      ? "border-primary/40 bg-primary/5"
                      : isSelected
                      ? "border-primary bg-primary/10"
                      : isMyPartner
                      ? "border-green-500/40 bg-green-500/5"
                      : "border-border hover:border-primary/40"
                  } ${isMe || isLocked ? "cursor-default" : ""}`}
                  onClick={() => {
                    if (!isMe && !isLocked && !hasPartner) {
                      setSelectedPartnerId(isSelected ? null : p.userId);
                    }
                  }}
                >
                  <CardContent className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {playerDisplayName(p).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {playerDisplayName(p)}
                          {isMe && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">HCP {p.currentHandicap ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pairLabel && (
                        <Badge
                          className={`text-xs ${p.pairId === 1 ? "bg-blue-600 text-white" : "bg-orange-600 text-white"}`}
                        >
                          {pairLabel}
                        </Badge>
                      )}
                      {isMyPartner && !isLocked && (
                        <Badge className="text-xs bg-green-600 text-white">Partner</Badge>
                      )}
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Confirm partner button */}
        {!isLocked && !hasPartner && selectedPartnerId && (
          <Button
            className="w-full gap-2"
            disabled={selfPair.isPending}
            onClick={() => selfPair.mutate({
              groupId: myGroup.groupId,
              chosenPartnerId: selectedPartnerId,
            })}
          >
            <CheckCircle className="w-4 h-4" />
            Confirm Partner — {playerDisplayName(myGroup.allMembers.find((p: any) => p.userId === selectedPartnerId))}
          </Button>
        )}

        {/* Matchplay info */}
        <div className="px-4 py-3 bg-muted/50 rounded-xl text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground flex items-center gap-1">
            <Swords className="w-3.5 h-3.5 text-primary" />
            How Group Matchplay Works
          </p>
          <p>• Pair A plays a 4BBB Stableford Matchplay against Pair B within your group.</p>
          <p>• Each hole: the best Stableford score from each pair is compared. Higher score wins the hole.</p>
          <p>• The pair that wins the most holes wins the group match.</p>
          <p>• This is separate from the main round leaderboard.</p>
        </div>
      </div>
    </div>
  );
}
