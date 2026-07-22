/**
 * UpgradePrompt.tsx
 *
 * Reusable component shown when a feature requires a plan upgrade.
 * Currently hidden (BILLING_ENABLED = false) — all features are open.
 *
 * Usage:
 *   <UpgradePrompt feature="4bbbSideMatches" />
 *
 * When billing goes live, wrap premium feature entry points with:
 *   {canTripAccessFeature(tripTier, "4bbbSideMatches")
 *     ? <PremiumFeature />
 *     : <UpgradePrompt feature="4bbbSideMatches" />}
 */
import { Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  BILLING_ENABLED,
  UPGRADE_PROMPTS,
  type TripFeature,
  type UserFeature,
} from "@shared/plans";

interface UpgradePromptProps {
  feature: TripFeature | UserFeature;
  /** Optional override for the title */
  title?: string;
  /** Optional override for the description */
  description?: string;
  /** Called when the user clicks the upgrade button */
  onUpgrade?: () => void;
  className?: string;
}

export function UpgradePrompt({
  feature,
  title,
  description,
  onUpgrade,
  className,
}: UpgradePromptProps) {
  // When billing is disabled, render nothing — all features are open.
  if (!BILLING_ENABLED) return null;

  const prompt = UPGRADE_PROMPTS[feature];
  const displayTitle = title ?? prompt?.title ?? "Upgrade required";
  const displayDescription =
    description ?? prompt?.description ?? "This feature requires a plan upgrade.";

  return (
    <Alert className={className}>
      <Lock className="h-4 w-4" />
      <AlertTitle>{displayTitle}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>{displayDescription}</p>
        {onUpgrade && (
          <Button size="sm" onClick={onUpgrade} className="w-fit">
            Upgrade now
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
