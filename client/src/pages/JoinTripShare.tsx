import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getLoginUrl } from "@/const";
import { CheckCircle, Flag, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { toast } from "sonner";

export default function JoinTripShare() {
  const { tripId } = useParams<{ tripId: string }>();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("t") ?? "";
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [joined, setJoined] = useState(false);
  const [joinedTripId, setJoinedTripId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handicap, setHandicap] = useState("18");
  const [handicapSaved, setHandicapSaved] = useState(false);

  const tripIdNum = parseInt(tripId ?? "0", 10);

  // Fetch trip info
  const { data: trip, isLoading: tripLoading } = trpc.trips.get.useQuery(
    { id: tripIdNum },
    { enabled: !!tripIdNum && tripIdNum > 0, retry: false }
  );

  const acceptMutation = trpc.invites.acceptShareLink.useMutation({
    onSuccess: (data) => {
      setJoined(true);
      setJoinedTripId(data.tripId);
    },
    onError: (e) => {
      setError(e.message);
    },
  });

  const setMyHandicapMutation = trpc.players.setMyHandicap.useMutation({
    onSuccess: () => {
      setHandicapSaved(true);
      toast.success("Starting handicap saved!");
    },
    onError: (e) => toast.error(e.message),
  });

  // Auto-accept once authenticated
  useEffect(() => {
    if (isAuthenticated && user && token && tripIdNum && !joined && !acceptMutation.isPending) {
      acceptMutation.mutate({ tripId: tripIdNum, token });
    }
  }, [isAuthenticated, user, token, tripIdNum]);

  if (authLoading || tripLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Invalid Link</h2>
            <p className="text-muted-foreground mb-4">This invite link is missing a token. Please ask the trip admin for a new link.</p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Could Not Join</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (joined && joinedTripId) {
    const hcpNum = parseFloat(handicap);
    const hcpValid = !isNaN(hcpNum) && hcpNum >= 0 && hcpNum <= 54;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">You're In!</h2>
            <p className="text-muted-foreground mb-6">
              You've joined <strong className="text-foreground">{trip?.name ?? "the trip"}</strong>.
            </p>

            {/* Handicap input */}
            {!handicapSaved ? (
              <div className="mb-6 text-left">
                <label className="text-sm font-medium text-foreground block mb-1">
                  What's your starting handicap?
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Enter your handicap index (0–54). You can leave it as 18 if unsure — the admin can adjust it later.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={54}
                    step={0.1}
                    value={handicap}
                    onChange={(e) => setHandicap(e.target.value)}
                    className="flex-1"
                    placeholder="e.g. 18"
                  />
                  <Button
                    disabled={!hcpValid || setMyHandicapMutation.isPending}
                    onClick={() => {
                      if (!user || !hcpValid) return;
                      setMyHandicapMutation.mutate({
                        tripId: joinedTripId,
                        handicap: hcpNum,
                      });
                    }}
                  >
                    {setMyHandicapMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-emerald-400 mb-6">Handicap set to {handicap}.</p>
            )}

            <Button className="w-full" onClick={() => navigate(`/trip/${joinedTripId}`)}>
              Go to Trip Dashboard
            </Button>
            {!handicapSaved && (
              <Button variant="ghost" size="sm" className="w-full mt-2 text-muted-foreground" onClick={() => navigate(`/trip/${joinedTripId}`)}>
                Skip for now
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authenticated — show login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <Flag className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Join {trip?.name ?? "Golf Trip"}</h2>
            <p className="text-muted-foreground mb-6">
              Sign in to join this trip and start tracking your scores.
            </p>
            <Button className="w-full" onClick={() => {
              window.location.href = getLoginUrl();
            }}>
              Sign In to Join
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated, waiting for mutation
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-muted-foreground">Joining trip...</p>
      </div>
    </div>
  );
}
