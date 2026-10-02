export type Debt = { fromUserId: number; toUserId: number; amountCents: number };

/** Net position per player in cents: positive means they are owed money. */
export function netBalances(debts: Debt[]) {
  const balances = new Map<number, number>();
  for (const debt of debts) {
    if (debt.amountCents <= 0 || debt.fromUserId === debt.toUserId) continue;
    balances.set(debt.fromUserId, (balances.get(debt.fromUserId) ?? 0) - debt.amountCents);
    balances.set(debt.toUserId, (balances.get(debt.toUserId) ?? 0) + debt.amountCents);
  }
  return balances;
}

/** Minimal-ish set of payments that settles everyone (greedy: largest debtor pays largest creditor). */
export function simplifyDebts(debts: Debt[]): Debt[] {
  const balances = Array.from(netBalances(debts).entries()).filter(([, cents]) => cents !== 0);
  const creditors = balances.filter(([, c]) => c > 0).map(([id, c]) => ({ id, c })).sort((a, b) => b.c - a.c || a.id - b.id);
  const debtors = balances.filter(([, c]) => c < 0).map(([id, c]) => ({ id, c: -c })).sort((a, b) => b.c - a.c || a.id - b.id);
  const payments: Debt[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].c, creditors[j].c);
    payments.push({ fromUserId: debtors[i].id, toUserId: creditors[j].id, amountCents: amount });
    debtors[i].c -= amount;
    creditors[j].c -= amount;
    if (debtors[i].c === 0) i++;
    if (creditors[j].c === 0) j++;
  }
  return payments;
}
