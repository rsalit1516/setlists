import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Regression guard for https://github.com/rsalit1516/setlists/issues/4 —
// setlist print output must stay landscape even if globals.css is edited.
describe('print landscape orientation', () => {
  it('declares @page { size: landscape } in globals.css', () => {
    const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf-8')
    const pageRule = css.match(/@page\s*\{[^}]*\}/)?.[0]
    expect(pageRule).toBeDefined()
    expect(pageRule).toMatch(/size:\s*landscape/)
  })
})
