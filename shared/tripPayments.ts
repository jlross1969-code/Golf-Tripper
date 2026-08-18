export type PaymentStatus = "submitted" | "confirmed" | "rejected" | "manual_confirmed";

export function calculateTripPaymentBalance(priceCents: number, payments: { amountCents: number; status: PaymentStatus }[]) {
  const confirmedCents = payments.reduce((total, payment) => total + (payment.status === "confirmed" || payment.status === "manual_confirmed" ? payment.amountCents : 0), 0);
  return { confirmedCents, outstandingCents: Math.max(0, priceCents - confirmedCents) };
}
