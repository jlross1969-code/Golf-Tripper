import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">You're In!</h2>
            <p className="text-muted-foreground mb-6">
              You've joined <strong className="text-foreground">{trip?.name ?? "the trip"}</strong>. Head to the dashboard to see rounds, scores, and leaderboards.
            </p>
            <Button className="w-full" onClick={() => navigate(`/trip/${joinedTripId}`)}>
              Go to Trip Dashboard
            </Button>
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
