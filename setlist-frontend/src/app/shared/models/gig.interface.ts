import { Set } from './set.interface';

/**
 * Response interface for gig data
 */
export interface Gig {
  id: number;
  name: string;
  date: string;
  venue?: string;
  notes?: string;
  sets: Set[];
  createdDate: string;
  updatedDate: string;
}

/**
 * Request interface for creating gigs
 */
export interface CreateGig {
  name: string;
  date: string;
  venue?: string;
  notes?: string;
}

/**
 * Update interface for gigs
 */
export interface UpdateGig {
  name: string;
  date: string;
  venue?: string;
  notes?: string;
}
