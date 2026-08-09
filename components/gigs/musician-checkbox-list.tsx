// No 'use client' here on purpose: with no getConfirmMessage, this renders as
// plain server-rendered checkboxes (e.g. the detail page's "Add Selected"
// list) needing zero client JS. GigForm passes getConfirmMessage from within
// its own 'use client' boundary, which is what makes the onChange handler work there.
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
                ? (e: React.ChangeEvent<HTMLInputElement>) => {
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
