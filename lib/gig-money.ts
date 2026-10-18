// A cancelled gig is owed its cancellation fee (nothing if none was set); otherwise the contracted amount.
export function expectedAmount(gig: {
  cancelledAt: Date | null
  cancellationFee: string | null
  amountContracted: string | null
}): string | null {
  return gig.cancelledAt ? gig.cancellationFee : gig.amountContracted
}
