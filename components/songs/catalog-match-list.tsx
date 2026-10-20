import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { addSongToCatalog } from '@/app/songs/actions'
import type { CatalogMatch } from '@/lib/services/songs'

export function CatalogMatchList({ matches }: { matches: CatalogMatch[] }) {
  return (
    <ul className="divide-y rounded-lg border">
      {matches.map((match) => (
        <li key={match.songId} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{match.title}</p>
            <p className="truncate text-sm text-muted-foreground">{match.artist ?? 'Unknown artist'}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge variant="secondary">{match.isMaster ? 'Shared catalog' : 'Your private song'}</Badge>
              {match.bandSongId && <Badge variant="outline">In your songs</Badge>}
              {match.removed && <Badge variant="outline">Removed from your songs</Badge>}
            </div>
          </div>
          {match.bandSongId ? (
            <Link href={`/songs/${match.bandSongId}/edit`} className={buttonVariants({ variant: 'outline' }) + ' min-h-[44px]'}>
              Open
            </Link>
          ) : (
            <form action={addSongToCatalog.bind(null, match.songId)}>
              <Button type="submit" className="min-h-[44px]">
                {match.removed ? 'Add back' : 'Add to my songs'}
              </Button>
            </form>
          )}
        </li>
      ))}
    </ul>
  )
}
