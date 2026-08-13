'use client'

import { LabeledPreferenceSelect } from '@/components/stats/labeled-preference-select'
import { GAP_LOOKAHEAD_COOKIE, GAP_LOOKAHEAD_OPTIONS } from '@/lib/schedule-gaps-filter'

// "Outlook" dropdown for the lookahead window. Persisted via the shared
// /api/preferences cookie route (#56), same wiring as GapDaysSelect.
// `gapDays` is carried through so switching the lookahead doesn't drop an
// explicit `?gapDays=` the user arrived with.
export function GapLookaheadSelect({ active, gapDays }: { active: number; gapDays: number }) {
  return (
    <LabeledPreferenceSelect
      label="Outlook"
      ariaLabel="Lookahead window"
      value={String(active)}
      options={GAP_LOOKAHEAD_OPTIONS}
      optionLabel={(months) => `${months} months`}
      onSelect={(value) => {
        window.location.href = `/api/preferences?cookie=${GAP_LOOKAHEAD_COOKIE}&value=${value}&redirect=${encodeURIComponent(`/stats?gapDays=${gapDays}&gapMonths=${value}#schedule-gaps`)}`
      }}
    />
  )
}
