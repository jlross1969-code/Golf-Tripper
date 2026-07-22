/**
 * AdminPlanManagement.tsx
 *
 * Admin page for viewing and overriding plan tiers for trips and users.
 * All overrides are currently cosmetic (BILLING_ENABLED = false) but
 * the data model is live — this page will drive real access gates when
 * billing is activated.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CreditCard, RefreshCw, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BILLING_ENABLED, FREE_PLAYER_LIMIT, TRIP_PLAN_LABELS, USER_PLAN_LABELS } from "@shared/plans";

export default function AdminPlanManagement() {
  const [, navigate] = useLocation();

  // Fetch all trips and users for the admin view
  const { data: trips, isLoading: tripsLoading, refetch: refetchTrips } = trpc.trips.list.useQuery();
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = trpc.players.allUsers.useQuery();

  const setTripPlan = trpc.plans.adminSetTripPlan.useMutation({
    onSuccess: () => {
      toast.success("Trip plan updated");
      refetchTrips();
    },
    onError: (e) => toast.error(e.message),
  });

  const setUserPlan = trpc.plans.adminSetUserPlan.useMutation({
    onSuccess: () => {
      toast.success("User plan updated");
      refetchUsers();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Plan Management
          </h1>
          <p className="text-sm text-muted-foreground">
            View and override billing plan tiers for trips and users
          </p>
        </div>
      </div>

      {/* Billing status banner */}
      {!BILLING_ENABLED ? (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <strong>Billing is currently disabled.</strong> All features are open to all users and trips.
            Plan overrides set here will take effect automatically when billing is activated in{" "}
            <code className="text-xs bg-muted px-1 rounded">shared/plans.ts</code>.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <strong>Billing is active.</strong> Plan tiers are enforced. Use this page to manually
            override tiers for testing or to gift upgrades.
          </AlertDescription>
        </Alert>
      )}

      {/* Trip Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Trip Plans
          </CardTitle>
          <CardDescription>
            Free trips are limited to {FREE_PLAYER_LIMIT} players and core features only.
            Trip Pass unlocks all premium features for a single trip.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tripsLoading ? (
            <p className="text-sm text-muted-foreground">Loading trips…</p>
          ) : !trips?.length ? (
            <p className="text-sm text-muted-foreground">No trips found.</p>
          ) : (
            <div className="space-y-3">
              {trips.map((trip) => (
                <TripPlanRow
                  key={trip.id}
                  trip={trip}
                  onSet={(tier) => setTripPlan.mutate({ tripId: trip.id, tier })}
                  isPending={setTripPlan.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* User Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Plans
          </CardTitle>
          <CardDescription>
            Player Premium unlocks personal stats history, career badges, and head-to-head records.
            Club Plan is for organisations running multiple trips per year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <p className="text-sm text-muted-foreground">Loading users…</p>
          ) : !users?.length ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <UserPlanRow
                  key={user.id}
                  user={user}
                  onSet={(tier) => setUserPlan.mutate({ userId: user.id, tier })}
                  isPending={setUserPlan.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature map reference */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Access Reference</CardTitle>
          <CardDescription>
            Which features unlock at each plan tier. Currently all are open (billing disabled).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Feature</th>
                  <th className="text-center py-2 px-2 font-medium">Free</th>
                  <th className="text-center py-2 px-2 font-medium">Trip Pass</th>
                  <th className="text-center py-2 px-2 font-medium">Club Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {FEATURE_ROWS.map((row) => (
                  <tr key={row.name}>
                    <td className="py-2 pr-4 text-muted-foreground">{row.name}</td>
                    <td className="text-center py-2 px-2">{row.free ? "✓" : "—"}</td>
                    <td className="text-center py-2 px-2">{row.tripPass ? "✓" : "—"}</td>
                    <td className="text-center py-2 px-2">{row.clubPlan ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TripPlanRow({
  trip,
  onSet,
  isPending,
}: {
  trip: { id: number; name: string; tripPlanTier?: string | null; [key: string]: unknown };
  onSet: (tier: "free" | "tripPass" | "clubPlan") => void;
  isPending: boolean;
}) {
  const currentTier = (trip.tripPlanTier as "free" | "tripPass" | "clubPlan") ?? "free";
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border">
      <div className="min-w-0">
        <p className="font-medium truncate">{trip.name}</p>
        <p className="text-xs text-muted-foreground">Trip ID {trip.id}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={currentTier === "free" ? "secondary" : "default"}>
          {TRIP_PLAN_LABELS[currentTier]}
        </Badge>
        <Select
          value={currentTier}
          onValueChange={(v) => onSet(v as "free" | "tripPass" | "clubPlan")}
          disabled={isPending}
        >
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="tripPass">Trip Pass</SelectItem>
            <SelectItem value="clubPlan">Club Plan</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function UserPlanRow({
  user,
  onSet,
  isPending,
}: {
  user: { id: number; name?: string | null; email?: string | null; planTier?: string | null; [key: string]: unknown };
  onSet: (tier: "free" | "playerPremium" | "clubPlan") => void;
  isPending: boolean;
}) {
  const currentTier = (user.planTier as "free" | "playerPremium" | "clubPlan") ?? "free";
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border">
      <div className="min-w-0">
        <p className="font-medium truncate">{user.name ?? "Unknown"}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email ?? `User ID ${user.id}`}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={currentTier === "free" ? "secondary" : "default"}>
          {USER_PLAN_LABELS[currentTier]}
        </Badge>
        <Select
          value={currentTier}
          onValueChange={(v) => onSet(v as "free" | "playerPremium" | "clubPlan")}
          disabled={isPending}
        >
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="playerPremium">Player Premium</SelectItem>
            <SelectItem value="clubPlan">Club Plan</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ─── Feature reference table data ────────────────────────────────────────────
const FEATURE_ROWS = [
  { name: "Core scoring (Stableford, stroke)", free: true, tripPass: true, clubPlan: true },
  { name: `Up to ${FREE_PLAYER_LIMIT} players per trip`, free: true, tripPass: true, clubPlan: true },
  { name: "Daily & overall leaderboards", free: true, tripPass: true, clubPlan: true },
  { name: "NTP contest", free: true, tripPass: true, clubPlan: true },
  { name: "Skins scoring", free: true, tripPass: true, clubPlan: true },
  { name: "Push notifications (eagle/birdie alerts)", free: true, tripPass: true, clubPlan: true },
  { name: "Dynamic handicap adjustment", free: true, tripPass: true, clubPlan: true },
  { name: "Unlimited players per trip", free: false, tripPass: true, clubPlan: true },
  { name: "4BBB matchplay + side matches", free: false, tripPass: true, clubPlan: true },
  { name: "Long Drive contest", free: false, tripPass: true, clubPlan: true },
  { name: "Custom awards (Naga, Mug, etc.)", free: false, tripPass: true, clubPlan: true },
  { name: "Team names + emoji mascots", free: false, tripPass: true, clubPlan: true },
  { name: "Personal stats history (across trips)", free: false, tripPass: false, clubPlan: true },
  { name: "Career badges & achievements", free: false, tripPass: false, clubPlan: true },
  { name: "Season leaderboard (all trips)", free: false, tripPass: false, clubPlan: true },
  { name: "Custom club branding", free: false, tripPass: false, clubPlan: true },
  { name: "Unlimited trips per year", free: false, tripPass: false, clubPlan: true },
];
