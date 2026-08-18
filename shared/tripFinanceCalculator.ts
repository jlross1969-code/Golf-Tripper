export type TripFinanceLineType = "fixed_cost" | "per_person_cost" | "prize" | "income";

export type TripFinanceLine = { type: TripFinanceLineType; amountCents: number };

export function calculateTripFinancialPlan(lines: TripFinanceLine[], playerCount: number, contingencyPercent: number, rolloverCents: number) {
  const participants = Math.max(0, playerCount);
  const fixedCostsCents = lines.filter((line) => line.type === "fixed_cost").reduce((sum, line) => sum + line.amountCents, 0);
  const perPersonCostsCents = lines.filter((line) => line.type === "per_person_cost").reduce((sum, line) => sum + line.amountCents * participants, 0);
  const prizesCents = lines.filter((line) => line.type === "prize").reduce((sum, line) => sum + line.amountCents, 0);
  const incomeCents = lines.filter((line) => line.type === "income").reduce((sum, line) => sum + line.amountCents, 0);
  const costBeforeContingencyCents = fixedCostsCents + perPersonCostsCents + prizesCents;
  const contingencyCents = Math.round(costBeforeContingencyCents * Math.max(0, contingencyPercent) / 100);
  const totalCostsCents = costBeforeContingencyCents + contingencyCents;
  const totalOffsetsCents = incomeCents + Math.max(0, rolloverCents);
  const playerFundedCents = Math.max(0, totalCostsCents - totalOffsetsCents);
  return { participants, fixedCostsCents, perPersonCostsCents, prizesCents, incomeCents, rolloverCents: Math.max(0, rolloverCents), costBeforeContingencyCents, contingencyCents, totalCostsCents, totalOffsetsCents, playerFundedCents, suggestedPricePerPersonCents: participants ? Math.ceil(playerFundedCents / participants) : 0 };
}
