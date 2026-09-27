import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteConfirmButton } from './delete-confirm-button'

function renderButton(action: () => Promise<void>) {
  render(
    <DeleteConfirmButton
      action={action}
      variant="icon"
      ariaLabel="Delete gig"
      description="Remove the gig at The Jazz Club on Fri, Aug 15, 2026?"
    />
  )
}

describe('DeleteConfirmButton', () => {
  it('asks for confirmation before running the action', async () => {
    const action = vi.fn().mockResolvedValue(undefined)
    renderButton(action)

    await userEvent.click(screen.getByRole('button', { name: 'Delete gig' }))

    expect(await screen.findByText('Remove the gig at The Jazz Club on Fri, Aug 15, 2026?')).toBeInTheDocument()
    expect(action).not.toHaveBeenCalled()
  })

  it('does nothing when cancelled', async () => {
    const action = vi.fn().mockResolvedValue(undefined)
    renderButton(action)

    await userEvent.click(screen.getByRole('button', { name: 'Delete gig' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(action).not.toHaveBeenCalled()
  })

  it('locks the dialog while the action is pending, then closes it', async () => {
    let finish!: () => void
    const action = vi.fn(() => new Promise<void>((resolve) => { finish = resolve }))
    renderButton(action)

    await userEvent.click(screen.getByRole('button', { name: 'Delete gig' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))

    const pending = await screen.findByRole('button', { name: 'Deleting…' })
    expect(pending).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(action).toHaveBeenCalledTimes(1)

    finish()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })
})
