import { ReadinessStatus } from './readiness-status.enum';

/**
 * Response interface for song data
 */
export interface Song {
  id: number;
  name: string;
  artist: string;
  durationSeconds: number;
  readinessStatus: ReadinessStatus;
  notes?: string;
  genre?: string;
  createdDate: string;
  updatedDate: string;
}

/**
 * Request interface for creating songs
 */
export interface CreateSong {
  name: string;
  artist: string;
  durationSeconds: number;
  readinessStatus: ReadinessStatus;
  notes?: string;
  genre?: string;
}

/**
 * Update interface for songs
 */
export interface UpdateSong {
  name: string;
  artist: string;
  durationSeconds: number;
  readinessStatus: ReadinessStatus;
  notes?: string;
  genre?: string;
}
