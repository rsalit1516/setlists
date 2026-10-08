export const BPM_MIN = 30
export const BPM_MAX = 300

export const BPM_RANGE_ERROR = `BPM must be between ${BPM_MIN} and ${BPM_MAX}, or left blank.`

// Blank and 0 both mean "no BPM" so a user can clear a value they've decided is wrong.
export function parseBpm(value: string | null): { bpm: number | null } | { error: string } {
  const trimmed = (value ?? '').trim()
  if (trimmed === '') return { bpm: null }
  if (!/^\d+$/.test(trimmed)) return { error: BPM_RANGE_ERROR }
  const n = parseInt(trimmed, 10)
  if (n === 0) return { bpm: null }
  if (n < BPM_MIN || n > BPM_MAX) return { error: BPM_RANGE_ERROR }
  return { bpm: n }
}
