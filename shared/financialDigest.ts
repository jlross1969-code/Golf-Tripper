export function buildFinancialDigestMessage(input: {
  actualExpensesCents: number;
  totalCostsCents: number;
  actualVarianceCents: number;
  outstandingPlayers: number;
  outstandingSupplierCents: number;
}) {
  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  return `Daily financial summary: approved actuals ${money(input.actualExpensesCents)} against budget ${money(input.totalCostsCents)} (${input.actualVarianceCents >= 0 ? "+" : ""}${money(input.actualVarianceCents)} variance); ${input.outstandingPlayers} player balance${input.outstandingPlayers === 1 ? "" : "s"} outstanding; supplier outstanding ${money(input.outstandingSupplierCents)}.`;
}
