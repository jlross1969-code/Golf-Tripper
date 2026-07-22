/**
 * shared/plans.ts
 *
 * Single source of truth for billing plan tiers, feature definitions, and
 * access rules. All gates currently return `true` (everything is free/open).
 *
 * When billing goes live:
 *   1. Set BILLING_ENABLED = true
 *   2. Wire Stripe webhooks to update user.planTier / trip.tripPlanTier
 *   3. The gates below will automatically enforce the correct access
 *
 * ─── Tier summary ────────────────────────────────────────────────────────────
 *
 *  free          Default for all users and trips. Core scoring, up to
 *                FREE_PLAYER_LIMIT players per trip.
 *
 *  tripPass      One-off purchase per trip. Unlocks all premium features for
 *                that trip and all its players.
 *
 *  playerPremium Monthly/annual user subscription. Unlocks personal stats
 *                history, career badges, and head-to-head records across trips.
 *
 *  clubPlan      Annual org subscription. Unlimited trips, custom branding,
 *                season leaderboard. Trips created by a clubPlan user inherit
 *                'clubPlan' tier automatically (no per-trip charge).
 */

// ─── Feature flag ─────────────────────────────────────────────────────────────
// Set to true when Stripe is live and you want gates to be enforced.
export const BILLING_ENABLED = false;

// ─── Limits ───────────────────────────────────────────────────────────────────
export const FREE_PLAYER_LIMIT = 8; // max players per trip on free tier

// ─── User plan tiers ──────────────────────────────────────────────────────────
export type UserPlanTier = "free" | "playerPremium" | "clubPlan";

// ─── Trip plan tiers ──────────────────────────────────────────────────────────
export type TripPlanTier = "free" | "tripPass" | "clubPlan";

// ─── Feature catalogue ────────────────────────────────────────────────────────
// Each feature key maps to the minimum tier required (trip-level or user-level).
// Features gated at TRIP level require the trip to have tripPass or clubPlan.
// Features gated at USER level require the user to have playerPremium or clubPlan.

export type TripFeature =
  | "unlimitedPlayers"   // > FREE_PLAYER_LIMIT players in one trip
  | "4bbbSideMatches"    // 4BBB matchplay + side match scoring
  | "longDrive"          // Long Drive contest
  | "customAwards"       // Custom named awards (Naga, Mug, etc.)
  | "teamNames"          // Team names + emoji mascots
  | "skinsScoring"       // Skins game scoring
  | "pushNotifications"  // Eagle/birdie/LD/NTP achievement alerts
  | "dynamicHandicap";   // Automatic handicap adjustment between rounds

export type UserFeature =
  | "statsHistory"       // Personal stats across all trips
  | "careerBadges"       // Career achievements & badges
  | "headToHead"         // Head-to-head record vs other players
  | "scorecardExport"    // Export personal scorecard to PDF
  | "seedingPriority";   // Priority in group seeding algorithm

// ─── Trip feature gates ───────────────────────────────────────────────────────
// Returns true if the given trip plan tier can access the feature.
// Currently all return true (BILLING_ENABLED = false).
export function canTripAccessFeature(
  tripTier: TripPlanTier,
  feature: TripFeature
): boolean {
  if (!BILLING_ENABLED) return true;

  // Features available on ALL tiers (including free)
  const alwaysFree: TripFeature[] = [
    "skinsScoring",
    "pushNotifications",
    "dynamicHandicap",
  ];
  if (alwaysFree.includes(feature)) return true;

  // Premium features require tripPass or clubPlan
  const premiumFeatures: TripFeature[] = [
    "unlimitedPlayers",
    "4bbbSideMatches",
    "longDrive",
    "customAwards",
    "teamNames",
  ];
  if (premiumFeatures.includes(feature)) {
    return tripTier === "tripPass" || tripTier === "clubPlan";
  }

  return false;
}

// ─── User feature gates ───────────────────────────────────────────────────────
// Returns true if the given user plan tier can access the feature.
// Currently all return true (BILLING_ENABLED = false).
export function canUserAccessFeature(
  userTier: UserPlanTier,
  feature: UserFeature
): boolean {
  if (!BILLING_ENABLED) return true;

  // All user features require playerPremium or clubPlan
  return userTier === "playerPremium" || userTier === "clubPlan";
}

// ─── Player limit check ───────────────────────────────────────────────────────
export function canAddMorePlayers(
  tripTier: TripPlanTier,
  currentPlayerCount: number
): boolean {
  if (!BILLING_ENABLED) return true;
  if (tripTier === "tripPass" || tripTier === "clubPlan") return true;
  return currentPlayerCount < FREE_PLAYER_LIMIT;
}

// ─── Plan display helpers ─────────────────────────────────────────────────────
export const TRIP_PLAN_LABELS: Record<TripPlanTier, string> = {
  free: "Free",
  tripPass: "Trip Pass",
  clubPlan: "Club Plan",
};

export const USER_PLAN_LABELS: Record<UserPlanTier, string> = {
  free: "Free",
  playerPremium: "Premium",
  clubPlan: "Club Plan",
};

export const TRIP_PLAN_COLORS: Record<TripPlanTier, string> = {
  free: "secondary",
  tripPass: "default",
  clubPlan: "default",
};

export const USER_PLAN_COLORS: Record<UserPlanTier, string> = {
  free: "secondary",
  playerPremium: "default",
  clubPlan: "default",
};

// ─── Upgrade prompt copy ──────────────────────────────────────────────────────
export const UPGRADE_PROMPTS: Partial<Record<TripFeature | UserFeature, { title: string; description: string }>> = {
  unlimitedPlayers: {
    title: "Upgrade to Trip Pass",
    description: `Free trips are limited to ${FREE_PLAYER_LIMIT} players. Upgrade to Trip Pass to add unlimited players.`,
  },
  "4bbbSideMatches": {
    title: "Upgrade to Trip Pass",
    description: "4BBB matchplay and side matches are a Trip Pass feature. Upgrade to unlock full group competition.",
  },
  longDrive: {
    title: "Upgrade to Trip Pass",
    description: "The Long Drive contest is a Trip Pass feature. Upgrade to add this contest to your round.",
  },
  customAwards: {
    title: "Upgrade to Trip Pass",
    description: "Custom awards (Naga, Mug, etc.) are a Trip Pass feature. Upgrade to create named prizes.",
  },
  statsHistory: {
    title: "Upgrade to Player Premium",
    description: "Personal stats history across all trips is a Premium feature. Upgrade to track your career.",
  },
};
