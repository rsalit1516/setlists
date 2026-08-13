'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Shared shell for GapDaysSelect and GapLookaheadSelect — both are a text
// label in front of a shadcn Select that navigates immediately on change.
// Kept generic on value/options/onSelect rather than each duplicating this
// JSX, since the two differ only in their option list, label text, and
// redirect URL.
export function LabeledPreferenceSelect({
  label,
  ariaLabel,
  value,
  options,
  optionLabel,
  onSelect,
}: {
  label: string
  ariaLabel: string
  value: string
  options: readonly string[]
  optionLabel: (option: string) => string
  onSelect: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next && next !== value) onSelect(next)
        }}
      >
        <SelectTrigger size="sm" aria-label={ariaLabel} className="h-7 min-h-7 w-auto">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {optionLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
