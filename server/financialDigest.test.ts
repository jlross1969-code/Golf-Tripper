import { describe, expect, it } from "vitest";
import { buildFinancialDigestMessage } from "../shared/financialDigest";

describe("financial digest summary", () => {
  it("summarises budget variance and pluralised outstanding balances", () => {
    expect(buildFinancialDigestMessage({ actualExpensesCents: 12500, totalCostsCents: 10000, actualVarianceCents: 2500, outstandingPlayers: 2, outstandingSupplierCents: 8400 })).toBe("Daily financial summary: approved actuals $125.00 against budget $100.00 (+$25.00 variance); 2 player balances outstanding; supplier outstanding $84.00.");
  });
});
