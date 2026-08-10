// Shared between the Edit Gig musicians checklist (confirm() on uncheck) and
// the gig detail page's per-musician Remove button (DeleteConfirmButton) so
// both surfaces warn about the same at-risk payment data in the same words.
export function musicianPaymentLossWarning(
  name: string,
  amountPaid: string | null,
  paidAt: Date | null
): string | null {
  if (!amountPaid && !paidAt) return null

  const amountLabel = amountPaid ? `$${parseFloat(amountPaid).toFixed(2)} paid` : 'Payment'
  const dateLabel = paidAt
    ? ` on ${new Date(paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : ''

  return `Remove ${name} — ${amountLabel}${dateLabel} will be lost.`
}
