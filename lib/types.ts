export type SongStatus = 'READY' | 'IN_PROGRESS' | 'WISH'
export type SetSection = 'SOUNDCHECK' | 'MAIN' | 'ENCORE'

export const SONG_STATUS_LABELS: Record<SongStatus, string> = {
  READY: 'Ready',
  IN_PROGRESS: 'In Progress',
  WISH: 'Wish',
}

export type Venue = {
  id: string
  name: string
  address: string | null
  notes: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type Musician = {
  id: string
  name: string
  isActive: boolean
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
  isActive: boolean
  songId: string
  setlistId: string
  song: Song
}

export type SetlistSummary = {
  id: string
  name: string
  createdAt: Date
  gig: { date: Date; venue: { name: string } } | null
  _count: { items: number }
}

export type SetlistWithItems = {
  id: string
  name: string
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
  lyrics: string | null
  chartFileUrl: string | null
  chartFileType: string | null
  chartFileName: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type Expense = {
  id: string
  description: string
  amount: string
  gigId: string
  isActive: boolean
  createdAt: Date
}

export type GigMusician = {
  id: string
  musicianId: string
  musician: { id: string; name: string }
  amountPaid: string | null
  paidAt: Date | null
  gigId: string
  isActive: boolean
  createdAt: Date
}

export type GigSummary = {
  id: string
  date: Date
  notes: string | null
  amountContracted: string | null
  amountPaid: string | null
  paidAt: Date | null
  tips: string | null
  otherRevenue: string | null
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

export type PerformanceSong = {
  id: string
  order: number
  section: SetSection
  setNumber: number
  song: {
    title: string
    key: string | null
    lyrics: string | null
    chartFileUrl: string | null
    chartFileType: string | null
  }
}

export type GigPerformanceData = {
  id: string
  date: Date
  venue: { name: string }
  items: PerformanceSong[]
}

export type GigWithDetails = {
  id: string
  date: Date
  startTime: string | null
  endTime: string | null
  notes: string | null
  amountContracted: string | null
  amountPaid: string | null
  paidAt: Date | null
  tips: string | null
  otherRevenue: string | null
  venueId: string
  setlistId: string
  venue: Venue
  setlist: { id: string; name: string; items: GigSetlistItem[] }
  expenses: Expense[]
  musicians: GigMusician[]
  createdAt: Date
  updatedAt: Date
}

// Computed sums (totalExpenses, totalMusicianPayouts, net) are numbers, not
// Decimal strings — they're aggregates, not raw entity fields, matching the
// calculateTotalExpenses/calculateGigNet convention in lib/services/gigs.ts.
export type FinanceGigRow = {
  id: string
  date: Date
  venueName: string
  amountContracted: string | null
  amountPaid: string | null
  tips: string | null
  otherRevenue: string | null
  totalExpenses: number
  totalMusicianPayouts: number
  net: number
}

export type FinanceYearSummary = {
  year: number
  gigCount: number
  totalContracted: number
  totalPaidByVenue: number
  totalTips: number
  totalOtherRevenue: number
  totalExpenses: number
  totalMusicianPayouts: number
  net: number
}

export type FinanceReport = {
  currentYear: number
  currentYearGigs: FinanceGigRow[]
  currentYearTotals: FinanceYearSummary
  pastYears: FinanceYearSummary[]
}

export type MostPlayedSong = {
  songId: string
  title: string
  artist: string | null
  playCount: number
}

export type ReadySongNeverPlayed = {
  songId: string
  title: string
  artist: string | null
  key: string | null
}

export type StaleInProgressSong = {
  songId: string
  title: string
  artist: string | null
  daysSinceUpdate: number
}
