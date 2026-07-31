import { describe, it, expect } from 'vitest'
import { isHtmlContent, legacyTextToHtml } from './rich-text'

describe('isHtmlContent', () => {
  it('detects genuine rich-text-editor output', () => {
    expect(isHtmlContent('<p>Hello</p>')).toBe(true)
    expect(isHtmlContent('<ul><li><p>item</p></li></ul>')).toBe(true)
    expect(isHtmlContent('<h2>Verse</h2><p>Lyrics</p>')).toBe(true)
  })

  it('treats plain text as non-HTML', () => {
    expect(isHtmlContent('Verse 1\nChorus')).toBe(false)
  })

  it('does not mistake bracketed section markers for HTML tags', () => {
    // A common lyrics-sheet convention from the old plain-textarea era —
    // must not be misdetected as editor output and left unescaped.
    expect(isHtmlContent('<Intro>\nLyrics here\n<Bridge>')).toBe(false)
  })
})

describe('legacyTextToHtml', () => {
  it('returns an empty string unchanged', () => {
    expect(legacyTextToHtml('')).toBe('')
  })

  it('passes through content that already looks like HTML', () => {
    const html = '<p><strong>Chorus</strong></p>'
    expect(legacyTextToHtml(html)).toBe(html)
  })

  it('wraps each line of plain text in its own paragraph', () => {
    expect(legacyTextToHtml('Verse 1\nChorus')).toBe('<p>Verse 1</p><p>Chorus</p>')
  })

  it('preserves blank lines as empty paragraphs with a line break', () => {
    expect(legacyTextToHtml('Verse 1\n\nChorus')).toBe('<p>Verse 1</p><p><br></p><p>Chorus</p>')
  })

  it('escapes HTML special characters so plain text cannot inject markup', () => {
    expect(legacyTextToHtml('Cue: <hit it>')).toBe('<p>Cue: &lt;hit it&gt;</p>')
  })

  it('handles Windows-style line endings', () => {
    expect(legacyTextToHtml('A\r\nB')).toBe('<p>A</p><p>B</p>')
  })

  it('escapes bracketed section markers rather than treating them as tags', () => {
    expect(legacyTextToHtml('<Intro>\nLyrics here\n<Bridge>')).toBe(
      '<p>&lt;Intro&gt;</p><p>Lyrics here</p><p>&lt;Bridge&gt;</p>'
    )
  })
})
