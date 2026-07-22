/**
 * PlanBadge.tsx
 *
 * Displays a small coloured badge indicating a trip or user plan tier.
 * All tiers currently show as "Free" since BILLING_ENABLED = false.
 * When billing goes live, the badge will reflect the actual tier.
 */
import { Badge } from "@/components/ui/badge";
import {
  TRIP_PLAN_LABELS,
  USER_PLAN_LABELS,
  type TripPlanTier,
  type UserPlanTier,
} from "@shared/plans";

interface TripPlanBadgeProps {
  tier: TripPlanTier;
  className?: string;
}

interface UserPlanBadgeProps {
  tier: UserPlanTier;
  className?: string;
}

export function TripPlanBadge({ tier, className }: TripPlanBadgeProps) {
  const label = TRIP_PLAN_LABELS[tier] ?? "Free";
  const variant =
    tier === "free" ? "secondary" : "default";
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

export function UserPlanBadge({ tier, className }: UserPlanBadgeProps) {
  const label = USER_PLAN_LABELS[tier] ?? "Free";
  const variant =
    tier === "free" ? "secondary" : "default";
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
