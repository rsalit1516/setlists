// Matches only the block tags the rich-text editor itself ever emits as the
// very first thing in its output (Tiptap's getHTML() always opens with one
// of these). Deliberately narrower than "contains something tag-shaped" —
// legacy plain text commonly uses bracketed section markers like "<Intro>"
// or "<Chorus>", which must NOT be mistaken for editor output.
const RICH_TEXT_START_PATTERN = /^\s*<(p|h2|h3|ul|ol)[\s>]/i

export function isHtmlContent(value: string): boolean {
  return RICH_TEXT_START_PATTERN.test(value)
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Lyrics/notes were a plain textarea before rich-text editing was added, so
// existing rows are raw text with literal newlines rather than HTML. Wrap
// each line in its own <p> so blank lines and line breaks still render once
// this is passed through the rich-text editor or dangerouslySetInnerHTML.
export function legacyTextToHtml(value: string): string {
  if (!value) return ''
  if (isHtmlContent(value)) return value

  return value
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('')
}
