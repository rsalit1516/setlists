"use client";

import { useFormState } from "react-dom";
import { updateGig } from "@/app/gigs/actions";

interface EditFinancialsFormProps {
  gigId: string;
  amountPaid: number;
  paidAt?: string; // ISO string
  tips?: number;
  otherRevenue?: number;
}

export default function EditFinancialsForm({
  gigId,
  amountPaid,
  paidAt,
  tips,
  otherRevenue,
}: EditFinancialsFormProps) {
  const [formState, formAction] = useFormState(updateGig, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="gigId" value={gigId} />

      <div>
        <label className="block font-medium mb-1" htmlFor="amountPaid">
          Paid by venue
        </label>
        <input
          id="amountPaid"
          name="amountPaid"
          type="number"
          step="0.01"
          defaultValue={amountPaid}
          required
          className="w-full border rounded p-2"
        />
      </div>

      <div>
        <label className="block font-medium mb-1" htmlFor="paidAt">
          Paid at
        </label>
        <input
          id="paidAt"
          name="paidAt"
          type="date"
          defaultValue={paidAt ? paidAt.split("T")[0] : ""}
          className="w-full border rounded p-2"
        />
      </div>

      <div>
        <label className="block font-medium mb-1" htmlFor="tips">
          Tips ($)
        </label>
        <input
          id="tips"
          name="tips"
          type="number"
          step="0.01"
          defaultValue={tips ?? 0}
          className="w-full border rounded p-2"
        />
      </div>

      <div>
        <label className="block font-medium mb-1" htmlFor="otherRevenue">
          Other revenue ($)
        </label>
        <input
          id="otherRevenue"
          name="otherRevenue"
          type="number"
          step="0.01"
          defaultValue={otherRevenue ?? 0}
          className="w-full border rounded p-2"
        />
      </div>

      <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded">
        Save
      </button>

      {formState?.error && (
        <p className="text-red-600 mt-2">{formState.error}</p>
      )}
    </form>
  );
}
