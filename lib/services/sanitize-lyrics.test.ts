import { describe, it, expect } from 'vitest'
import { sanitizeLyricsHtml } from './sanitize-lyrics'

describe('sanitizeLyricsHtml', () => {
  it('returns null for empty input', () => {
    expect(sanitizeLyricsHtml(null)).toBeNull()
    expect(sanitizeLyricsHtml('')).toBeNull()
  })

  it('keeps allowed formatting tags from the rich-text editor', () => {
    const html = '<p><strong>Chorus</strong> <em>softly</em></p><ul><li><p>cue</p></li></ul>'
    expect(sanitizeLyricsHtml(html)).toBe(html)
  })

  it('strips disallowed tags and event handlers', () => {
    const html = '<p onclick="alert(1)">Hi <script>alert(1)</script></p>'
    expect(sanitizeLyricsHtml(html)).toBe('<p>Hi </p>')
  })

  it('converts legacy plain text (with newlines) into paragraphs', () => {
    expect(sanitizeLyricsHtml('Verse 1\nChorus')).toBe('<p>Verse 1</p><p>Chorus</p>')
  })

  it('escapes legacy bracketed section markers instead of treating them as tags', () => {
    expect(sanitizeLyricsHtml('<Intro>\nLyrics')).toBe('<p>&lt;Intro&gt;</p><p>Lyrics</p>')
  })

  it('returns null when the sanitized result has no visible text', () => {
    expect(sanitizeLyricsHtml('<p></p>')).toBeNull()
    expect(sanitizeLyricsHtml('   ')).toBeNull()
  })
})
