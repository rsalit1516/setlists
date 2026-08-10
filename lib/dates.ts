export function toDateInputValue(d: Date | null | undefined) {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}
