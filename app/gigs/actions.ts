import { Gig, GigMusician } from '../types';

export const getGig = async (): Promise<Gig> => {
  // API call to fetch gig data
  // Replace with actual API call
  return {
    id: 1,
    net: 1000,
    musicians: [
      { id: 1, amountPaid: 0, paidAt: '' },
      { id: 2, amountPaid: 0, paidAt: '' },
    ],
  };
};

export const updateGigMusician = async (musician: GigMusician): Promise<void> => {
  // API call to update musician data
  // Replace with actual API call
  console.log('Updated musician:', musician);
};
