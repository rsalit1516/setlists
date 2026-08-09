import type { ChangeEvent } from 'react'

// No 'use client' here on purpose: with no getConfirmMessage, this renders as
// plain server-rendered checkboxes (e.g. the detail page's "Add Selected"
// list) needing zero client JS. Per Next.js's Server/Client Components docs,
// "once a file is marked with 'use client', all its imports and child
// components are considered part of the client bundle" — so this component
// picks up interactivity for free when GigForm (which has 'use client')
// passes getConfirmMessage, with no directive needed here.
export function MusicianCheckboxList({
  musicians,
  defaultCheckedIds,
  name = 'musicianIds',
  getConfirmMessage,
}: {
  musicians: { id: string; name: string }[]
  defaultCheckedIds: Set<string>
  name?: string
  getConfirmMessage?: (musicianId: string) => string | null
}) {
  return (
    <div className="flex flex-col gap-1">
      {musicians.map((m) => (
        <label key={m.id} className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name={name}
            value={m.id}
            defaultChecked={defaultCheckedIds.has(m.id)}
            className="size-4"
            onChange={
              getConfirmMessage
                ? (e: ChangeEvent<HTMLInputElement>) => {
                    if (e.target.checked) return
                    const message = getConfirmMessage(m.id)
                    if (message && !window.confirm(message)) {
                      e.target.checked = true
                    }
                  }
                : undefined
            }
          />
          {m.name}
        </label>
      ))}
    </div>
  )
}
