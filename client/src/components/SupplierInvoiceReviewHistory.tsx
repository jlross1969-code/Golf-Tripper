import { History } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function SupplierInvoiceReviewHistory({ tripId, supplierId }: { tripId: number; supplierId: number }) {
  const { data: reviews = [] } = trpc.tripFinances.supplierInvoiceReviews.useQuery({ tripId, supplierId });
  if (reviews.length === 0) return <p className="mt-2 text-xs text-muted-foreground">No invoice review history yet.</p>;
  return <div className="mt-3 border-t border-border pt-2"><p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground"><History className="h-3 w-3" />Review history</p>{reviews.map((review) => <p key={review.id} className="text-xs text-muted-foreground"><span className={review.status === "approved" ? "text-primary" : "text-destructive"}>{review.status}</span> · {new Date(review.createdAt).toLocaleString()}{review.note ? ` · ${review.note}` : ""}</p>)}</div>;
}
