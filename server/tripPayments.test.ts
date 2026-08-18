import { describe, expect, it } from "vitest";
import { calculateTripPaymentBalance } from "../shared/tripPayments";

describe("trip payment balances", () => {
  it("counts only confirmed payment claims against the player’s trip price", () => {
    expect(calculateTripPaymentBalance(50_000, [
      { amountCents: 10_000, status: "submitted" },
      { amountCents: 15_000, status: "confirmed" },
      { amountCents: 5_000, status: "manual_confirmed" },
      { amountCents: 4_000, status: "rejected" },
    ])).toEqual({ confirmedCents: 20_000, outstandingCents: 30_000 });
  });
});
