import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function GigPage({ params }: { params: { id: string } }) {
  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: {
      expenses: true,
      musicians: true,
    },
  });

  if (!gig) notFound();

  const totalExpenses = gig.expenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0,
  );

  const amountPaid = Number(gig.amountPaid ?? 0);
  const tips = Number(gig.tips ?? 0);
  const otherRevenue = Number(gig.otherRevenue ?? 0);

  const net = amountPaid + tips + otherRevenue - totalExpenses;

  const musicianCount = gig.musicians.length || 1;
  const suggestedPerMusician = net / musicianCount;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{gig.title}</h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Financial summary</h2>
        <p>Amount paid by venue: ${amountPaid.toFixed(2)}</p>
        <p>Tips: ${tips.toFixed(2)}</p>
        <p>Other revenue: ${otherRevenue.toFixed(2)}</p>
        <p>Total expenses: ${totalExpenses.toFixed(2)}</p>
        <p className="font-bold">
          Net (venue + tips + other – expenses): ${net.toFixed(2)}
        </p>
        <p>
          Suggested payout per musician ({musicianCount} members): ${suggestedPerMusician.toFixed(2)}
        </p>
      </section>

      {/* Additional gig details can be rendered here */}
    </div>
  );
}
