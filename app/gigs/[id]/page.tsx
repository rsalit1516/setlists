import React, { useState, useEffect } from 'react';
import { Gig, GigMusician } from '../types';
import { getGig, updateGigMusician } from '../actions';
import BulkPayAction from '../components/BulkPayAction';

const GigDetailPage = () => {
  const [gig, setGig] = useState<Gig | null>(null);
  const [musicians, setMusicians] = useState<GigMusician[]>([]);
  const [bulkPayDate, setBulkPayDate] = useState<string>('');

  useEffect(() => {
    const fetchGig = async () => {
      const gigData = await getGig();
      setGig(gigData);
      setMusicians(gigData.musicians);
    };
    fetchGig();
  }, []);

  const handleBulkPay = async () => {
    if (!gig) return;
    const evenSplitAmount = gig.net / musicians.length;
    const updatedMusicians = musicians.map((musician) => ({ ...musician, amountPaid: evenSplitAmount, paidAt: bulkPayDate }));
    await Promise.all(updatedMusicians.map((musician) => updateGigMusician(musician)));
    setMusicians(updatedMusicians);
  };

  const handleMusicianPay = async (musician: GigMusician, amountPaid: number, paidAt: string) => {
    const updatedMusician = { ...musician, amountPaid, paidAt };
    await updateGigMusician(updatedMusician);
    setMusicians(musicians.map((m) => (m.id === musician.id ? updatedMusician : m)));
  };

  const getPayoutStatus = () => {
    if (!musicians.length) return 'none';
    const paidMusicians = musicians.filter((musician) => musician.paidAt);
    if (paidMusicians.length === musicians.length) return 'all';
    return 'some';
  };

  return (
    <div>
      <h1>Gig Detail Page</h1>
      {gig && (
        <div>
          <h2>Musicians:</h2>
          <ul>
            {musicians.map((musician) => (
              <li key={musician.id}>
                <input
                  type="number"
                  value={musician.amountPaid}
                  onChange={(e) => handleMusicianPay(musician, parseFloat(e.target.value), musician.paidAt)}
                  placeholder="Amount Paid"
                />
                <input
                  type="date"
                  value={musician.paidAt}
                  onChange={(e) => handleMusicianPay(musician, musician.amountPaid, e.target.value)}
                  placeholder="Paid At"
                />
              </li>
            ))}
          </ul>
          <BulkPayAction
            bulkPayDate={bulkPayDate}
            setBulkPayDate={setBulkPayDate}
            handleBulkPay={handleBulkPay}
          />
          <p>Payout Status: {getPayoutStatus()}</p>
        </div>
      )}
    </div>
  );
};

export default GigDetailPage;
