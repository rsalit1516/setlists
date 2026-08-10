import Link from 'next/link'
import { cookies } from 'next/headers'
import { getSongs } from '@/lib/services/songs'
import { getGenres } from '@/lib/services/genres'
import { SongStatusBadge } from '@/components/songs/song-status-badge'
import { StatusFilter } from '@/components/songs/status-filter'
import { GenreFilter } from '@/components/songs/genre-filter'
import { GenreBadgeList } from '@/components/songs/genre-badge-list'
import { PrintButton } from '@/components/songs/print-button'
import { buttonVariants } from '@/components/ui/button'
import { DeleteConfirmButton } from '@/components/ui/delete-confirm-button'
import { deleteSong } from './actions'
import { cn } from '@/lib/utils'
import { SONG_STATUS_LABELS } from '@/lib/types'
import { SONGS_STATUS_COOKIE, resolveSongsStatusFilter } from '@/lib/songs-status-filter'
import { SONGS_GENRES_COOKIE, resolveSongsGenreFilter } from '@/lib/songs-genre-filter'

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default async function SongsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; genres?: string }>
}) {
  const { status: statusParam, genres: genresParam } = await searchParams
  const cookieStore = await cookies()
  const statusFilter = resolveSongsStatusFilter(statusParam, cookieStore.get(SONGS_STATUS_COOKIE)?.value)
  const status = statusFilter === 'ALL' ? undefined : statusFilter
  const genreFilter = resolveSongsGenreFilter(genresParam, cookieStore.get(SONGS_GENRES_COOKIE)?.value)
  const [songs, allGenres] = await Promise.all([getSongs(status, genreFilter, true), getGenres()])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold">Songs</h1>
        <div className="flex gap-2">
          <PrintButton />
          <Link href="/songs/new" className={buttonVariants()}>
            + Add Song
          </Link>
        </div>
      </div>

      <StatusFilter current={statusFilter} />
      <GenreFilter genres={allGenres} selected={genreFilter} />

      <div className="print:hidden">
        {songs.length === 0 ? (
          <p className="text-muted-foreground">
            {status || genreFilter.length > 0 ? 'No songs match this filter.' : 'No songs yet. Add your first one!'}
          </p>
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
                    <th className="px-4 py-3">Genres</th>
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
                        <td className="px-4 py-3">
                          <GenreBadgeList genres={song.genres} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Link
                              href={`/songs/${song.id}/edit`}
                              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                            >
                              Edit
                            </Link>
                            <DeleteConfirmButton
                              action={deleteAction}
                              description={`Remove "${song.title}" from your song catalog?`}
                            />
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
                      <DeleteConfirmButton
                        action={deleteAction}
                        description={`Remove "${song.title}" from your song catalog?`}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      {/* Print-only: always a table, Title/Artist/Key only, reflects the active filter */}
      <div className="hidden print:block">
        <h1 className="mb-4 text-xl font-bold">
          Songs{status ? ` — ${SONG_STATUS_LABELS[status]}` : ''}
        </h1>
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr>
              <th className="border-b-2 border-black px-2 py-1">Title</th>
              <th className="border-b-2 border-black px-2 py-1">Artist</th>
              <th className="border-b-2 border-black px-2 py-1">Key</th>
            </tr>
          </thead>
          <tbody>
            {songs.map((song) => (
              <tr key={song.id}>
                <td className="border-b border-gray-400 px-2 py-1">{song.title}</td>
                <td className="border-b border-gray-400 px-2 py-1">{song.artist ?? '—'}</td>
                <td className="border-b border-gray-400 px-2 py-1">{song.key ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
