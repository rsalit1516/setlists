import sanitizeHtml from 'sanitize-html'
import { legacyTextToHtml } from '@/lib/rich-text'

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'mark', 'ul', 'ol', 'li', 'h2', 'h3'],
  allowedAttributes: {},
}

// The lyrics/notes rich-text editor's HTML crosses into rendered DOM via
// dangerouslySetInnerHTML in gig performance mode, so it's sanitized here —
// once, server-side, at both the write path (app/songs/actions.ts) and the
// read path that feeds performance mode (lib/services/gigs.ts) — rather than
// trusting stored content or re-sanitizing in client components.
export function sanitizeLyricsHtml(raw: string | null | undefined): string | null {
  if (!raw) return null

  const clean = sanitizeHtml(legacyTextToHtml(raw), SANITIZE_OPTIONS).trim()
  const textOnly = sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).trim()

  return textOnly ? clean : null
}
