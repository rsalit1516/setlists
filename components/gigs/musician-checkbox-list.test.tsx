import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MusicianCheckboxList } from './musician-checkbox-list'

const musicians = [
  { id: 'm-1', name: 'Richard Salit' },
  { id: 'm-2', name: 'Jeff Zbar' },
]

describe('MusicianCheckboxList', () => {
  it('renders one checkbox per musician, checked according to defaultCheckedIds', () => {
    render(<MusicianCheckboxList musicians={musicians} defaultCheckedIds={new Set(['m-1'])} />)

    expect(screen.getByLabelText('Richard Salit')).toBeChecked()
    expect(screen.getByLabelText('Jeff Zbar')).not.toBeChecked()
  })

  it('names each checkbox "musicianIds" by default, valued by musician id', () => {
    render(<MusicianCheckboxList musicians={musicians} defaultCheckedIds={new Set()} />)

    const checkbox = screen.getByLabelText('Richard Salit') as HTMLInputElement
    expect(checkbox.name).toBe('musicianIds')
    expect(checkbox.value).toBe('m-1')
  })

  it('accepts a custom field name', () => {
    render(<MusicianCheckboxList musicians={musicians} defaultCheckedIds={new Set()} name="selectedIds" />)

    expect((screen.getByLabelText('Richard Salit') as HTMLInputElement).name).toBe('selectedIds')
  })

  it('unchecks freely with no getConfirmMessage prop', () => {
    render(<MusicianCheckboxList musicians={musicians} defaultCheckedIds={new Set(['m-1'])} />)

    fireEvent.click(screen.getByLabelText('Richard Salit'))

    expect(screen.getByLabelText('Richard Salit')).not.toBeChecked()
  })

  it('unchecks freely when getConfirmMessage returns null for that musician', () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    render(
      <MusicianCheckboxList
        musicians={musicians}
        defaultCheckedIds={new Set(['m-1'])}
        getConfirmMessage={() => null}
      />
    )

    fireEvent.click(screen.getByLabelText('Richard Salit'))

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Richard Salit')).not.toBeChecked()
    confirmSpy.mockRestore()
  })

  it('reverts the uncheck when getConfirmMessage returns a message and the user cancels', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(
      <MusicianCheckboxList
        musicians={musicians}
        defaultCheckedIds={new Set(['m-1'])}
        getConfirmMessage={(id) => `Remove ${id}?`}
      />
    )

    fireEvent.click(screen.getByLabelText('Richard Salit'))

    expect(confirmSpy).toHaveBeenCalledWith('Remove m-1?')
    expect(screen.getByLabelText('Richard Salit')).toBeChecked()
    confirmSpy.mockRestore()
  })

  it('lets the uncheck through when getConfirmMessage returns a message and the user confirms', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(
      <MusicianCheckboxList
        musicians={musicians}
        defaultCheckedIds={new Set(['m-1'])}
        getConfirmMessage={(id) => `Remove ${id}?`}
      />
    )

    fireEvent.click(screen.getByLabelText('Richard Salit'))

    expect(screen.getByLabelText('Richard Salit')).not.toBeChecked()
    confirmSpy.mockRestore()
  })

  it('does not prompt when checking a box (only unchecking is a removal)', () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    render(
      <MusicianCheckboxList
        musicians={musicians}
        defaultCheckedIds={new Set()}
        getConfirmMessage={() => 'Remove?'}
      />
    )

    fireEvent.click(screen.getByLabelText('Richard Salit'))

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Richard Salit')).toBeChecked()
    confirmSpy.mockRestore()
  })
})
