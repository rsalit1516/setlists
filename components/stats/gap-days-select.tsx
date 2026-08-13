'use client'

import { LabeledPreferenceSelect } from '@/components/stats/labeled-preference-select'
import { GAP_DAYS_COOKIE, GAP_DAYS_OPTIONS } from '@/lib/schedule-gaps-filter'

// "Gap" dropdown for the gap-days threshold. Persisted via the shared
// /api/preferences cookie route (#56). Full-page navigation (not
// router.push) so the resolved value keeps coming from the server-rendered
// page on every change, matching how every other persisted filter in this
// app works. `lookaheadMonths` is carried through so switching the
// threshold doesn't drop an explicit `?gapMonths=` the user arrived with.
export function GapDaysSelect({
  active,
  lookaheadMonths,
}: {
  active: number
  lookaheadMonths: number
}) {
  return (
    <LabeledPreferenceSelect
      label="Gap"
      ariaLabel="Gap-days threshold"
      value={String(active)}
      options={GAP_DAYS_OPTIONS}
      optionLabel={(days) => `${days} days`}
      onSelect={(value) => {
        window.location.href = `/api/preferences?cookie=${GAP_DAYS_COOKIE}&value=${value}&redirect=${encodeURIComponent(`/stats?gapDays=${value}&gapMonths=${lookaheadMonths}#schedule-gaps`)}`
      }}
    />
  )
}
