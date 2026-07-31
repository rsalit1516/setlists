import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LyricsEditor } from './lyrics-editor'

// jsdom doesn't implement enough of Range/Selection for ProseMirror's view
// layer to compute layout during commands (focus, toggleMark, etc.).
beforeEach(() => {
  document.createRange = () => {
    const range = new Range()
    range.getBoundingClientRect = () => ({
      x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => {},
    })
    range.getClientRects = () =>
      ({
        item: () => null,
        length: 0,
        [Symbol.iterator]: function* (): ArrayIterator<DOMRect> {},
      }) as DOMRectList
    return range
  }
})

function getHiddenInput(container: HTMLElement) {
  return container.querySelector('input[type="hidden"][name="lyrics"]') as HTMLInputElement
}

describe('LyricsEditor', () => {
  it('renders a toolbar and seeds the hidden input from defaultValue', () => {
    const { container } = render(<LyricsEditor name="lyrics" defaultValue={'Verse 1\nChorus'} />)

    expect(screen.getByLabelText('Bold')).toBeInTheDocument()
    expect(screen.getByLabelText('Italic')).toBeInTheDocument()
    expect(screen.getByLabelText('Highlight')).toBeInTheDocument()
    expect(screen.getByLabelText('Bullet list')).toBeInTheDocument()
    expect(screen.getByLabelText('Numbered list')).toBeInTheDocument()
    expect(screen.getByLabelText('Indent')).toBeInTheDocument()
    expect(screen.getByLabelText('Outdent')).toBeInTheDocument()

    expect(getHiddenInput(container).value).toBe('<p>Verse 1</p><p>Chorus</p>')
  })

  it('passes already-rich-text defaultValue through unchanged', () => {
    const { container } = render(
      <LyricsEditor name="lyrics" defaultValue="<p><strong>Chorus</strong></p>" />
    )
    expect(getHiddenInput(container).value).toBe('<p><strong>Chorus</strong></p>')
  })

  it('disables Indent/Outdent until the cursor is inside a list', () => {
    render(<LyricsEditor name="lyrics" defaultValue="Verse 1" />)
    expect(screen.getByLabelText('Indent')).toBeDisabled()
    expect(screen.getByLabelText('Outdent')).toBeDisabled()
  })

  it('every toolbar button is type="button" so it cannot submit the parent form', () => {
    render(<LyricsEditor name="lyrics" defaultValue="" />)
    screen.getAllByRole('button').forEach((button) => {
      expect(button).toHaveAttribute('type', 'button')
    })
  })

  it('associates the editable region with an external label via id', () => {
    render(<LyricsEditor id="lyrics-editor" name="lyrics" defaultValue="" />)
    expect(document.getElementById('lyrics-editor')).toBeInTheDocument()
  })

  it('toggling bullet list marks the toolbar button active', () => {
    render(<LyricsEditor name="lyrics" defaultValue="Verse 1" />)
    fireEvent.click(screen.getByLabelText('Bullet list'))
    expect(screen.getByLabelText('Bullet list')).toHaveAttribute('aria-pressed', 'true')
    // A single list item has no preceding sibling to nest under, so Indent
    // correctly stays disabled — sinkListItem needs at least two items.
    expect(screen.getByLabelText('Indent')).toBeDisabled()
  })

  // Regression test: an earlier version synced the hidden input via a ref
  // mutation in onUpdate, which looked correct in isolation but got silently
  // reset by React on the next render (only caught by testing in a real
  // browser, not jsdom) — the hidden input must stay in sync with edits, not
  // just seed its initial value once at mount.
  it('keeps the hidden input in sync with edits, not just the initial value', () => {
    const { container } = render(<LyricsEditor name="lyrics" defaultValue="Verse 1" />)
    fireEvent.click(screen.getByLabelText('Bullet list'))
    expect(getHiddenInput(container).value).toContain('<ul>')
  })
})
