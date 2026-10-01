import { describe, expect, it } from "vitest";
import { netBalances, simplifyDebts } from "../shared/settleUp";

describe("settle up", () => {
  it("nets circular debts to nothing", () => {
    const debts = [
      { fromUserId: 1, toUserId: 2, amountCents: 1000 },
      { fromUserId: 2, toUserId: 3, amountCents: 1000 },
      { fromUserId: 3, toUserId: 1, amountCents: 1000 },
    ];
    expect(simplifyDebts(debts)).toEqual([]);
  });

  it("collapses chains and preserves totals", () => {
    const debts = [
      { fromUserId: 1, toUserId: 2, amountCents: 2000 },
      { fromUserId: 3, toUserId: 2, amountCents: 500 },
      { fromUserId: 2, toUserId: 4, amountCents: 1000 },
    ];
    const payments = simplifyDebts(debts);
    const settled = netBalances(payments);
    const original = netBalances(debts);
    original.forEach((cents, id) => expect(settled.get(id) ?? 0).toBe(cents));
    expect(payments.length).toBeLessThanOrEqual(3);
  });

  it("ignores zero, negative and self debts", () => {
    expect(simplifyDebts([{ fromUserId: 1, toUserId: 1, amountCents: 500 }, { fromUserId: 1, toUserId: 2, amountCents: 0 }])).toEqual([]);
  });
});
