export type SongStatus = 'READY' | 'IN_PROGRESS' | 'WISH'
export type SetSection = 'SOUNDCHECK' | 'MAIN' | 'ENCORE'
export type MemberRole = 'ADMIN' | 'MEMBER' | 'VIEWER'

export const SONG_STATUS_LABELS: Record<SongStatus, string> = {
  READY: 'Ready',
  IN_PROGRESS: 'In Progress',
  WISH: 'Wish',
}

export type Band = {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export type BandMember = {
  id: string
  userId: string
  bandId: string
  role: MemberRole
  createdAt: Date
  band?: Band
}

export type Venue = {
  id: string
  name: string
  address: string | null
  notes: string | null
  bandId: string | null
  createdAt: Date
  updatedAt: Date
}

export type SetlistItem = {
  id: string
  order: number
  section: SetSection
  setNumber: number
  wasPlayed: boolean | null
  isUnplanned: boolean
  songId: string
  setlistId: string
  song: Song
}

export type SetlistSummary = {
  id: string
  name: string
  bandId: string | null
  createdAt: Date
  gig: { date: Date; venue: { name: string } } | null
  _count: { items: number }
}

export type SetlistWithItems = {
  id: string
  name: string
  bandId: string | null
  createdAt: Date
  updatedAt: Date
  items: SetlistItem[]
  gig: { id: string; date: Date; venue: Venue } | null
}

export type Song = {
  id: string
  title: string
  artist: string | null
  key: string | null
  singer: string | null
  status: SongStatus
  keyboardRequired: boolean
  durationSeconds: number | null
  orientation: string | null
  bpm: number | null
  lyricsUrl: string | null
  chartsUrl: string | null
  bandId: string | null
  createdAt: Date
  updatedAt: Date
}

export type Expense = {
  id: string
  description: string
  amount: string
  gigId: string
  createdAt: Date
}

export type GigMusician = {
  id: string
  name: string
  share: string | null
  userId: string | null
  gigId: string
  createdAt: Date
}

export type GigSummary = {
  id: string
  date: Date
  notes: string | null
  amountContracted: string | null
  amountPaid: string | null
  bandId: string | null
  venue: { name: string }
  setlist: { name: string }
  _count: { musicians: number }
}

export type GigSetlistItem = {
  id: string
  order: number
  section: SetSection
  setNumber: number
  wasPlayed: boolean | null
  song: { title: string; key: string | null; singer: string | null }
}

export type GigWithDetails = {
  id: string
  date: Date
  notes: string | null
  amountContracted: string | null
  amountPaid: string | null
  bandId: string | null
  venueId: string
  setlistId: string
  venue: Venue
  setlist: { id: string; name: string; items: GigSetlistItem[] }
  expenses: Expense[]
  musicians: GigMusician[]
  createdAt: Date
  updatedAt: Date
}
