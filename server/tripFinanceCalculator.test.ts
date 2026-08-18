import { describe, expect, it } from "vitest";
import { calculateTripFinancialPlan } from "../shared/tripFinanceCalculator";

describe("trip financial calculator", () => {
  it("applies per-person costs and contingency before sponsorship and rollover offsets", () => {
    expect(calculateTripFinancialPlan([
      { type: "fixed_cost", amountCents: 20_000 },
      { type: "per_person_cost", amountCents: 5_000 },
      { type: "prize", amountCents: 10_000 },
      { type: "income", amountCents: 6_000 },
    ], 4, 10, 4_000)).toMatchObject({ totalCostsCents: 55_000, totalOffsetsCents: 10_000, playerFundedCents: 45_000, suggestedPricePerPersonCents: 11_250 });
  });
});
