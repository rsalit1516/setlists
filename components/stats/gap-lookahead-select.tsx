'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GAP_LOOKAHEAD_COOKIE, GAP_LOOKAHEAD_OPTIONS } from '@/lib/schedule-gaps-filter'

// Leaf client component: the only bit of the schedule-gaps section that needs
// interactivity. Persisted via the shared /api/preferences cookie route (#56),
// same as GapDaysToggle, but as a <select> since 8 options don't fit a
// segmented control. Full-page navigation (not router.push) so the resolved
// value keeps coming from the server-rendered page on every change, matching
// how every other persisted filter in this app works. `gapDays` is carried
// through so switching the lookahead doesn't drop an explicit `?gapDays=` the
// user arrived with.
export function GapLookaheadSelect({ active, gapDays }: { active: number; gapDays: number }) {
  return (
    <Select
      value={String(active)}
      onValueChange={(value) => {
        if (!value) return
        window.location.href = `/api/preferences?cookie=${GAP_LOOKAHEAD_COOKIE}&value=${value}&redirect=${encodeURIComponent(`/stats?gapDays=${gapDays}&gapMonths=${value}#schedule-gaps`)}`
      }}
    >
      <SelectTrigger size="sm" aria-label="Lookahead window" className="h-7 min-h-7 w-auto">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {GAP_LOOKAHEAD_OPTIONS.map((months) => (
          <SelectItem key={months} value={months}>
            {months} months
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
