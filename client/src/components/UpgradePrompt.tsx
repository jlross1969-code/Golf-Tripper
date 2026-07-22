/**
 * UpgradePrompt.tsx
 *
 * Reusable component shown when a feature requires a plan upgrade.
 * When BILLING_ENABLED = false, renders a "preview only" variant instead of
 * hiding entirely — useful for the Simulate Billing mode in AdminPlanManagement.
 *
 * Usage:
 *   <UpgradePrompt feature="longDrive" />
 *   <UpgradePrompt feature="longDrive" simulateBilling />
 */
import { useState } from "react";
import { Lock, Zap, Check, X, Star, Trophy, Users, Flag, Award, BarChart2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BILLING_ENABLED,
  UPGRADE_PROMPTS,
  FREE_PLAYER_LIMIT,
  type TripFeature,
  type UserFeature,
} from "@shared/plans";

// ─── Comparison table data ────────────────────────────────────────────────────

interface PlanRow {
  label: string;
  icon: React.ReactNode;
  free: boolean | string;
  tripPass: boolean | string;
  clubPlan: boolean | string;
}

const PLAN_ROWS: PlanRow[] = [
  {
    label: "Players per trip",
    icon: <Users className="w-4 h-4" />,
    free: `Up to ${FREE_PLAYER_LIMIT}`,
    tripPass: "Unlimited",
    clubPlan: "Unlimited",
  },
  {
    label: "Stroke Play scoring",
    icon: <Flag className="w-4 h-4" />,
    free: true,
    tripPass: true,
    clubPlan: true,
  },
  {
    label: "Skins & dynamic handicap",
    icon: <BarChart2 className="w-4 h-4" />,
    free: true,
    tripPass: true,
    clubPlan: true,
  },
  {
    label: "4BBB matchplay & side matches",
    icon: <Users className="w-4 h-4" />,
    free: false,
    tripPass: true,
    clubPlan: true,
  },
  {
    label: "Team names & emoji mascots",
    icon: <Sparkles className="w-4 h-4" />,
    free: false,
    tripPass: true,
    clubPlan: true,
  },
  {
    label: "Long Drive contest",
    icon: <Zap className="w-4 h-4" />,
    free: false,
    tripPass: true,
    clubPlan: true,
  },
  {
    label: "Custom awards (Naga, Mug…)",
    icon: <Award className="w-4 h-4" />,
    free: false,
    tripPass: true,
    clubPlan: true,
  },
  {
    label: "Nearest to Pin contest",
    icon: <Flag className="w-4 h-4" />,
    free: false,
    tripPass: true,
    clubPlan: true,
  },
  {
    label: "Unlimited trips per year",
    icon: <Trophy className="w-4 h-4" />,
    free: false,
    tripPass: false,
    clubPlan: true,
  },
  {
    label: "Custom club branding",
    icon: <Star className="w-4 h-4" />,
    free: false,
    tripPass: false,
    clubPlan: true,
  },
  {
    label: "Season leaderboard",
    icon: <BarChart2 className="w-4 h-4" />,
    free: false,
    tripPass: false,
    clubPlan: true,
  },
];

// ─── Cell renderer ────────────────────────────────────────────────────────────
function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm font-medium text-foreground">{value}</span>;
  }
  return value ? (
    <Check className="w-4 h-4 text-emerald-500 mx-auto" />
  ) : (
    <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface UpgradePromptProps {
  feature: TripFeature | UserFeature;
  /** Override the title shown on the trigger alert */
  title?: string;
  /** Override the description shown on the trigger alert */
  description?: string;
  /** Called when the user clicks the primary upgrade CTA */
  onUpgrade?: () => void;
  className?: string;
  /**
   * When true, renders even if BILLING_ENABLED = false.
   * Used by AdminPlanManagement "Simulate Billing" mode.
   */
  simulateBilling?: boolean;
}

export function UpgradePrompt({
  feature,
  title,
  description,
  onUpgrade,
  className,
  simulateBilling = false,
}: UpgradePromptProps) {
  const [open, setOpen] = useState(false);

  // When billing is disabled and not simulating, render nothing.
  if (!BILLING_ENABLED && !simulateBilling) return null;

  const prompt = UPGRADE_PROMPTS[feature as keyof typeof UPGRADE_PROMPTS];
  const displayTitle = title ?? prompt?.title ?? "Upgrade required";
  const displayDescription =
    description ?? prompt?.description ?? "This feature requires a plan upgrade.";

  return (
    <>
      {/* Trigger card */}
      <div
        className={`rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3 cursor-pointer hover:bg-amber-500/10 transition-colors ${className ?? ""}`}
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
      >
        <div className="mt-0.5 flex-shrink-0 rounded-full bg-amber-500/15 p-1.5">
          <Lock className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-500">{displayTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{displayDescription}</p>
          <p className="text-xs text-amber-500/70 mt-1.5 underline underline-offset-2">
            View plan comparison →
          </p>
        </div>
      </div>

      {/* Comparison dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Zap className="w-5 h-5 text-amber-500" />
              Upgrade your Golf Trip
            </DialogTitle>
            <DialogDescription>
              Compare plans and unlock the full competition experience.
            </DialogDescription>
          </DialogHeader>

          {/* Plan header row */}
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 pr-4 text-muted-foreground font-medium w-1/2">Feature</th>
                  <th className="text-center py-3 px-2 w-[16%]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold text-foreground">Free</span>
                      <Badge variant="secondary" className="text-xs">$0</Badge>
                    </div>
                  </th>
                  <th className="text-center py-3 px-2 w-[17%]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold text-foreground">Trip Pass</span>
                      <Badge className="text-xs bg-emerald-600 hover:bg-emerald-600">~$12/trip</Badge>
                    </div>
                  </th>
                  <th className="text-center py-3 px-2 w-[17%]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold text-foreground">Club Plan</span>
                      <Badge className="text-xs bg-amber-500 hover:bg-amber-500 text-black">~$79/yr</Badge>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {PLAN_ROWS.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`border-t border-border/50 ${i % 2 === 0 ? "bg-muted/20" : ""}`}
                  >
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2 text-foreground/80">
                        <span className="text-muted-foreground">{row.icon}</span>
                        <span className="text-sm">{row.label}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <Cell value={row.free} />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <Cell value={row.tripPass} />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <Cell value={row.clubPlan} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CTA row */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
              onClick={() => { setOpen(false); onUpgrade?.(); }}
            >
              <Zap className="w-4 h-4" />
              Get Trip Pass
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => { setOpen(false); onUpgrade?.(); }}
            >
              <Star className="w-4 h-4" />
              View Club Plan
            </Button>
            <Button variant="ghost" className="sm:w-auto" onClick={() => setOpen(false)}>
              Maybe later
            </Button>
          </div>

          {simulateBilling && (
            <p className="text-xs text-center text-amber-500/70 mt-2">
              ⚠ Simulated billing preview — no payment required
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
