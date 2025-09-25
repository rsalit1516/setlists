/**
 * Interface for set song with song details
 */
export interface SetSong {
  songId: number;
  name: string;
  artist: string;
  durationSeconds: number;
  order: number;
}

/**
 * Interface for individual song order
 */
export interface SetSongOrder {
  songId: number;
  order: number;
}

/**
 * Response interface for set data
 */
export interface Set {
  id: number;
  name: string;
  gigId: number;
  notes?: string;
  songs: SetSong[];
  createdDate: string;
  updatedDate: string;
}

/**
 * Request interface for creating sets
 */
export interface CreateSet {
  name: string;
  gigId: number;
  notes?: string;
}

/**
 * Update interface for sets
 */
export interface UpdateSet {
  name: string;
  notes?: string;
}
