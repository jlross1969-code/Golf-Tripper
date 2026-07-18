import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { CheckCircle, Flag, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";

export default function JoinTrip() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [joined, setJoined] = useState(false);
  const [joinedTripId, setJoinedTripId] = useState<number | null>(null);

  // Look up invite details (public — no auth required)
  const { data: invite, isLoading: inviteLoading, error: inviteError } = trpc.invites.getByToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token, retry: false }
  );

  // Accept mutation — called once user is authenticated
  const acceptMutation = trpc.invites.accept.useMutation({
    onSuccess: (data) => {
      setJoined(true);
      setJoinedTripId(data.tripId);
    },
  });

  // Auto-accept once the user logs in and invite is loaded
  useEffect(() => {
    if (isAuthenticated && invite && !joined && !acceptMutation.isPending && !acceptMutation.isSuccess) {
      acceptMutation.mutate({ token: token ?? "" });
    }
  }, [isAuthenticated, invite, joined]);

  const handleLogin = () => {
    // Store token in sessionStorage so we can auto-accept after redirect
    if (token) sessionStorage.setItem("pendingInviteToken", token);
    window.location.href = getLoginUrl();
  };

  // Loading states
  if (authLoading || inviteLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  // Invite not found or revoked
  if (inviteError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="bg-card border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Invalid Invite</h1>
            <p className="text-muted-foreground text-sm">
              {inviteError.message.includes("revoked")
                ? "This invite link has been revoked by the trip admin."
                : "This invite link is invalid or has expired. Please ask your trip admin for a new link."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Successfully joined
  if (joined && joinedTripId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="bg-card border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">You're In!</h1>
            <p className="text-muted-foreground mb-1">
              Welcome to <strong className="text-foreground">{invite?.tripName}</strong>, {invite?.playerName}!
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              You've been added to the trip. Get ready to play.
            </p>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => navigate(`/trip/${joinedTripId}`)}
            >
              Go to Trip Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accepting in progress
  if (isAuthenticated && acceptMutation.isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="bg-card border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Joining Trip...</h1>
            <p className="text-muted-foreground text-sm">Adding you to {invite?.tripName}.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accept error
  if (acceptMutation.isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="bg-card border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Something Went Wrong</h1>
            <p className="text-muted-foreground text-sm mb-4">{acceptMutation.error?.message}</p>
            <Button variant="outline" onClick={() => acceptMutation.mutate({ token: token ?? "" })}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main invite landing page — not yet logged in
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Logo / branding */}
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Flag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Golf Trip App</h1>
        </div>

        {/* Invite card */}
        <Card className="bg-card border-border shadow-xl">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <p className="text-muted-foreground text-sm mb-1">You've been invited to join</p>
              <h2 className="text-xl font-bold text-foreground">{invite?.tripName}</h2>
              <p className="text-emerald-400 font-medium mt-1">
                Welcome, {invite?.playerName}!
              </p>
            </div>

            <div className="bg-background rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Name</span>
                <span className="text-foreground font-medium">{invite?.playerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground">{invite?.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Starting Handicap</span>
                <span className="text-foreground font-medium">{invite?.startingHandicap}</span>
              </div>
            </div>

            {isAuthenticated ? (
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => acceptMutation.mutate({ token: token ?? "" })}
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Joining...</>
                ) : (
                  "Join Trip"
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleLogin}
                >
                  Log In to Join Trip
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  You'll need a Manus account to join. Signing in takes under a minute.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
