/**
 * PremiumFeatureBadge.tsx
 *
 * Small inline badge/tooltip shown next to features that will be gated
 * behind a paid plan when billing goes live.
 *
 * Usage:
 *   <h2>Long Drive <PremiumFeatureBadge /></h2>
 *   <PremiumFeatureBadge tier="tripPass" label="Trip Pass feature" />
 *
 * The badge is always visible (even when BILLING_ENABLED = false) so admins
 * can see which features will become paid in the future.
 */
import { Zap, Star, Crown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

export type PremiumTier = "tripPass" | "playerPremium" | "clubPlan";

interface PremiumFeatureBadgeProps {
  /** Which plan tier unlocks this feature */
  tier?: PremiumTier;
  /** Override the tooltip text */
  tooltip?: string;
  /** Override the badge label */
  label?: string;
  className?: string;
}

const TIER_CONFIG: Record<PremiumTier, {
  icon: React.ReactNode;
  defaultLabel: string;
  defaultTooltip: string;
  badgeClass: string;
}> = {
  tripPass: {
    icon: <Zap className="w-3 h-3" />,
    defaultLabel: "Trip Pass",
    defaultTooltip: "This feature will require a Trip Pass when billing is enabled.",
    badgeClass: "bg-emerald-600/15 text-emerald-500 border-emerald-600/30 hover:bg-emerald-600/20",
  },
  playerPremium: {
    icon: <Star className="w-3 h-3" />,
    defaultLabel: "Premium",
    defaultTooltip: "This feature will require a Player Premium subscription when billing is enabled.",
    badgeClass: "bg-blue-600/15 text-blue-400 border-blue-600/30 hover:bg-blue-600/20",
  },
  clubPlan: {
    icon: <Crown className="w-3 h-3" />,
    defaultLabel: "Club Plan",
    defaultTooltip: "This feature will require a Club Plan when billing is enabled.",
    badgeClass: "bg-amber-500/15 text-amber-500 border-amber-500/30 hover:bg-amber-500/20",
  },
};

export function PremiumFeatureBadge({
  tier = "tripPass",
  tooltip,
  label,
  className,
}: PremiumFeatureBadgeProps) {
  const config = TIER_CONFIG[tier];
  const displayLabel = label ?? config.defaultLabel;
  const displayTooltip = tooltip ?? config.defaultTooltip;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 cursor-help select-none ${config.badgeClass} ${className ?? ""}`}
          >
            {config.icon}
            {displayLabel}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {displayTooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
