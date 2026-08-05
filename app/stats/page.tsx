import { getMostPlayedSongs, getReadySongsNeverPlayed } from '@/lib/services/stats'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function StatsPage() {
  const [mostPlayed, neverPlayed] = await Promise.all([
    getMostPlayedSongs(),
    getReadySongsNeverPlayed(),
  ])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Stats</h1>

      <section className="mb-10">
        <h2 className="mb-3 text-base font-semibold uppercase tracking-wider text-muted-foreground">
          Most Played Songs
        </h2>
        {mostPlayed.length === 0 ? (
          <p className="text-sm text-muted-foreground">No songs have been played yet.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead className="text-right">Plays</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mostPlayed.map((s, i) => (
                    <TableRow key={s.songId}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell className="text-muted-foreground">{s.artist ?? '—'}</TableCell>
                      <TableCell className="text-right">{s.playCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ol className="space-y-2 md:hidden">
              {mostPlayed.map((s, i) => (
                <li
                  key={s.songId}
                  className="flex items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">{i + 1}.</span>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{s.title}</div>
                      {s.artist && (
                        <div className="truncate text-sm text-muted-foreground">{s.artist}</div>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {s.playCount} play{s.playCount !== 1 ? 's' : ''}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold uppercase tracking-wider text-muted-foreground">
          Ready Songs Never Played
        </h2>
        {neverPlayed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every Ready song has been played.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead>Key</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {neverPlayed.map((s) => (
                    <TableRow key={s.songId}>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell className="text-muted-foreground">{s.artist ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{s.key ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="space-y-2 md:hidden">
              {neverPlayed.map((s) => (
                <li
                  key={s.songId}
                  className="flex items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{s.title}</div>
                    {s.artist && (
                      <div className="truncate text-sm text-muted-foreground">{s.artist}</div>
                    )}
                  </div>
                  {s.key && (
                    <span className="shrink-0 text-sm text-muted-foreground">{s.key}</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
