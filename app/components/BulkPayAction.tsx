import React from 'react';

interface Props {
  bulkPayDate: string;
  setBulkPayDate: (date: string) => void;
  handleBulkPay: () => void;
}

const BulkPayAction: React.FC<Props> = ({ bulkPayDate, setBulkPayDate, handleBulkPay }) => {
  return (
    <div>
      <input
        type="date"
        value={bulkPayDate}
        onChange={(e) => setBulkPayDate(e.target.value)}
        placeholder="Bulk Pay Date"
      />
      <button onClick={handleBulkPay}>Mark all musicians paid</button>
    </div>
  );
};

export default BulkPayAction;
