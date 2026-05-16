import Link from 'next/link'
import { getSongs } from '@/lib/services/songs'
import { SongStatusBadge } from '@/components/songs/song-status-badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { deleteSong } from './actions'
import { cn } from '@/lib/utils'

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default async function SongsPage() {
  const songs = await getSongs()

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Songs</h1>
        <Link href="/songs/new" className={buttonVariants()}>
          + Add Song
        </Link>
      </div>

      {songs.length === 0 ? (
        <p className="text-muted-foreground">No songs yet. Add your first one!</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Artist</th>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Singer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Kbd</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Orientation</th>
                  <th className="px-4 py-3 sr-only">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {songs.map((song) => {
                  const deleteAction = deleteSong.bind(null, song.id)
                  return (
                    <tr key={song.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/songs/${song.id}/edit`} className="hover:underline">
                          {song.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{song.artist ?? '—'}</td>
                      <td className="px-4 py-3">{song.key ?? '—'}</td>
                      <td className="px-4 py-3">{song.singer ?? '—'}</td>
                      <td className="px-4 py-3">
                        <SongStatusBadge status={song.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {song.keyboardRequired ? '🎹' : ''}
                      </td>
                      <td className="px-4 py-3">{formatDuration(song.durationSeconds)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{song.orientation ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/songs/${song.id}/edit`}
                            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                          >
                            Edit
                          </Link>
                          <form action={deleteAction}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              Delete
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <ul className="space-y-3 md:hidden">
            {songs.map((song) => {
              const deleteAction = deleteSong.bind(null, song.id)
              return (
                <li key={song.id} className="rounded-lg border p-4">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{song.title}</p>
                      {song.artist && (
                        <p className="text-sm text-muted-foreground">{song.artist}</p>
                      )}
                    </div>
                    <SongStatusBadge status={song.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {song.key && <span>Key: {song.key}</span>}
                    {song.singer && <span>Singer: {song.singer}</span>}
                    {song.durationSeconds && <span>{formatDuration(song.durationSeconds)}</span>}
                    {song.keyboardRequired && <span>🎹 Keyboard</span>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/songs/${song.id}/edit`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                    >
                      Edit
                    </Link>
                    <form action={deleteAction}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
